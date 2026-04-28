import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../../database/database.service';
import {
  PlannerService,
  TaskPlan,
  TaskStep,
  TaskPlanStatus,
} from '../interfaces/planner.interface';

@Injectable()
export class PlannerServiceImpl implements PlannerService {
  private readonly logger = new Logger(PlannerServiceImpl.name);
  private readonly hermesEndpoint: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private db: DatabaseService
  ) {
    this.hermesEndpoint = this.configService.get<string>(
      'HERMES_ENDPOINT',
      'http://hermes-agent:9119'
    );
  }

  /**
   * 根据用户输入生成任务计划
   */
  async plan(userInput: string, conversationId: string): Promise<TaskPlan> {
    try {
      // 尝试调用 hermes-agent 生成计划
      const steps = await this.callHermesAgentForPlan(userInput);

      const plan: TaskPlan = {
        id: this.generateUUID(),
        conversationId,
        userInput,
        steps: steps.map((step, index) => ({
          id: this.generateUUID(),
          order: index + 1,
          ...step,
          status: 'pending' as const,
        })),
        status: 'planning',
        createdAt: new Date(),
      };

      // 保存到数据库
      await this.savePlan(plan);

      return plan;
    } catch (error: any) {
      this.logger.warn(
        `Failed to generate plan via hermes-agent: ${error.message}. Using fallback.`
      );

      // Fallback: 创建单步计划（直接对话）
      const fallbackPlan = this.createFallbackPlan(userInput, conversationId);
      await this.savePlan(fallbackPlan);

      return fallbackPlan;
    }
  }

  /**
   * 获取任务计划
   */
  async getPlan(planId: string): Promise<TaskPlan | null> {
    const result = await this.db.queryOne<any>(
      'SELECT * FROM task_plans WHERE id = $1',
      [planId]
    );

    if (!result) {
      return null;
    }

    return this.parsePlan(result);
  }

  /**
   * 更新任务计划状态
   */
  async updatePlanStatus(planId: string, status: TaskPlanStatus): Promise<void> {
    await this.db.query(
      'UPDATE task_plans SET status = $1, "updatedAt" = NOW() WHERE id = $2',
      [status, planId]
    );
  }

  /**
   * 更新步骤执行结果
   */
  async updateStepResult(
    planId: string,
    stepId: string,
    output: any,
    error?: string
  ): Promise<void> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in plan ${planId}`);
    }

    step.output = output;
    step.error = error;
    step.status = error ? 'failed' : 'completed';
    step.executedAt = new Date();

    // 更新整个计划
    await this.savePlan(plan);
  }

  /**
   * 调用 hermes-agent 生成任务计划
   */
  private async callHermesAgentForPlan(userInput: string): Promise<Array<{
    description: string;
    toolName: string;
    input: Record<string, any>;
  }>> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.hermesEndpoint}/api/plan`,
          {
            message: userInput,
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        )
      );

      const data = response.data;

      // 解析返回的计划
      if (data.steps && Array.isArray(data.steps)) {
        return data.steps;
      }

      // 如果返回格式不对，尝试从文本中提取 JSON
      if (typeof data.response === 'string') {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.steps) {
            return parsed.steps;
          }
        }
      }

      throw new Error('Invalid plan format from hermes-agent');
    } catch (error: any) {
      this.logger.error(`Hermes agent plan generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建降级计划（单步直接对话）
   */
  private createFallbackPlan(userInput: string, conversationId: string): TaskPlan {
    return {
      id: this.generateUUID(),
      conversationId,
      userInput,
      steps: [
        {
          id: this.generateUUID(),
          order: 1,
          description: '直接响应用户',
          toolName: 'ai_chat',
          input: { message: userInput },
          status: 'pending',
        },
      ],
      status: 'planning',
      createdAt: new Date(),
    };
  }

  /**
   * 保存计划到数据库
   */
  private async savePlan(plan: TaskPlan): Promise<void> {
    const existing = await this.db.queryOne(
      'SELECT id FROM task_plans WHERE id = $1',
      [plan.id]
    );

    if (existing) {
      // 更新
      await this.db.query(
        'UPDATE task_plans SET plan_data = $1, status = $2, "updatedAt" = NOW() WHERE id = $3',
        [JSON.stringify(plan), plan.status, plan.id]
      );
    } else {
      // 插入
      await this.db.query(
        `INSERT INTO task_plans (id, conversation_id, user_input, plan_data, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [plan.id, plan.conversationId, plan.userInput, JSON.stringify(plan), plan.status]
      );
    }
  }

  /**
   * 从数据库记录解析计划
   */
  private parsePlan(record: any): TaskPlan {
    const planData = typeof record.plan_data === 'string' 
      ? JSON.parse(record.plan_data) 
      : record.plan_data;

    return {
      ...planData,
      createdAt: new Date(record.created_at || record.createdAt),
      updatedAt: record.updated_at || record.updatedAt 
        ? new Date(record.updated_at || record.updatedAt) 
        : undefined,
    };
  }

  /**
   * 生成 UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
