import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ChatRequestDto, ChatResponseDto, HermesStatusDto } from './dto/hermes.dto';
import { QuotaService } from '../quota/quota.service';
import { ConversationService } from '../conversation/conversation.service';

@Injectable()
export class HermesService {
  private readonly logger = new Logger(HermesService.name);
  private readonly hermesEndpoint: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly quotaService: QuotaService,
    private readonly conversationService: ConversationService,
  ) {
    this.hermesEndpoint = this.configService.get<string>('HERMES_ENDPOINT', 'http://hermes-agent:9119');
  }

  async chat(userId: string, teamId: string, dto: ChatRequestDto): Promise<ChatResponseDto> {
    // 1. Check quota
    const quotaCheck = await this.quotaService.checkQuota(teamId);
    if (!quotaCheck.hasQuota) {
      throw new HttpException(
        {
          success: false,
          error: quotaCheck.unlimited ? '配额无限制' : `配额不足，还剩 ${quotaCheck.remaining} 次`,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // 2. Consume quota
    await this.quotaService.consumeQuota(teamId, 1, `hermes:chat:${dto.sessionId || 'new'}`);

    // 3. Create conversation
    const conversation = await this.conversationService.create(
      teamId,
      'New conversation',
      userId,
    );

    // 4. Add user message
    await this.conversationService.addMessage(teamId, conversation.id, {
      role: 'user',
      content: dto.message,
    });

    try {
      // 5. Call hermes-agent
      const response = await this.callHermesAgent({
        message: dto.message,
        sessionId: dto.sessionId || conversation.id,
        context: dto.context,
        model: dto.model,
      });

      // 6. Add assistant response
      await this.conversationService.addMessage(teamId, conversation.id, {
        role: 'assistant',
        content: response.response,
        model: response.model,
        usage: response.usage,
      });

      return response;
    } catch (error) {
      this.logger.error(`Hermes agent call failed: ${error.message}`);

      // If hermes-agent is not available, return a demo response
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const demoResponse = this.getDemoResponse(dto.message);
        await this.conversationService.addMessage(teamId, conversation.id, {
          role: 'assistant',
          content: demoResponse,
        });
        return {
          success: true,
          response: demoResponse,
          sessionId: conversation.id,
          model: 'demo',
        };
      }

      throw new HttpException(
        {
          success: false,
          error: `Hermes 服务调用失败: ${error.message}`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getStatus(): Promise<HermesStatusDto> {
    try {
      const response = await this.httpService
        .get(`${this.hermesEndpoint}/health`, { timeout: 5000 })
        .toPromise();
      return {
        status: 'online',
        version: response.data?.version || 'unknown',
        activeSessions: response.data?.active_sessions || 0,
        model: response.data?.model || 'unknown',
        provider: response.data?.provider || 'unknown',
      };
    } catch (error) {
      this.logger.warn(`Hermes status check failed: ${error.message}`);
      return {
        status: 'offline',
        version: 'unknown',
        activeSessions: 0,
        model: 'unknown',
        provider: 'unknown',
      };
    }
  }

  async getSession(teamId: string, sessionId: string) {
    const conversations = await this.conversationService.getList(teamId);
    const conversation = conversations.conversations.find((c) => c.sessionId === sessionId);
    if (!conversation) {
      throw new HttpException({ error: 'Session not found' }, HttpStatus.NOT_FOUND);
    }
    return this.conversationService.getById(teamId, conversation.id);
  }

  private async callHermesAgent(params: {
    message: string;
    sessionId: string;
    context?: Record<string, any>;
    model?: string;
  }): Promise<ChatResponseDto> {
    // Try to call hermes-agent via HTTP
    // Note: hermes-agent's web API is primarily for the management dashboard
    // For programmatic chat, you would typically use MCP or the messaging platform integrations
    const response = await this.httpService
      .post(
        `${this.hermesEndpoint}/api/chat`,
        {
          message: params.message,
          session_id: params.sessionId,
          context: params.context,
          model: params.model,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        },
      )
      .toPromise();

    return {
      success: true,
      response: response.data?.response || response.data?.message || JSON.stringify(response.data),
      sessionId: params.sessionId,
      model: response.data?.model,
      usage: response.data?.usage,
    };
  }

  private getDemoResponse(message: string): string {
    // Demo response when hermes-agent is not available
    return `【Demo Mode】

我收到了你的消息: "${message}"

这是 Demo 响应，因为 Hermes Agent 服务当前不可用。

要启用真正的 AI 响应:
1. 确保 hermes-agent 容器正在运行
2. 配置有效的 API Key（OpenRouter/Gemini等）
3. 检查 hermes-agent 日志排除故障

当前架构:
- OpenClaw Server (NestJS): API 网关 + 配额管理
- Hermes Agent (Python): AI Brain + 多平台消息集成
- OpenClaw Main (TypeScript): 桌面客户端 SDK`;
  }
}
