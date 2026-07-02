// Slice 2026-07-02-gateway-split-trio: hermes agent call + abort +
// stream-event cluster extracted from GatewayService. All 6 methods
// moved verbatim from gateway.service.ts with the same signatures
// and behavior. `private` access modifiers widened to `public`.
//
// State sharing (CRITICAL — preserves double-spend protection):
// `activeStreams` Map lives on the facade; this cluster accesses it
// via 4 lambda callbacks (getActiveStream / setActiveStream /
// deleteActiveStream / allActiveStreams). `sendStreamEvent` (verbatim
// gateway.service.ts:2463) is also a callback so this cluster never
// touches `gatewayInstance`. Lingqi/prompt-context/provider-resolution/
// usage services are injected for orchestration.
//
// Stream handlers (SSE data/end/error/close) live in
// `gateway-hermes-stream.ts` (helper module, not a 4th service) to
// keep this service file under the 500L cluster budget.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AiModelsService } from '../ai-models/ai-models.service';
import { firstValueFrom } from 'rxjs';
import { WebSocket } from 'ws';
import { GatewayProviderResolutionService } from './gateway-provider-resolution.service';
import { GatewayLingqiService } from './gateway-lingqi.service';
import { GatewayPromptContextService } from './gateway-prompt-context.service';
import { GatewayUsageService } from './gateway-usage.service';
import {
  buildProviderErrorMessage, generateUUID,
  isMiniMaxAnthropicProvider as isMiniMaxAnthropicProviderHelper,
  normalizeProviderBaseUrl,
} from './gateway.helpers';
import {
  HermesStreamCtx, registerDirectProviderStream, registerHermesAgentStream,
} from './gateway-hermes-stream';
import {
  ActiveStreamEntry, HermesAgentProviderOverride, HermesChatMessage,
  HermesChatRequestBody, HermesMessageContent, HermesMessageParams,
  HermesSendResult,
} from './gateway.types';

export interface HermesStateCallbacks {
  getActiveStream: (id: string) => ActiveStreamEntry | undefined;
  setActiveStream: (id: string, entry: ActiveStreamEntry) => void;
  deleteActiveStream: (id: string) => boolean;
  allActiveStreams: () => IterableIterator<[string, ActiveStreamEntry]>;
  sendStreamEvent: (eventType: string, data: unknown, targetWs?: WebSocket) => void;
  /** Health-check proxy. The facade supplies this so `jest.spyOn(service as any, 'checkHermesAgentHealth')`
   *  on the facade instance propagates to the cluster (preserves spec contract). */
  checkHermesAgentHealth: () => Promise<boolean>;
  /** Proxy to facade's `sendHermesAgentMessage` so spec's
   *  `jest.spyOn(service as any, 'sendHermesAgentMessage')` propagates to the cluster. */
  sendHermesAgentMessage: (
    params: HermesMessageParams,
    senderWs?: WebSocket,
    modelName?: string,
    prepaid?: ActiveStreamEntry['prepaid'],
    providerOverride?: HermesAgentProviderOverride,
  ) => Promise<HermesSendResult>;
  /** Proxy to facade's `generateUUID` so spec's `jest.spyOn(service as any, 'generateUUID')` propagates. */
  generateUUID: () => string;
  /** Proxy to facade's `checkQuota` so spec's `jest.spyOn(service as any, 'checkQuota')` propagates. */
  checkQuota: (teamId: string) => Promise<string | null>;
}

@Injectable()
export class GatewayHermesService {
  private readonly logger = new Logger(GatewayHermesService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private aiModelsService: AiModelsService,
    private providerResolutionService: GatewayProviderResolutionService,
    private lingqiService: GatewayLingqiService,
    private promptContextService: GatewayPromptContextService,
    private usageService: GatewayUsageService,
    private state: HermesStateCallbacks,
  ) {}

