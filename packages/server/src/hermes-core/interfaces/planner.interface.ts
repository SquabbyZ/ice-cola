/**
 * Hermes Core - 任务规划器接口定义
 */

export interface TaskPlan {
  id: string;
  conversationId: string;
  userInput: string;
  steps: TaskStep[];
  status: TaskPlanStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TaskStep {
  id: string;
  order: number;
  description: string;
  toolName: string;
  input: Record<string, any>;
  status: TaskStepStatus;
  output?: any;
  error?: string;
  executedAt?: Date;
}

export type TaskPlanStatus = 'planning' | 'executing' | 'completed' | 'failed';
export type TaskStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PlannerService {
  /**
   * 根据用户输入生成任务计划
   */
  plan(userInput: string, conversationId: string): Promise<TaskPlan>;

  /**
   * 获取任务计划
   */
  getPlan(planId: string): Promise<TaskPlan | null>;

  /**
   * 更新任务计划状态
   */
  updatePlanStatus(planId: string, status: TaskPlanStatus): Promise<void>;

  /**
   * 更新步骤执行结果
   */
  updateStepResult(planId: string, stepId: string, output: any, error?: string): Promise<void>;
}
