import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

interface ErrorLike {
  message: string;
  code?: string;
}
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
    const conversation = dto.sessionId
      ? await this.conversationService.getBySessionId(teamId, dto.sessionId)
      : null;

    const activeConversation = conversation || await this.conversationService.create(
      teamId,
      'New conversation',
      userId,
    );

    // 4. Add user message
    await this.conversationService.addMessage(teamId, activeConversation.id, {
      role: 'user',
      content: dto.message,
    });

    await this.quotaService.consumeQuota(teamId, 1);

    try {
      const response = await this.callHermesAgent({
        message: dto.message,
        sessionId: activeConversation.id,
        context: dto.context,
        model: dto.model,
      });

      await this.conversationService.addMessage(teamId, activeConversation.id, {
        role: 'assistant',
        content: response.response,
        model: response.model,
        usage: response.usage,
      });

      return response;
    } catch (error: unknown) {
      const hermesError = error as ErrorLike;
      this.logger.error(`Hermes chat failed: ${hermesError.message}`);

      if (hermesError.code === 'ECONNREFUSED' || hermesError.code === 'ETIMEDOUT') {
        const demoResponse = this.getDemoResponse(dto.message);
        await this.conversationService.addMessage(teamId, activeConversation.id, {
          role: 'assistant',
          content: demoResponse,
        });
        return {
          success: true,
          response: demoResponse,
          sessionId: activeConversation.id,
          model: 'demo',
        };
      }

      throw new HttpException(
        {
          success: false,
          error: 'Hermes 服务调用失败',
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
    } catch (error: unknown) {
      const hermesError = error as ErrorLike;
      this.logger.warn(`Hermes status check failed: ${hermesError.message}`);
      return {
        status: 'offline',
        version: 'unknown',
        activeSessions: 0,
        model: 'unknown',
        provider: 'unknown',
      };
    }
  }

  async getSessions(teamId: string) {
    return this.conversationService.getList(teamId);
  }

  async getSession(teamId: string, sessionId: string) {
    const conversation = await this.conversationService.getBySessionId(teamId, sessionId);
    return this.conversationService.getById(teamId, conversation.id);
  }

  private async callHermesAgent(params: {
    message: string;
    sessionId: string;
    context?: Record<string, any>;
    model?: string;
  }): Promise<ChatResponseDto> {
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
      response: this.extractHermesResponse(response.data),
      sessionId: params.sessionId,
      model: response.data?.model,
      usage: response.data?.usage,
    };
  }

  private extractHermesResponse(data: any): string {
    if (typeof data?.response === 'string' && data.response.trim()) {
      return data.response;
    }

    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }

    return 'Hermes 服务返回了无效响应';
  }

  private getDemoResponse(message: string): string {
    return `【Demo Mode】

我收到了你的消息: "${message}"

Hermes Agent 服务当前不可用，请稍后再试。`;
  }
}
