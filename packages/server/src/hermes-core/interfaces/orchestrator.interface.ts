/**
 * Hermes Core - 工具编排接口定义
 */

export interface Tool {
  name: string;
  description: string;
  execute: (input: any) => Promise<any>;
}

export interface ToolRegistry {
  /**
   * 注册工具
   */
  register(tool: Tool): void;

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined;

  /**
   * 列出所有工具
   */
  list(): Tool[];
}

export interface OrchestratorService {
  /**
   * 执行任务计划
   */
  executePlan(plan: any, context?: any): Promise<any>;

  /**
   * 执行单个步骤
   */
  executeStep(step: any, context?: any): Promise<any>;

  /**
   * 获取工具注册表
   */
  getToolRegistry(): ToolRegistry;

  /**
   * 注册默认工具
   */
  registerDefaultTools(tools: Tool[]): void;
}
