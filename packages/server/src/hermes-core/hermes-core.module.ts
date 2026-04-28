import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MemoryServiceImpl } from './services/memory.service';
import { PlannerServiceImpl } from './services/planner.service';
import { OrchestratorServiceImpl } from './services/orchestrator.service';
import { AiChatTool } from './tools/ai-chat.tool';
import { FileReadTool, FileWriteTool } from './tools/file-ops.tool';
import { ToolRegistryImpl } from './tools/tool-registry';

@Global()
@Module({
  imports: [HttpModule],
  providers: [
    // Services
    MemoryServiceImpl,
    PlannerServiceImpl,
    OrchestratorServiceImpl,
    
    // Tool Registry
    ToolRegistryImpl,
    
    // Tools
    AiChatTool,
    FileReadTool,
    FileWriteTool,
  ],
  exports: [
    MemoryServiceImpl,
    PlannerServiceImpl,
    OrchestratorServiceImpl,
  ],
})
export class HermesCoreModule {
  constructor(
    private readonly orchestrator: OrchestratorServiceImpl,
    private readonly aiChatTool: AiChatTool,
    private readonly fileReadTool: FileReadTool,
    private readonly fileWriteTool: FileWriteTool
  ) {
    // 注册默认工具
    this.orchestrator.registerDefaultTools([
      aiChatTool,
      fileReadTool,
      fileWriteTool,
    ]);
  }
}
