import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Tool } from '../interfaces/orchestrator.interface';

@Injectable()
export class AiChatTool implements Tool {
  private readonly logger = new Logger(AiChatTool.name);
  name = 'ai_chat';
  description = '调用 Hermes Agent 进行 AI 对话';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {}

  async execute(input: any): Promise<any> {
    const hermesEndpoint = this.configService.get<string>(
      'HERMES_ENDPOINT',
      'http://hermes-agent:9119'
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${hermesEndpoint}/api/chat`,
          {
            message: input.message,
            session_id: input.sessionId,
            context: input.context,
            model: input.model,
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000, // 2分钟超时
          }
        )
      );

      return {
        success: true,
        response: response.data?.response || response.data?.message,
        model: response.data?.model,
        usage: response.data?.usage,
      };
    } catch (error: any) {
      this.logger.error(`AI Chat tool execution failed: ${error.message}`);
      
      // Fallback: 返回演示响应
      return {
        success: false,
        response: `[Demo Mode] 收到消息: "${input.message}"\n\nHermes Agent 服务当前不可用。`,
        error: error.message,
      };
    }
  }
}
