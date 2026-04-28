import { Injectable, Logger } from '@nestjs/common';
import { Tool, ToolRegistry as IToolRegistry } from '../interfaces/orchestrator.interface';

@Injectable()
export class ToolRegistryImpl implements IToolRegistry {
  private readonly logger = new Logger(ToolRegistryImpl.name);
  private tools: Map<string, Tool> = new Map();

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool ${tool.name} already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    this.logger.log(`Tool ${tool.name} registered: ${tool.description}`);
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 列出所有工具
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }
}
