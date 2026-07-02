// Slice 2026-07-02-gateway-split-foundation: pure helpers extracted from GatewayService.
// All functions are side-effect-free module-scope exports. The 3 boundary helpers
// (`getJwtSecret`, `getTokenExpiresAt`, `generateUUID`) are also re-exported via
// private facade methods on GatewayService to preserve spec compatibility
// (spec uses jest.spyOn(service as any, 'generateUUID')).
import { ConfigService } from '@nestjs/config';
import { normalizeTrustedModelProviderBaseUrl } from '../ai-models/api-client';
import { GatewayJwtPayload, ProviderModelRow, ProviderStreamChunk } from './gateway.types';

export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

export function normalizeInternalServiceUrl(value: string | undefined, name: string): string {
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

export function normalizeProviderBaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error('Provider endpoint is required');
  }

  return normalizeTrustedModelProviderBaseUrl(value);
}

export function buildProviderErrorMessage(
  providerName: string,
  status: number | undefined,
  providerMessage: string | undefined,
): string {
  const trimmed = providerMessage?.trim();
  if (status === 401 || status === 403) {
    return `${providerName} 鉴权失败 (${status})${trimmed ? `：${trimmed}` : '；请检查 API Key 与权限'}`;
  }
  if (status === 429) {
    return `${providerName} 限流或配额耗尽 (429)${trimmed ? `：${trimmed}` : '；请检查 token plan 余额、是否开通对应接口、或稍后重试'}`;
  }
  if (status === 404) {
    return `${providerName} 接口或模型不存在 (404)${trimmed ? `：${trimmed}` : '；请确认模型 ID 与 endpoint'}`;
  }
  if (status && status >= 500) {
    return `${providerName} 服务端故障 (${status})${trimmed ? `：${trimmed}` : '；请稍后重试'}`;
  }
  if (status) {
    return `${providerName} 调用失败 (${status})${trimmed ? `：${trimmed}` : ''}`;
  }
  return `${providerName} 调用失败${trimmed ? `：${trimmed}` : ''}`;
}

export function isMiniMaxAnthropicProvider(providerModel: ProviderModelRow, baseUrl: string): boolean {
  const providerCode = providerModel.provider_code?.toLowerCase();
  const providerName = providerModel.provider_name.toLowerCase();
  const parsedUrl = new URL(baseUrl);

  return (
    parsedUrl.hostname === 'api.minimaxi.com' &&
    parsedUrl.pathname.startsWith('/anthropic') &&
    (providerCode === 'minimax' || providerName.includes('minimax'))
  );
}

export function extractProviderTextDelta(data: ProviderStreamChunk): string {
  const openAiDelta = data.choices?.[0]?.delta?.content;
  if (typeof openAiDelta === 'string') {
    return openAiDelta;
  }

  if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta' && typeof data.delta.text === 'string') {
    return data.delta.text;
  }

  return '';
}

export function extractProviderTotalTokens(data: ProviderStreamChunk, fallback: number): number {
  if (typeof data.usage?.total_tokens === 'number') {
    return data.usage.total_tokens;
  }

  const inputTokens = data.message?.usage?.input_tokens;
  const messageOutputTokens = data.message?.usage?.output_tokens;
  if (typeof inputTokens === 'number' || typeof messageOutputTokens === 'number') {
    return (typeof inputTokens === 'number' ? inputTokens : 0) +
      (typeof messageOutputTokens === 'number' ? messageOutputTokens : 0);
  }

  const outputTokens = data.usage?.output_tokens;
  if (typeof outputTokens === 'number') {
    return Math.max(fallback, outputTokens);
  }

  return fallback;
}

export function isProviderToolCall(value: unknown): value is { id?: string; function?: { name?: string; arguments?: string } } {
  return typeof value === 'object' && value !== null;
}

export function getTokenExpiresAt(payload: GatewayJwtPayload): number {
  if (!Number.isInteger(payload.exp) || !payload.exp) {
    throw new Error('Authentication required');
  }

  return payload.exp * 1000;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
