import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { OrchestratorService as IOrchestratorService } from '../interfaces/orchestrator.interface';
import { ToolRegistryImpl } from '../tools/tool-registry';
import { TaskPlan, TaskStep } from '../interfaces/planner.interface';

@Injectable()
export class OrchestratorServiceImpl implements IOrchestratorService {
  private readonly logger = new Logger(OrchestratorServiceImpl.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly toolRegistry: ToolRegistryImpl,
  ) {}

  /**
   * 执行任务计划
   */
  async executePlan(plan: TaskPlan): Promise<TaskPlan> {
    this.logger.log(`Executing plan ${plan.id} with ${plan.steps.length} steps`);

    // 更新计划状态为 executing
    await this.db.updateTaskPlanStatus(plan.id, 'executing');

    // 按顺序执行每个步骤
    for (const step of plan.steps) {
      try {
        this.logger.log(`Executing step ${step.order}: ${step.description}`);
        
        // 执行步骤
        const result = await this.executeStep(step);
        
        // 更新步骤结果
        await this.db.updateTaskPlanData(plan.id, plan);
        
        // 如果步骤失败，停止执行
        if (step.status === 'failed') {
          this.logger.error(`Step ${step.order} failed: ${step.error}`);
          break;
        }
      } catch (error: any) {
        this.logger.error(`Failed to execute step ${step.order}: ${error.message}`);
        step.status = 'failed';
        step.error = error.message;
        await this.db.updateTaskPlanData(plan.id, plan);
        break;
      }
    }

    // 确定最终状态
    const allCompleted = plan.steps.every(s => s.status === 'completed');
    const anyFailed = plan.steps.some(s => s.status === 'failed');
    
    const finalStatus = allCompleted ? 'completed' : (anyFailed ? 'failed' : 'completed');
    await this.db.updateTaskPlanStatus(plan.id, finalStatus);

    this.logger.log(`Plan ${plan.id} execution completed with status: ${finalStatus}`);
    return plan;
  }

  /**
   * 执行单个步骤
   */
  async executeStep(step: TaskStep, context?: any): Promise<TaskStep> {
    step.status = 'running';

    // 获取工具
    const tool = this.toolRegistry.get(step.toolName);
    
    if (!tool) {
      step.status = 'failed';
      step.error = `Tool ${step.toolName} not found`;
      this.logger.error(step.error);
      return step;
    }

    try {
      // 执行工具
      const output = await tool.execute(step.input);
      
      step.output = output;
      step.status = 'completed';
      step.executedAt = new Date();
      
      this.logger.log(`Step ${step.order} completed successfully`);
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      this.logger.error(`Step ${step.order} failed: ${error.message}`);
    }

    return step;
  }

  /**
   * 获取工具注册表
   */
  getToolRegistry(): any {
    return this.toolRegistry;
  }

  /**
   * 注册默认工具
   */
  registerDefaultTools(tools: any[]): void {
    tools.forEach((tool) => this.toolRegistry.register(tool));
  }
}
