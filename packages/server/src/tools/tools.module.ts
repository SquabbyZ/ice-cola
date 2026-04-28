import { Module } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { ToolsController } from './tools.controller';

@Module({
  controllers: [ToolsController],
  providers: [ToolRegistryService],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
