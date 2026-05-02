import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}