import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface FetchModelsResponse {
  data?: Array<{ id: string; name?: string }>;
  models?: Array<{ id: string; name?: string }>;
  [key: string]: any;
}

const TRUSTED_MODEL_HOSTS = new Set([
  'api.openai.com',
  'api.anthropic.com',
  'api.minimax.chat',
  'api.minimaxi.com',
  'api.deepseek.com',
  'generativelanguage.googleapis.com',
  'api.moonshot.cn',
  'open.bigmodel.cn',
  'api.baichuan-ai.com',
  'dashscope.aliyuncs.com',
  'aip.baidubce.com',
  'open.bytedanceapi.com',
  'hunyuan.tencentcloudapi.com',
  'api.siliconflow.cn',
  'api.together.xyz',
  'api.groq.com',
  'api.cerebras.ai',
  'api.cohere.com',
  'api.mistral.ai',
  'api.fireworks.ai',
  'api.x.ai',
]);

export function normalizeTrustedModelProviderBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:') {
    throw new Error(`Unsupported model provider URL: ${baseUrl}`);
  }
  if (!TRUSTED_MODEL_HOSTS.has(url.hostname)) {
    throw new Error(`Untrusted model provider host: ${url.hostname}`);
  }
  if (url.search || url.hash) {
    throw new Error(`Unsupported model provider URL: ${baseUrl}`);
  }

  return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
}

function providerEndpoint(baseUrl: string, path: string): string {
  return `${normalizeTrustedModelProviderBaseUrl(baseUrl)}${path}`;
}

function isMiniMaxAnthropicBaseUrl(baseUrl: string): boolean {
  const url = new URL(normalizeTrustedModelProviderBaseUrl(baseUrl));
  return url.hostname === 'api.minimaxi.com' && url.pathname.startsWith('/anthropic');
}

@Injectable()
export class AiApiClient {
  constructor(private readonly httpService: HttpService) {}

  async fetchModels(baseUrl: string, apiKey: string, timeout = 15000): Promise<FetchModelsResponse> {
    const url = providerEndpoint(baseUrl, '/v1/models');
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: isMiniMaxAnthropicBaseUrl(baseUrl)
          ? { 'X-Api-Key': apiKey }
          : { Authorization: `Bearer ${apiKey}` },
        maxRedirects: 0,
        timeout,
      }),
    );
    return response.data;
  }

  async chatCompletion(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
    },
  ): Promise<any> {
    const url = providerEndpoint(baseUrl, '/v1/chat/completions');
    const response = await firstValueFrom(
      this.httpService.post(
        url,
        {
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          maxRedirects: 0,
          timeout: options?.timeout ?? 60000,
        },
      ),
    );
    return response.data;
  }
}