  async sendHermesAgentMessage(
    params: HermesMessageParams,
    senderWs?: WebSocket,
    modelName = 'hermes-agent',
    prepaid?: ActiveStreamEntry['prepaid'],
    providerOverride?: HermesAgentProviderOverride,
  ): Promise<HermesSendResult> {
    const messageId = params.messageId || this.state.generateUUID();
    const hermesAgentUrl = this.providerResolutionService.getHermesAgentUrl();
    this.logger.log(`Routing to hermes-agent at ${hermesAgentUrl}`);

    const { messages: conversationMessages, mcpServers: conversationMcpServers } =
      await this.promptContextService.resolveConversationPromptContext({
        conversationId: params.conversationId, expertId: params.expertId, teamId: params.teamId,
        skillIds: params.skillIds, mcpServerIds: params.mcpServerIds,
        extensionIds: params.extensionIds, userId: params.userId, role: params.role,
      });

    const messages: HermesChatMessage[] = [...conversationMessages];
    if (params.attachments && params.attachments.length > 0) {
      const contentParts: Exclude<HermesMessageContent, string> = [{ type: 'text', text: params.message }];
      for (const att of params.attachments) {
        if (att.type === 'image' && att.data) {
          contentParts.push({ type: 'image_url', image_url: { url: `data:${att.mimeType};base64,${att.data}` } });
        } else if (att.data) {
          contentParts[0] = { ...contentParts[0], text: `${contentParts[0].text || ''}\n\n[Attached file: ${att.name}]\n${att.data}` };
        }
      }
      messages.push({ role: 'user', content: contentParts });
    } else {
      messages.push({ role: 'user', content: params.message });
    }

    const requestBody: HermesChatRequestBody = { model: modelName, messages, stream: true };
    if (conversationMcpServers.length > 0) requestBody.mcp_servers = conversationMcpServers;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (requestBody.mcp_servers?.length) {
        const internalKey = this.configService.get<string>('HERMES_INTERNAL_MCP_KEY');
        if (!internalKey) throw new Error('Internal MCP key is required when forwarding request-scoped MCP servers');
        headers['X-Hermes-Internal-MCP-Key'] = internalKey;
      }
      if (providerOverride) {
        const internalKey = this.configService.get<string>('HERMES_INTERNAL_MCP_KEY');
        if (!internalKey) throw new Error('Internal MCP key is required when forwarding admin provider credentials');
        headers['X-Hermes-Internal-MCP-Key'] = internalKey;
        headers['X-Hermes-Provider-Base-Url'] = providerOverride.baseUrl;
        headers['X-Hermes-Provider-Api-Key'] = providerOverride.apiKey;
        headers['X-Hermes-Provider-Auth-Style'] = providerOverride.authStyle;
        headers['X-Hermes-Provider-Model'] = providerOverride.modelId;
        headers['X-Hermes-Provider-Code'] = providerOverride.providerCode;
      }
      const response = await firstValueFrom(this.httpService.post(`${hermesAgentUrl}/v1/chat/completions`, requestBody, {
        headers, responseType: 'stream', timeout: 300000, maxRedirects: 0,
      }));

      const stream = response.data;
      const streamEntry: ActiveStreamEntry = { ws: senderWs, stream, aborted: false, hasBillableOutput: false, prepaid };
      if (senderWs) this.state.setActiveStream(messageId, streamEntry);

      const fullResponse = { value: '' };
      const deltaCount = { value: 0 };
      const totalTokens = { value: 0 };

      return await new Promise<HermesSendResult>((resolve) => {
        const ctx: HermesStreamCtx = {
          messageId, stream, senderWs, streamEntry,
          fullResponse, deltaCount, totalTokens,
          state: this.state, logger: this.logger,
          onDone: (data) => resolve(data as HermesSendResult),
        };
        registerHermesAgentStream(ctx);
      });
    } catch (error) {
      this.logger.error('Failed to call hermes-agent API:', error);
      this.state.sendStreamEvent('hermes.error', { messageId, error: error instanceof Error ? error.message : 'hermes-agent call failed' }, senderWs);
      return { ok: false, messageId, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async abortStreamsForSocket(ws: WebSocket): Promise<void> {
    const aborts: Promise<HermesSendResult>[] = [];
    for (const [id, entry] of this.state.allActiveStreams()) {
      if (entry.ws === ws) aborts.push(this.abortHermesMessage({ messageId: id }, ws));
    }
    await Promise.allSettled(aborts);
  }

  async abortHermesMessage(params: { messageId: string }, requestingWs: WebSocket): Promise<HermesSendResult> {
    const { messageId } = params;
    const entry = this.state.getActiveStream(messageId);
    if (!entry) { this.logger.warn(`No active stream found for messageId: ${messageId}`); return { ok: false, messageId, error: 'No active stream' }; }
    if (entry.ws !== requestingWs) { this.logger.warn(`Unauthorized abort attempt for messageId: ${messageId}`); return { ok: false, messageId, error: 'Unauthorized' }; }
    this.logger.log(`Aborting stream for messageId: ${messageId}`);
    entry.aborted = true;
    if (entry.prepaid && !entry.hasBillableOutput) await this.lingqiService.refundLingqiCharge(entry.prepaid.params, entry.prepaid.charge, messageId);
    if (entry.stream.destroy) entry.stream.destroy();
    this.state.deleteActiveStream(messageId);
    this.state.sendStreamEvent('hermes.final', { messageId, content: '', aborted: true }, entry.ws);
    return { ok: true, messageId, aborted: true };
  }

  async sendHermesMessage(params: HermesMessageParams, senderWs?: WebSocket): Promise<HermesSendResult> {
    this.logger.log('Sending message to Hermes');
    const messageId = params.messageId || this.state.generateUUID();
    const billingId = this.state.generateUUID();
    const requestParams: HermesMessageParams = { ...params, messageId };

    const lingqiCharge = await this.lingqiService.prepareLingqiCharge(requestParams, billingId, senderWs);
    if ('error' in lingqiCharge) return lingqiCharge.error;

    const prepaidCharge = await this.lingqiService.prepayLingqiCharge(requestParams, lingqiCharge.charge, messageId, lingqiCharge.billingId);
    if ('error' in prepaidCharge) {
      this.state.sendStreamEvent('hermes.error', { messageId: prepaidCharge.error.messageId, error: prepaidCharge.error.error }, senderWs);
      return prepaidCharge.error;
    }

    const providerOverride = await this.providerResolutionService.tryBuildHermesProviderOverride(lingqiCharge);
    const mcpSelection = await this.promptContextService.hasConversationMcpSelection(requestParams);
    const hermesHealthy = (!providerOverride || mcpSelection) && await this.state.checkHermesAgentHealth();
    if (hermesHealthy) {
      const result = await this.state.sendHermesAgentMessage(requestParams, senderWs, lingqiCharge.executionModelName, { params: requestParams, charge: lingqiCharge.charge }, providerOverride);
      return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, result);
    }

    const teamId = requestParams.teamId;
    const providerModel = await this.providerResolutionService.resolveProviderModelForLingqiCharge(lingqiCharge);
    if (!providerModel) {
      const errorMessage = lingqiCharge.executionModelName ? `模型 ${lingqiCharge.executionModelName} 配置缺失或未激活，请联系管理员` : '请选择 AI 模型';
      this.logger.warn(`[sendHermesMessage] Provider model resolution failed: ${errorMessage}`);
      this.state.sendStreamEvent('hermes.error', { messageId, error: errorMessage }, senderWs);
      return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: errorMessage });
    }
    const providerId = providerModel.provider_id;
    const modelCode = providerModel.model_id;
    const apiKeyRecord = await this.aiModelsService.findActiveApiKeyByProvider(providerId);
    if (!apiKeyRecord) {
      const errorMessage = `模型 ${providerModel.model_id} 的 API 密钥未配置，请联系管理员`;
      this.logger.warn(`[sendHermesMessage] No active API key for provider ${providerModel.provider_name}`);
      this.state.sendStreamEvent('hermes.error', { messageId, error: errorMessage }, senderWs);
      return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: errorMessage });
    }
    const decryptedKey = await this.aiModelsService.getDecryptedApiKey(apiKeyRecord.id);
    if (!decryptedKey) {
      const errorMessage = `模型 ${providerModel.model_id} 的 API 密钥解密失败，请联系管理员`;
      this.logger.warn(`[sendHermesMessage] Failed to decrypt API key for provider ${providerModel.provider_name}`);
      this.state.sendStreamEvent('hermes.error', { messageId, error: errorMessage }, senderWs);
      return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: errorMessage });
    }
    const endpoint = await this.aiModelsService.findDefaultEndpointByProvider(providerId);
    if (!endpoint?.base_url) {
      const errorMessage = `模型 ${providerModel.model_id} 的 API 端点未配置，请联系管理员`;
      this.logger.warn(`[sendHermesMessage] No active endpoint configured for provider ${providerModel.provider_name}`);
      this.state.sendStreamEvent('hermes.error', { messageId, error: errorMessage }, senderWs);
      return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: errorMessage });
    }
    let baseUrl: string;
    try { baseUrl = normalizeProviderBaseUrl(endpoint.base_url); }
    catch (error: unknown) {
      this.logger.warn('Invalid provider endpoint URL configuration');
      return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: 'Provider configuration error' });
    }
    if (teamId) {
      const quotaError = await this.state.checkQuota(teamId);
      if (quotaError) {
        this.state.sendStreamEvent('hermes.error', { messageId, error: quotaError }, senderWs);
        return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: quotaError });
      }
    }
    const isMiniMaxAnthropicProvider = isMiniMaxAnthropicProviderHelper(providerModel, baseUrl);
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${decryptedKey}` };
    if (isMiniMaxAnthropicProvider) headers['anthropic-version'] = '2023-06-01';
    try {
      if (endpoint?.headers) {
        const extraHeaders = typeof endpoint.headers === 'string' ? JSON.parse(endpoint.headers) : endpoint.headers;
        Object.assign(headers, extraHeaders);
      }
    } catch (error: unknown) {
      this.logger.warn('Invalid provider endpoint headers configuration');
      return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: 'Provider configuration error' });
    }
    const { messages, hasMcpSelection } = await this.promptContextService.resolveConversationPromptContext({
      conversationId: requestParams.conversationId, expertId: requestParams.expertId, teamId: requestParams.teamId,
      skillIds: requestParams.skillIds, mcpServerIds: requestParams.mcpServerIds,
      extensionIds: requestParams.extensionIds, userId: requestParams.userId, role: requestParams.role,
    });
    if (hasMcpSelection) {
      this.state.sendStreamEvent('hermes.error', { messageId, error: 'MCP servers require Hermes Agent routing' }, senderWs);
      return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: 'MCP servers require Hermes Agent routing' });
    }
    messages.push({ role: 'user', content: requestParams.message });
    const systemMessages = messages.filter((m) => m.role === 'system');
    const providerMessages = isMiniMaxAnthropicProvider ? messages.filter((m) => m.role !== 'system') : messages;
    const requestBody: HermesChatRequestBody = { model: modelCode, messages: providerMessages, stream: true };
    if (isMiniMaxAnthropicProvider && systemMessages.length > 0) {
      const systemPrompt = systemMessages.map((m) => m.content).filter((c): c is string => typeof c === 'string' && c.trim().length > 0).join('\n\n');
      if (systemPrompt) requestBody.system = systemPrompt;
    }
    if (providerModel.temperature !== null && providerModel.temperature !== undefined) requestBody.temperature = providerModel.temperature;
    if (providerModel.max_tokens !== null && providerModel.max_tokens !== undefined) requestBody.max_tokens = providerModel.max_tokens;
    else if (isMiniMaxAnthropicProvider) requestBody.max_tokens = 1024;
    if (providerModel.top_p !== null && providerModel.top_p !== undefined) requestBody.top_p = providerModel.top_p;
    const timeout = endpoint?.timeout_ms || 60000;

    try {
      const startTime = Date.now();
      const providerRequestPath = isMiniMaxAnthropicProvider ? '/v1/messages' : '/v1/chat/completions';
      const response = await firstValueFrom(this.httpService.post(`${baseUrl}${providerRequestPath}`, requestBody, {
        headers, responseType: 'stream', timeout, maxRedirects: 0,
      }));
      this.logger.log(`Provider API (${providerModel.provider_name}/${modelCode}) connected, starting stream...`);
      this.logger.log(`Provider API (${providerModel.provider_name}/${modelCode}) response status: ${response.status}`);

      const streamEntry: ActiveStreamEntry = {
        ws: senderWs,
        stream: response.data as { destroy?: () => void },
        aborted: false, hasBillableOutput: false,
        prepaid: { params: requestParams, charge: lingqiCharge.charge },
      };
      if (senderWs) this.state.setActiveStream(messageId, streamEntry);

      const fullResponse = { value: '' };
      const deltaCount = { value: 0 };
      const totalTokens = { value: 0 };
      const recordUsage = () => this.usageService.recordProviderUsage(apiKeyRecord.id, providerId, modelCode, totalTokens.value, Date.now() - startTime, teamId).catch(err => this.logger.warn('Failed to record usage:', err));
      const successPath = async () => {
        const result = await this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: true, messageId });
        if (result.ok) {
          this.state.sendStreamEvent('hermes.final', { messageId, content: fullResponse.value, totalTokens: totalTokens.value }, senderWs);
          recordUsage();
        }
        return result;
      };
      const streamErrPath = async () => {
        const result = await this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: 'Provider stream error' });
        this.state.sendStreamEvent('hermes.error', { messageId, error: result.error }, senderWs);
        return result;
      };
      const emptyPath = async () => this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: 'No response' });
      const closePath = async () => this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: 'Provider connection closed before completion' });
      const abortPath = (r: HermesSendResult): Promise<HermesSendResult> => this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, r, streamEntry.hasBillableOutput);

      return await registerDirectProviderStream({
        messageId, stream: response.data, senderWs, streamEntry,
        fullResponse, deltaCount, totalTokens,
        state: this.state, logger: this.logger,
        providerName: providerModel.provider_name, modelCode,
        onFinalize: abortPath,
        onProviderStreamError: streamErrPath,
        onEmpty: emptyPath,
        onSuccess: successPath,
        onCloseError: closePath,
      });
    } catch (error) {
      const err = error as { message?: string; response?: { status?: number; data?: unknown }; code?: string };
      let bodyPreview = 'n/a';
      let providerMessage: string | undefined;
      const raw = err.response?.data;
      if (raw && typeof (raw as { on?: unknown }).on === 'function') {
        const streamLike = raw as NodeJS.ReadableStream;
        const chunks: Buffer[] = [];
        try {
          await new Promise<void>((resolve) => {
            streamLike.on('data', (c: Buffer | string) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
            streamLike.on('end', () => resolve());
            streamLike.on('error', () => resolve());
            setTimeout(() => resolve(), 2000);
          });
        } catch { /* ignore */ }
        const text = Buffer.concat(chunks).toString('utf8');
        bodyPreview = text.slice(0, 400);
        try {
          const parsed = JSON.parse(text) as { error?: { message?: string; type?: string }; message?: string; base_resp?: { status_msg?: string } };
          providerMessage = parsed.error?.message || parsed.message || parsed.base_resp?.status_msg;
        } catch { providerMessage = text.slice(0, 200); }
      } else if (raw && typeof raw === 'object') {
        const errObj = (raw as { error?: { message?: string; type?: string; code?: string } }).error;
        const messageField = (raw as { message?: string }).message;
        if (errObj) { bodyPreview = `${errObj.type ?? ''}:${errObj.code ?? ''}:${(errObj.message ?? '').slice(0, 200)}`; providerMessage = errObj.message; }
        else if (messageField) { bodyPreview = String(messageField).slice(0, 200); providerMessage = String(messageField); }
      } else if (typeof raw === 'string') { bodyPreview = raw.slice(0, 200); providerMessage = raw.slice(0, 200); }
      const status = err.response?.status;
      this.logger.error(`Failed to call ${providerModel.provider_name} API. status=${status ?? 'n/a'} code=${err.code ?? 'n/a'} message=${err.message ?? 'unknown'} body=${bodyPreview}`);
      const userFacingError = buildProviderErrorMessage(providerModel.provider_name, status, providerMessage);
      this.state.sendStreamEvent('hermes.error', { messageId, error: userFacingError }, senderWs);
      return this.lingqiService.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: userFacingError });
    }
  }

  async sendLegacyHermesMessage(params: { sessionId: string; message: string }, senderWs?: WebSocket, messageId?: string) {
    messageId = messageId || this.state.generateUUID();
    const hermesEndpoint = this.configService.get<string>('HERMES_ENDPOINT', 'http://localhost:9119');
    this.logger.log(`Using legacy hermes-agent at ${hermesEndpoint}`);
    try {
      const response = await firstValueFrom(this.httpService.post(`${hermesEndpoint}/v1/responses`, {
        model: 'hermes-agent', input: params.message, stream: true,
      }, { headers: { 'Content-Type': 'application/json' }, responseType: 'stream' }));
      this.logger.log(`Legacy hermes response status: ${response.status}`);
      const stream = response.data;
      let fullResponse = '';
      let deltaCount = 0;
      let lineBuffer = '';
      let settled = false;
      return new Promise((resolve, reject) => {
        const settle = (r: HermesSendResult) => { if (settled) return; settled = true; resolve(r); };
        stream.on('data', (chunk: Buffer) => {
          if (settled) return;
          const chunkStr = chunk.toString();
          lineBuffer += chunkStr;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'response.output_text.delta') {
                const delta = data.delta || '';
                fullResponse += delta; deltaCount++;
                this.state.sendStreamEvent('hermes.delta', { messageId, delta, sequenceNumber: deltaCount }, senderWs);
              } else if (data.type === 'response.completed') {
                this.state.sendStreamEvent('hermes.final', { messageId, content: fullResponse, totalTokens: data.response?.usage?.total_tokens || 0 }, senderWs);
                settle({ ok: true, messageId });
              }
            } catch (e) { this.logger.warn(`Failed to parse SSE line: ${line}`); }
          }
        });
        stream.on('end', () => {
          if (settled) return;
          if (lineBuffer.trim() && lineBuffer.startsWith('data: ')) {
            try { const data = JSON.parse(lineBuffer.substring(6)); if (data.type === 'response.output_text.delta') fullResponse += data.delta || ''; }
            catch (e) { /* skip */ }
          }
          this.logger.log(`Legacy hermes stream ended, ${deltaCount} chunks`);
          if (!fullResponse) {
            this.logger.error('Legacy hermes returned no response.');
            this.state.sendStreamEvent('hermes.error', { messageId, error: 'No response from legacy Hermes.' }, senderWs);
            settle({ ok: false, messageId, error: 'No response' });
            return;
          }
          this.state.sendStreamEvent('hermes.final', { messageId, content: fullResponse, totalTokens: 0 }, senderWs);
          settle({ ok: true, messageId });
        });
        stream.on('error', (error: Error) => {
          if (settled) return;
          this.logger.error('Hermes stream error:', error);
          this.state.sendStreamEvent('hermes.error', { messageId, error: 'Legacy Hermes stream error' }, senderWs);
          settle({ ok: false, messageId, error: 'Legacy Hermes stream error' });
        });
      });
    } catch (error: any) {
      let errorMessage = 'Unknown error';
      if (error?.errors && Array.isArray(error.errors)) {
        const innerErrors = error.errors.map((e: any) => e.message || e.code || String(e)).join('; ');
        errorMessage = `Connection failed: ${innerErrors || 'AggregateError'}`;
        this.logger.error('Failed to call Hermes API (AggregateError):', innerErrors);
      } else if (error instanceof Error) { errorMessage = error.message; this.logger.error('Failed to call Hermes API:', error.message); }
      else { errorMessage = String(error); this.logger.error('Failed to call Hermes API (unknown):', error); }
      this.state.sendStreamEvent('hermes.error', { messageId, error: 'Legacy Hermes request failed' }, senderWs);
      return { ok: false, messageId, error: 'Legacy Hermes request failed' };
    }
  }

  async getHermesAgentStatus() {
    return this.providerResolutionService.getHermesAgentStatus();
  }

  async getHermesSessions(params: { teamId: string }) {
    return this.promptContextService.getHermesSessions(params);
  }
}