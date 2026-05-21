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
    this.hermesEndpoint = this.normalizeInternalServiceUrl(
      this.configService.get<string>('HERMES_ENDPOINT') || process.env.HERMES_ENDPOINT || 'http://hermes-agent:9119',
      'HERMES_ENDPOINT',
    );
  }

  async chat(userId: string, teamId: string, dto: ChatRequestDto): Promise<ChatResponseDto> {
    const conversation = dto.sessionId
      ? await this.conversationService.getBySessionId(teamId, dto.sessionId)
      : await this.conversationService.create(
        teamId,
        'New conversation',
        userId,
      );

    const estimate = await this.quotaService.estimateLingqiCost(teamId, {
      transactionType: 'chat_message',
      modelId: dto.model,
      context: { conversationId: conversation.id },
    });

    if (!estimate.canAfford) {
      throw new HttpException(
        {
          success: false,
          error: estimate.reason || 'LINGQI_INSUFFICIENT_BALANCE',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const executionModel = await this.quotaService.getSelectedModelForExecution(teamId, dto.model, conversation.id);
    await this.prepayLingqiCharge(teamId, userId, conversation.id, estimate.estimatedCost, dto.model);

    try {
      await this.conversationService.addMessage(teamId, conversation.id, {
        role: 'user',
        content: dto.message,
      });

      const response = await this.callHermesAgent({
        message: dto.message,
        sessionId: conversation.id,
        context: dto.context,
        model: executionModel.modelName,
      });

      await this.conversationService.addMessage(teamId, conversation.id, {
        role: 'assistant',
        content: response.response,
        model: response.model,
        usage: response.usage,
      });

      return response;
    } catch (error: unknown) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Hermes agent execution failed: ${errorMessage}`);

      await this.refundLingqiCharge(teamId, userId, conversation.id, estimate.estimatedCost, dto.model);

      throw new HttpException(
        {
          success: false,
          error: 'Hermes 服务暂时不可用，请稍后重试',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getStatus(): Promise<HermesStatusDto> {
    try {
      const response = await this.httpService
        .get(`${this.hermesEndpoint}/health`, { timeout: 5000, maxRedirects: 0 })
        .toPromise();
      return {
        status: 'online',
        version: response.data?.version || 'unknown',
        activeSessions: response.data?.active_sessions || 0,
        model: response.data?.model || 'unknown',
        provider: response.data?.provider || 'unknown',
      };
    } catch (error: unknown) {
      this.logger.warn(`Hermes status check failed: ${this.getErrorMessage(error)}`);
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

  private async prepayLingqiCharge(
    teamId: string,
    userId: string,
    conversationId: string,
    amount: number,
    modelId?: string,
  ): Promise<void> {
    await this.quotaService.consumeLingqi(teamId, userId, {
      amount,
      transactionType: 'chat_message',
      sourceType: 'chat',
      sourceId: conversationId,
      description: '聊天模型调用',
      metadata: { modelId: modelId || null },
      idempotencyKey: `charge:chat:${conversationId}`,
    });
  }

  private async refundLingqiCharge(
    teamId: string,
    userId: string,
    conversationId: string,
    amount: number,
    modelId?: string,
  ): Promise<void> {
    await this.quotaService.refundLingqi(teamId, userId, {
      amount,
      transactionType: 'chat_message',
      sourceType: 'chat_refund',
      sourceId: conversationId,
      description: '聊天模型调用失败退款',
      metadata: { modelId: modelId || null },
      idempotencyKey: `refund:chat:${conversationId}`,
      refundOfIdempotencyKey: `charge:chat:${conversationId}`,
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unexpected error';
  }

  private normalizeInternalServiceUrl(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`${name} is required`);
    }

    const parsed = new URL(value);
    const allowedHosts = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal', 'hermes-agent']);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || !allowedHosts.has(parsed.hostname)) {
      throw new Error(`${name} must point to a trusted internal service`);
    }

    return parsed.origin;
  }

  private isConnectionFailure(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    return error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
  }

  private async callHermesAgent(params: {
    message: string;
    sessionId: string;
    context?: Record<string, unknown>;
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
          maxRedirects: 0,
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
