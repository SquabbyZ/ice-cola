import { DatabaseService } from '../../database/database.service';
import { EncryptionService } from '../encryption.service';

export interface ProviderSeed {
  name: string;
  code: string;
  logoUrl?: string;
  websiteUrl?: string;
  description: string;
  sortOrder: number;
}

export interface ModelSeed {
  providerCode: string;
  name: string;
  modelId: string;
  modelType: 'chat' | 'vision' | 'embedding' | 'text' | 'reasoning';
  description?: string;
  contextWindow?: number;
  inputPricePer1m?: number;
  outputPricePer1m?: number;
  sortOrder: number;
  capabilities?: string[];
}

export const PROVIDERS_SEED: ProviderSeed[] = [
  { name: 'OpenAI', code: 'openai', websiteUrl: 'https://openai.com', description: 'Leading AI research company, creator of GPT models and ChatGPT', sortOrder: 1 },
  { name: 'Anthropic', code: 'anthropic', websiteUrl: 'https://anthropic.com', description: 'AI safety company behind Claude', sortOrder: 2 },
  { name: 'Google', code: 'google', websiteUrl: 'https://ai.google.dev', description: 'Google AI Gemini models', sortOrder: 3 },
  { name: 'Meta', code: 'meta', websiteUrl: 'https://ai.meta.com', description: 'Meta AI Llama open-source models', sortOrder: 4 },
  { name: 'DeepSeek', code: 'deepseek', websiteUrl: 'https://deepseek.com', description: 'High-performance low-cost models', sortOrder: 5 },
  { name: 'xAI', code: 'xai', websiteUrl: 'https://x.ai', description: "Elon Musk's AI company behind Grok", sortOrder: 6 },
  { name: 'Mistral AI', code: 'mistral', websiteUrl: 'https://mistral.ai', description: 'European AI with open-source models', sortOrder: 7 },
  { name: 'Cohere', code: 'cohere', websiteUrl: 'https://cohere.com', description: 'Enterprise RAG, embeddings, reranking', sortOrder: 8 },
  { name: 'Qwen', code: 'qwen', websiteUrl: 'https://www.alibabacloud.com', description: 'Alibaba Qwen for chat and vision', sortOrder: 9 },
  { name: 'GLM', code: 'glm', websiteUrl: 'https://www.zhipuai.cn', description: 'Zhipu AI ChatGLM series', sortOrder: 10 },
  { name: 'Kimi', code: 'kimi', websiteUrl: 'https://www.moonshot.cn', description: 'Moonshot AI long-context', sortOrder: 11 },
  { name: 'MiniMax', code: 'minimax', websiteUrl: 'https://www.minimax.io', description: 'MiniMax text and speech', sortOrder: 12 },
  { name: 'Groq', code: 'groq', websiteUrl: 'https://groq.com', description: 'Fastest AI inference', sortOrder: 13 },
  { name: 'Perplexity', code: 'perplexity', websiteUrl: 'https://perplexity.ai', description: 'AI search with Sonar', sortOrder: 14 },
  { name: 'Together AI', code: 'together', websiteUrl: 'https://together.ai', description: 'Open-source AI inference', sortOrder: 15 },
  { name: 'AI21 Labs', code: 'ai21', websiteUrl: 'https://ai21.com', description: 'AI21 Jamba models', sortOrder: 16 },
  { name: 'Baidu', code: 'baidu', websiteUrl: 'https://cloud.baidu.com', description: "Baidu's ERNIE models", sortOrder: 17 },
  { name: 'Xiaomi', code: 'xiaomi', websiteUrl: 'https://ai.xiaomi.com', description: 'MiLM large language', sortOrder: 18 },
  { name: 'Tencent', code: 'tencent', websiteUrl: 'https://cloud.tencent.com', description: "Tencent's Hunyuan", sortOrder: 19 },
  { name: 'ByteDance', code: 'bytedance', websiteUrl: 'https://www.volcengine.com', description: "ByteDance's Doubao", sortOrder: 20 },
  { name: 'Hugging Face', code: 'huggingface', websiteUrl: 'https://huggingface.co', description: 'Open-source ML platform', sortOrder: 21 },
  { name: 'Stability AI', code: 'stability', websiteUrl: 'https://stability.ai', description: 'Stable Diffusion and LM', sortOrder: 22 },
  { name: 'Replicate', code: 'replicate', websiteUrl: 'https://replicate.com', description: 'Open-source models API', sortOrder: 23 },
];

export const MODELS_SEED: ModelSeed[] = [
  // OpenAI - GPT-5 Series
  { providerCode: 'openai', name: 'GPT-5 Pro', modelId: 'gpt-5-pro', modelType: 'chat', description: 'Most capable GPT-5', contextWindow: 200000, inputPricePer1m: 5.0, outputPricePer1m: 25.0, sortOrder: 1, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-5.4 Pro', modelId: 'gpt-5.4-pro', modelType: 'chat', description: 'Advanced for coding', contextWindow: 200000, inputPricePer1m: 2.5, outputPricePer1m: 15.0, sortOrder: 2, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-5.4', modelId: 'gpt-5.4', modelType: 'chat', description: 'Affordable GPT-5', contextWindow: 180000, inputPricePer1m: 1.25, outputPricePer1m: 10.0, sortOrder: 3, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-5.4 mini', modelId: 'gpt-5.4-mini', modelType: 'chat', description: 'Compact GPT-5', contextWindow: 180000, inputPricePer1m: 0.75, outputPricePer1m: 4.5, sortOrder: 4, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-5.4 nano', modelId: 'gpt-5.4-nano', modelType: 'chat', description: 'Budget GPT-5', contextWindow: 128000, inputPricePer1m: 0.2, outputPricePer1m: 1.25, sortOrder: 5, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-5.5', modelId: 'gpt-5.5', modelType: 'chat', description: 'New intelligence class', contextWindow: 270000, inputPricePer1m: 5.0, outputPricePer1m: 30.0, sortOrder: 6, capabilities: ['chat', 'vision', 'function_calling'] },
  // OpenAI - GPT-4o Series
  { providerCode: 'openai', name: 'GPT-4o', modelId: 'gpt-4o', modelType: 'chat', description: 'Latest multimodal', contextWindow: 128000, inputPricePer1m: 2.5, outputPricePer1m: 10.0, sortOrder: 7, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-4o Mini', modelId: 'gpt-4o-mini', modelType: 'chat', description: 'Fast affordable', contextWindow: 128000, inputPricePer1m: 0.15, outputPricePer1m: 0.6, sortOrder: 8, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-4.1', modelId: 'gpt-4.1', modelType: 'chat', description: 'Enhanced instruction', contextWindow: 128000, inputPricePer1m: 2.0, outputPricePer1m: 8.0, sortOrder: 9, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-4.1 mini', modelId: 'gpt-4.1-mini', modelType: 'chat', description: 'Compact', contextWindow: 128000, inputPricePer1m: 0.4, outputPricePer1m: 1.6, sortOrder: 10, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-4.1 nano', modelId: 'gpt-4.1-nano', modelType: 'chat', description: 'Budget', contextWindow: 128000, inputPricePer1m: 0.1, outputPricePer1m: 0.4, sortOrder: 11, capabilities: ['chat', 'function_calling'] },
  // OpenAI - o Series (Reasoning)
  { providerCode: 'openai', name: 'o1 Pro', modelId: 'o1-pro', modelType: 'reasoning', description: 'Most capable reasoning', contextWindow: 200000, inputPricePer1m: 15.0, outputPricePer1m: 60.0, sortOrder: 12, capabilities: ['reasoning', 'math', 'coding'] },
  { providerCode: 'openai', name: 'o3', modelId: 'o3', modelType: 'reasoning', description: 'Advanced reasoning', contextWindow: 200000, inputPricePer1m: 2.0, outputPricePer1m: 8.0, sortOrder: 13, capabilities: ['reasoning', 'math', 'coding'] },
  { providerCode: 'openai', name: 'o4-mini', modelId: 'o4-mini', modelType: 'reasoning', description: 'Compact reasoning', contextWindow: 100000, inputPricePer1m: 1.1, outputPricePer1m: 4.4, sortOrder: 14, capabilities: ['reasoning', 'math'] },
  // OpenAI - Legacy
  { providerCode: 'openai', name: 'GPT-4 Turbo', modelId: 'gpt-4-turbo', modelType: 'chat', description: 'Previous gen', contextWindow: 128000, inputPricePer1m: 10.0, outputPricePer1m: 30.0, sortOrder: 15, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-4', modelId: 'gpt-4', modelType: 'chat', description: 'Original', contextWindow: 8192, inputPricePer1m: 30.0, outputPricePer1m: 60.0, sortOrder: 16, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'openai', name: 'GPT-3.5 Turbo', modelId: 'gpt-3.5-turbo', modelType: 'chat', description: 'Fast affordable legacy', contextWindow: 16385, inputPricePer1m: 0.5, outputPricePer1m: 1.5, sortOrder: 17, capabilities: ['chat', 'function_calling'] },

  // Anthropic - Claude 4 Series
  { providerCode: 'anthropic', name: 'Claude Opus 4.7', modelId: 'claude-opus-4-7', modelType: 'chat', description: 'Most advanced', contextWindow: 200000, inputPricePer1m: 5.0, outputPricePer1m: 25.0, sortOrder: 1, capabilities: ['chat', 'vision', 'reasoning', 'coding'] },
  { providerCode: 'anthropic', name: 'Claude Opus 4.6', modelId: 'claude-opus-4-6', modelType: 'chat', description: 'Most capable', contextWindow: 200000, inputPricePer1m: 3.0, outputPricePer1m: 15.0, sortOrder: 2, capabilities: ['chat', 'vision', 'reasoning', 'coding'] },
  { providerCode: 'anthropic', name: 'Claude Sonnet 4.6', modelId: 'claude-sonnet-4-6', modelType: 'chat', description: 'Balanced for coding', contextWindow: 200000, inputPricePer1m: 3.0, outputPricePer1m: 15.0, sortOrder: 3, capabilities: ['chat', 'vision', 'coding'] },
  { providerCode: 'anthropic', name: 'Claude 4.5 Haiku', modelId: 'claude-4-5-haiku', modelType: 'chat', description: 'Fast high-volume', contextWindow: 200000, inputPricePer1m: 1.0, outputPricePer1m: 5.0, sortOrder: 4, capabilities: ['chat', 'vision'] },
  { providerCode: 'anthropic', name: 'Claude 4 Haiku', modelId: 'claude-4-haiku', modelType: 'chat', description: 'Fast affordable', contextWindow: 200000, inputPricePer1m: 0.25, outputPricePer1m: 1.25, sortOrder: 5, capabilities: ['chat', 'vision'] },
  // Anthropic - Claude 3 Series
  { providerCode: 'anthropic', name: 'Claude 3.5 Sonnet', modelId: 'claude-3-5-sonnet-20241022', modelType: 'chat', description: 'Most intelligent legacy', contextWindow: 200000, inputPricePer1m: 3.0, outputPricePer1m: 15.0, sortOrder: 6, capabilities: ['chat', 'vision'] },
  { providerCode: 'anthropic', name: 'Claude 3.5 Haiku', modelId: 'claude-3-5-haiku', modelType: 'chat', description: 'Fast affordable legacy', contextWindow: 200000, inputPricePer1m: 0.8, outputPricePer1m: 4.0, sortOrder: 7, capabilities: ['chat', 'vision'] },
  { providerCode: 'anthropic', name: 'Claude 3 Opus', modelId: 'claude-3-opus-20240229', modelType: 'chat', description: 'Most capable legacy', contextWindow: 200000, inputPricePer1m: 15.0, outputPricePer1m: 75.0, sortOrder: 8, capabilities: ['chat', 'vision'] },
  { providerCode: 'anthropic', name: 'Claude 3 Haiku', modelId: 'claude-3-haiku-20240307', modelType: 'chat', description: 'Fast legacy', contextWindow: 200000, inputPricePer1m: 0.8, outputPricePer1m: 4.0, sortOrder: 9, capabilities: ['chat', 'vision'] },

  // Google - Gemini 3 Series
  { providerCode: 'google', name: 'Gemini 3 Pro', modelId: 'gemini-3-pro', modelType: 'chat', description: 'Most capable', contextWindow: 2000000, inputPricePer1m: 2.0, outputPricePer1m: 12.0, sortOrder: 1, capabilities: ['chat', 'vision', 'function_calling', 'reasoning'] },
  { providerCode: 'google', name: 'Gemini 3 Flash', modelId: 'gemini-3-flash', modelType: 'chat', description: 'Fast high-volume', contextWindow: 1000000, inputPricePer1m: 0.5, outputPricePer1m: 3.0, sortOrder: 2, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'google', name: 'Gemini 3.1 Pro', modelId: 'gemini-3.1-pro', modelType: 'chat', description: 'Enhanced reasoning', contextWindow: 2000000, inputPricePer1m: 2.0, outputPricePer1m: 12.0, sortOrder: 3, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'google', name: 'Gemini 3.1 Flash-Lite', modelId: 'gemini-3.1-flash-lite', modelType: 'chat', description: 'Most affordable', contextWindow: 1000000, inputPricePer1m: 0.25, outputPricePer1m: 1.5, sortOrder: 4, capabilities: ['chat', 'function_calling'] },
  // Google - Gemini 2.5 Series
  { providerCode: 'google', name: 'Gemini 2.5 Pro', modelId: 'gemini-2.5-pro', modelType: 'chat', description: 'Premium long context', contextWindow: 2000000, inputPricePer1m: 1.25, outputPricePer1m: 10.0, sortOrder: 5, capabilities: ['chat', 'vision', 'function_calling', 'reasoning'] },
  { providerCode: 'google', name: 'Gemini 2.5 Flash', modelId: 'gemini-2.5-flash', modelType: 'chat', description: 'Fast affordable 2M', contextWindow: 1000000, inputPricePer1m: 0.3, outputPricePer1m: 2.5, sortOrder: 6, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'google', name: 'Gemini 2.5 Flash-Lite', modelId: 'gemini-2.5-flash-lite', modelType: 'chat', description: 'Budget high-volume', contextWindow: 1000000, inputPricePer1m: 0.1, outputPricePer1m: 0.4, sortOrder: 7, capabilities: ['chat', 'function_calling'] },
  // Google - Gemini 2.0 Series
  { providerCode: 'google', name: 'Gemini 2.0 Flash', modelId: 'gemini-2.0-flash', modelType: 'chat', description: 'Latest speed quality', contextWindow: 1000000, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 8, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'google', name: 'Gemini 2.0 Flash-Lite', modelId: 'gemini-2.0-flash-lite', modelType: 'chat', description: 'Budget simple tasks', contextWindow: 1000000, inputPricePer1m: 0.07, outputPricePer1m: 0.3, sortOrder: 9, capabilities: ['chat', 'function_calling'] },
  // Google - Gemini 1.5 Series (Legacy)
  { providerCode: 'google', name: 'Gemini 1.5 Pro', modelId: 'gemini-1.5-pro', modelType: 'chat', description: 'Long context legacy', contextWindow: 2000000, inputPricePer1m: 1.25, outputPricePer1m: 5.0, sortOrder: 10, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'google', name: 'Gemini 1.5 Flash', modelId: 'gemini-1.5-flash', modelType: 'chat', description: 'Fast multimodal legacy', contextWindow: 1000000, inputPricePer1m: 0.075, outputPricePer1m: 0.3, sortOrder: 11, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'google', name: 'Gemini 1.0 Pro', modelId: 'gemini-1.0-pro', modelType: 'chat', description: 'Balanced legacy', contextWindow: 30720, inputPricePer1m: 0.5, outputPricePer1m: 1.5, sortOrder: 12, capabilities: ['chat', 'vision'] },

  // Meta - Llama 4
  { providerCode: 'meta', name: 'Llama 4 Scout', modelId: 'llama-4-scout', modelType: 'chat', description: 'Most intelligent open', contextWindow: 1000000, inputPricePer1m: 0.15, outputPricePer1m: 0.15, sortOrder: 1, capabilities: ['chat', 'vision', 'function_calling'] },
  { providerCode: 'meta', name: 'Llama 4 Maverick', modelId: 'llama-4-maverick', modelType: 'chat', description: 'Balanced open', contextWindow: 1000000, inputPricePer1m: 0.2, outputPricePer1m: 0.2, sortOrder: 2, capabilities: ['chat', 'vision', 'function_calling'] },
  // Meta - Llama 3.1
  { providerCode: 'meta', name: 'Llama 3.1 405B', modelId: 'llama-3.1-405b', modelType: 'chat', description: 'Largest open-source', contextWindow: 128000, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 3, capabilities: ['chat'] },
  { providerCode: 'meta', name: 'Llama 3.1 70B', modelId: 'llama-3.1-70b', modelType: 'chat', description: '70B parameter', contextWindow: 128000, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 4, capabilities: ['chat'] },
  { providerCode: 'meta', name: 'Llama 3.1 8B', modelId: 'llama-3.1-8b', modelType: 'chat', description: 'Compact efficient', contextWindow: 128000, inputPricePer1m: 0.18, outputPricePer1m: 0.18, sortOrder: 5, capabilities: ['chat'] },
  // Meta - Llama 3 (Legacy)
  { providerCode: 'meta', name: 'Llama 3 70B', modelId: 'llama-3-70b', modelType: 'chat', description: 'Previous gen', contextWindow: 8192, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 6, capabilities: ['chat'] },
  { providerCode: 'meta', name: 'Llama 3 8B', modelId: 'llama-3-8b', modelType: 'chat', description: 'Compact legacy', contextWindow: 8192, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 7, capabilities: ['chat'] },

  // DeepSeek
  { providerCode: 'deepseek', name: 'DeepSeek V3.2', modelId: 'deepseek-chat-v3-2', modelType: 'chat', description: 'Latest with reasoning', contextWindow: 128000, inputPricePer1m: 0.28, outputPricePer1m: 0.42, sortOrder: 1, capabilities: ['chat', 'function_calling', 'reasoning'] },
  { providerCode: 'deepseek', name: 'DeepSeek V3', modelId: 'deepseek-chat-v3', modelType: 'chat', description: 'Latest chat legacy', contextWindow: 64000, inputPricePer1m: 0.27, outputPricePer1m: 1.1, sortOrder: 2, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'deepseek', name: 'DeepSeek R1', modelId: 'deepseek-reasoner-v2', modelType: 'reasoning', description: 'Advanced CoT reasoning', contextWindow: 128000, inputPricePer1m: 0.55, outputPricePer1m: 2.19, sortOrder: 3, capabilities: ['reasoning', 'math', 'coding'] },
  { providerCode: 'deepseek', name: 'DeepSeek R1 0528', modelId: 'deepseek-r1-0528', modelType: 'reasoning', description: 'Optimized reasoning', contextWindow: 128000, inputPricePer1m: 0.29, outputPricePer1m: 2.5, sortOrder: 4, capabilities: ['reasoning', 'math'] },
  { providerCode: 'deepseek', name: 'DeepSeek V3.2 Cached', modelId: 'deepseek-chat-v3-2-cached', modelType: 'chat', description: '90% off caching', contextWindow: 128000, inputPricePer1m: 0.028, outputPricePer1m: 0.42, sortOrder: 5, capabilities: ['chat'] },

  // xAI
  { providerCode: 'xai', name: 'Grok 4.20', modelId: 'grok-4-20', modelType: 'chat', description: 'Most capable real-time', contextWindow: 131072, inputPricePer1m: 2.0, outputPricePer1m: 6.0, sortOrder: 1, capabilities: ['chat', 'vision', 'real_time', 'reasoning'] },
  { providerCode: 'xai', name: 'Grok 4.1 Fast', modelId: 'grok-4-1-fast', modelType: 'chat', description: 'Fast 2M context', contextWindow: 131072, inputPricePer1m: 0.2, outputPricePer1m: 0.5, sortOrder: 2, capabilities: ['chat', 'real_time'] },
  { providerCode: 'xai', name: 'Grok-2', modelId: 'grok-2', modelType: 'chat', description: 'Latest legacy', contextWindow: 131072, inputPricePer1m: 5.0, outputPricePer1m: 15.0, sortOrder: 3, capabilities: ['chat', 'vision', 'real_time'] },
  { providerCode: 'xai', name: 'Grok-2 Mini', modelId: 'grok-2-mini', modelType: 'chat', description: 'Smaller faster', contextWindow: 131072, inputPricePer1m: 0.5, outputPricePer1m: 1.5, sortOrder: 4, capabilities: ['chat', 'real_time'] },
  { providerCode: 'xai', name: 'Grok-1', modelId: 'grok-1', modelType: 'chat', description: 'Original open', contextWindow: 8192, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 5, capabilities: ['chat'] },

  // Mistral AI - Large
  { providerCode: 'mistral', name: 'Mistral Large 3', modelId: 'mistral-large-3', modelType: 'chat', description: 'Most capable', contextWindow: 128000, inputPricePer1m: 2.0, outputPricePer1m: 6.0, sortOrder: 1, capabilities: ['chat', 'function_calling', 'coding'] },
  { providerCode: 'mistral', name: 'Mistral Large 2', modelId: 'mistral-large-2', modelType: 'chat', description: 'Previous gen', contextWindow: 128000, inputPricePer1m: 2.0, outputPricePer1m: 6.0, sortOrder: 2, capabilities: ['chat', 'function_calling'] },
  // Mistral AI - Medium
  { providerCode: 'mistral', name: 'Mistral Medium 3', modelId: 'mistral-medium-3', modelType: 'chat', description: 'Balanced production', contextWindow: 128000, inputPricePer1m: 0.4, outputPricePer1m: 2.0, sortOrder: 3, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'mistral', name: 'Mistral Medium 3.1', modelId: 'mistral-medium-3-1', modelType: 'chat', description: 'Enhanced', contextWindow: 128000, inputPricePer1m: 0.4, outputPricePer1m: 2.0, sortOrder: 4, capabilities: ['chat', 'function_calling'] },
  // Mistral AI - Small
  { providerCode: 'mistral', name: 'Mistral Small 3.2', modelId: 'mistral-small-3-2', modelType: 'chat', description: 'Best budget $0.06/M', contextWindow: 128000, inputPricePer1m: 0.06, outputPricePer1m: 0.18, sortOrder: 5, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'mistral', name: 'Mistral Small 3.1 24B', modelId: 'mistral-small-3-1-24b', modelType: 'chat', description: 'Open budget', contextWindow: 128000, inputPricePer1m: 0.04, outputPricePer1m: 0.04, sortOrder: 6, capabilities: ['chat'] },
  { providerCode: 'mistral', name: 'Mistral Small 4', modelId: 'mistral-small-4', modelType: 'chat', description: 'Latest open', contextWindow: 128000, inputPricePer1m: 0.1, outputPricePer1m: 0.3, sortOrder: 7, capabilities: ['chat', 'function_calling'] },
  // Mistral AI - Ministral (Edge)
  { providerCode: 'mistral', name: 'Ministral 3B', modelId: 'ministral-3-3b', modelType: 'chat', description: 'Edge lowest $0.02/M', contextWindow: 32000, inputPricePer1m: 0.04, outputPricePer1m: 0.04, sortOrder: 8, capabilities: ['chat'] },
  { providerCode: 'mistral', name: 'Ministral 8B', modelId: 'ministral-3-8b', modelType: 'chat', description: 'Edge higher cap', contextWindow: 32000, inputPricePer1m: 0.04, outputPricePer1m: 0.04, sortOrder: 9, capabilities: ['chat'] },
  { providerCode: 'mistral', name: 'Ministral 14B', modelId: 'ministral-3-14b', modelType: 'chat', description: 'Edge max cap', contextWindow: 32000, inputPricePer1m: 0.04, outputPricePer1m: 0.04, sortOrder: 10, capabilities: ['chat'] },
  // Mistral AI - Codestral
  { providerCode: 'mistral', name: 'Codestral', modelId: 'codestral', modelType: 'chat', description: 'Code specialized', contextWindow: 32000, inputPricePer1m: 0.2, outputPricePer1m: 0.6, sortOrder: 11, capabilities: ['chat', 'coding'] },
  { providerCode: 'mistral', name: 'Codestral 2508', modelId: 'codestral-2508', modelType: 'chat', description: 'Latest code gen', contextWindow: 32000, inputPricePer1m: 0.3, outputPricePer1m: 0.9, sortOrder: 12, capabilities: ['chat', 'coding'] },
  // Mistral AI - Vision & Open
  { providerCode: 'mistral', name: 'Pixtral Large', modelId: 'pixtral-large', modelType: 'vision', description: 'Vision model', contextWindow: 128000, inputPricePer1m: 2.0, outputPricePer1m: 6.0, sortOrder: 13, capabilities: ['vision', 'chat'] },
  { providerCode: 'mistral', name: 'Mistral Nemo', modelId: 'mistral-nemo', modelType: 'chat', description: 'Open 12B', contextWindow: 32768, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 14, capabilities: ['chat'] },
  { providerCode: 'mistral', name: 'Mistral 7B', modelId: 'mistral-7b', modelType: 'chat', description: 'Classic open', contextWindow: 32768, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 15, capabilities: ['chat'] },
  { providerCode: 'mistral', name: 'Mixtral 8x7B', modelId: 'mixtral-8x7b', modelType: 'chat', description: 'MoE open', contextWindow: 32768, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 16, capabilities: ['chat'] },
  { providerCode: 'mistral', name: 'Mixtral 8x22B', modelId: 'mixtral-8x22b', modelType: 'chat', description: 'Larger MoE', contextWindow: 65536, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 17, capabilities: ['chat'] },

  // Cohere
  { providerCode: 'cohere', name: 'Command R7B', modelId: 'command-r7b', modelType: 'chat', description: 'Cheapest $0.0375/M', contextWindow: 128000, inputPricePer1m: 0.0375, outputPricePer1m: 0.15, sortOrder: 1, capabilities: ['chat', 'function_calling', 'RAG'] },
  { providerCode: 'cohere', name: 'Command R+', modelId: 'command-r-plus', modelType: 'chat', description: 'Most capable', contextWindow: 128000, inputPricePer1m: 2.5, outputPricePer1m: 10.0, sortOrder: 2, capabilities: ['chat', 'function_calling', 'RAG'] },
  { providerCode: 'cohere', name: 'Command R', modelId: 'command-r', modelType: 'chat', description: 'Balanced', contextWindow: 128000, inputPricePer1m: 0.5, outputPricePer1m: 1.5, sortOrder: 3, capabilities: ['chat', 'RAG'] },
  { providerCode: 'cohere', name: 'Command A', modelId: 'command-a', modelType: 'chat', description: 'Enterprise', contextWindow: 128000, inputPricePer1m: 2.5, outputPricePer1m: 10.0, sortOrder: 4, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'cohere', name: 'Embed v3', modelId: 'embed-english-v3', modelType: 'embedding', description: 'Embeddings', contextWindow: 512, inputPricePer1m: 0.1, outputPricePer1m: 0.0, sortOrder: 5, capabilities: ['embedding'] },
  { providerCode: 'cohere', name: 'Rerank v3', modelId: 'rerank-english-v3', modelType: 'text', description: 'Reranking', contextWindow: 4096, inputPricePer1m: 1.0, outputPricePer1m: 0.0, sortOrder: 6, capabilities: ['reranking'] },

  // Qwen
  { providerCode: 'qwen', name: 'Qwen 3', modelId: 'qwen3-72b-chat', modelType: 'chat', description: 'Latest reasoning', contextWindow: 32768, inputPricePer1m: 0.6, outputPricePer1m: 1.8, sortOrder: 1, capabilities: ['chat', 'function_calling', 'reasoning'] },
  { providerCode: 'qwen', name: 'Qwen 2.5', modelId: 'qwen2.5-72b-chat', modelType: 'chat', description: 'Previous gen', contextWindow: 32768, inputPricePer1m: 0.6, outputPricePer1m: 1.8, sortOrder: 2, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'qwen', name: 'Qwen 2.5 Coder', modelId: 'qwen2.5-coder-32b', modelType: 'chat', description: 'Code specialized', contextWindow: 32768, inputPricePer1m: 0.4, outputPricePer1m: 1.2, sortOrder: 3, capabilities: ['chat', 'coding'] },
  { providerCode: 'qwen', name: 'Qwen VL', modelId: 'qwen-vl-max', modelType: 'vision', description: 'Vision', contextWindow: 8192, inputPricePer1m: 0.6, outputPricePer1m: 2.0, sortOrder: 4, capabilities: ['chat', 'vision'] },
  { providerCode: 'qwen', name: 'Qwen Math', modelId: 'qwen2-math-72b', modelType: 'chat', description: 'Math specialized', contextWindow: 32768, inputPricePer1m: 0.6, outputPricePer1m: 2.0, sortOrder: 5, capabilities: ['chat', 'math'] },

  // GLM
  { providerCode: 'glm', name: 'GLM-4', modelId: 'glm-4', modelType: 'chat', description: 'Latest', contextWindow: 128000, inputPricePer1m: 0.1, outputPricePer1m: 0.3, sortOrder: 1, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'glm', name: 'GLM-4 Plus', modelId: 'glm-4-plus', modelType: 'chat', description: 'Enhanced quality', contextWindow: 128000, inputPricePer1m: 0.2, outputPricePer1m: 0.6, sortOrder: 2, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'glm', name: 'GLM-4V', modelId: 'glm-4v', modelType: 'vision', description: 'Vision', contextWindow: 8192, inputPricePer1m: 0.1, outputPricePer1m: 0.3, sortOrder: 3, capabilities: ['chat', 'vision'] },
  { providerCode: 'glm', name: 'ChatGLM-4', modelId: 'chatglm-4', modelType: 'chat', description: 'Chat optimized', contextWindow: 128000, inputPricePer1m: 0.1, outputPricePer1m: 0.3, sortOrder: 4, capabilities: ['chat'] },
  { providerCode: 'glm', name: 'ChatGLM-3', modelId: 'chatglm-3', modelType: 'chat', description: 'Previous gen', contextWindow: 32768, inputPricePer1m: 0.05, outputPricePer1m: 0.15, sortOrder: 5, capabilities: ['chat'] },

  // Kimi
  { providerCode: 'kimi', name: 'Kimi 1M', modelId: 'moonshot-v1-128k', modelType: 'chat', description: '128K context', contextWindow: 128000, inputPricePer1m: 0.12, outputPricePer1m: 0.12, sortOrder: 1, capabilities: ['chat', 'long_context'] },
  { providerCode: 'kimi', name: 'Kimi Pro', modelId: 'moonshot-v1-32k', modelType: 'chat', description: '32K context', contextWindow: 32768, inputPricePer1m: 0.12, outputPricePer1m: 0.12, sortOrder: 2, capabilities: ['chat'] },
  { providerCode: 'kimi', name: 'Kimi Vision', modelId: 'moonshot-v1-vision', modelType: 'vision', description: 'With vision', contextWindow: 16384, inputPricePer1m: 0.12, outputPricePer1m: 0.12, sortOrder: 3, capabilities: ['chat', 'vision'] },

  // MiniMax
  { providerCode: 'minimax', name: 'MiniMax Text-01', modelId: 'abab6.5s-chat', modelType: 'chat', description: 'Large language', contextWindow: 245760, inputPricePer1m: 0.01, outputPricePer1m: 0.1, sortOrder: 1, capabilities: ['chat'] },
  { providerCode: 'minimax', name: 'MiniMax Speech-02', modelId: 'speech-02-hd', modelType: 'chat', description: 'Speech synthesis', contextWindow: 0, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 2, capabilities: ['speech'] },

  // Groq
  { providerCode: 'groq', name: 'Llama 4 Scout', modelId: 'llama-4-scout-groq', modelType: 'chat', description: 'Fastest Llama', contextWindow: 1000000, inputPricePer1m: 0.11, outputPricePer1m: 0.34, sortOrder: 1, capabilities: ['chat', 'vision'] },
  { providerCode: 'groq', name: 'Llama 4 Maverick', modelId: 'llama-4-maverick-groq', modelType: 'chat', description: 'Fast Maverick', contextWindow: 1000000, inputPricePer1m: 0.2, outputPricePer1m: 0.6, sortOrder: 2, capabilities: ['chat', 'vision'] },
  { providerCode: 'groq', name: 'DeepSeek R1', modelId: 'deepseek-r1-groq', modelType: 'reasoning', description: 'Fastest reasoning', contextWindow: 128000, inputPricePer1m: 0.75, outputPricePer1m: 0.99, sortOrder: 3, capabilities: ['reasoning', 'math'] },
  { providerCode: 'groq', name: 'Llama 3.1 8B', modelId: 'llama-3.1-8b-instant-groq', modelType: 'chat', description: 'Fastest 840 tok/s', contextWindow: 128000, inputPricePer1m: 0.05, outputPricePer1m: 0.08, sortOrder: 4, capabilities: ['chat'] },

  // Perplexity
  { providerCode: 'perplexity', name: 'Sonar Pro', modelId: 'sonar-pro', modelType: 'chat', description: 'Most capable', contextWindow: 200000, inputPricePer1m: 3.0, outputPricePer1m: 15.0, sortOrder: 1, capabilities: ['chat', 'real_time', 'search'] },
  { providerCode: 'perplexity', name: 'Sonar', modelId: 'sonar', modelType: 'chat', description: 'Standard', contextWindow: 128000, inputPricePer1m: 1.0, outputPricePer1m: 1.0, sortOrder: 2, capabilities: ['chat', 'real_time', 'search'] },

  // Together AI
  { providerCode: 'together', name: 'Llama 4 Maverick', modelId: 'together-llama-4-maverick', modelType: 'chat', description: 'Meta via Together', contextWindow: 1000000, inputPricePer1m: 0.3, outputPricePer1m: 0.9, sortOrder: 1, capabilities: ['chat', 'vision'] },
  { providerCode: 'together', name: 'DeepSeek V3', modelId: 'together-deepseek-v3', modelType: 'chat', description: 'DeepSeek via Together', contextWindow: 128000, inputPricePer1m: 0.3, outputPricePer1m: 0.9, sortOrder: 2, capabilities: ['chat', 'reasoning'] },
  { providerCode: 'together', name: 'Mistral Large 3', modelId: 'together-mistral-large-3', modelType: 'chat', description: 'Mistral via Together', contextWindow: 128000, inputPricePer1m: 3.0, outputPricePer1m: 9.0, sortOrder: 3, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'together', name: 'Qwen 2.5', modelId: 'together-qwen-2.5-72b', modelType: 'chat', description: 'Qwen via Together', contextWindow: 32768, inputPricePer1m: 1.2, outputPricePer1m: 1.2, sortOrder: 4, capabilities: ['chat'] },
  { providerCode: 'together', name: 'Mixtral 8x22B', modelId: 'together-mixtral-8x22b', modelType: 'chat', description: 'Mixtral MoE', contextWindow: 65536, inputPricePer1m: 1.0, outputPricePer1m: 1.0, sortOrder: 5, capabilities: ['chat'] },

  // AI21 Labs
  { providerCode: 'ai21', name: 'Jamba 2 Large', modelId: 'jamba-2-large', modelType: 'chat', description: 'Most capable', contextWindow: 256000, inputPricePer1m: 2.0, outputPricePer1m: 8.0, sortOrder: 1, capabilities: ['chat', 'function_calling'] },
  { providerCode: 'ai21', name: 'Jamba 2 Mini', modelId: 'jamba-2-mini', modelType: 'chat', description: 'Budget friendly', contextWindow: 128000, inputPricePer1m: 0.2, outputPricePer1m: 0.4, sortOrder: 2, capabilities: ['chat'] },

  // Baidu
  { providerCode: 'baidu', name: 'ERNIE 4.5 VL', modelId: 'ernie-4.5-vl', modelType: 'vision', description: 'Vision Chinese', contextWindow: 16384, inputPricePer1m: 0.28, outputPricePer1m: 1.25, sortOrder: 1, capabilities: ['chat', 'vision'] },
  { providerCode: 'baidu', name: 'ERNIE 4.0', modelId: 'ernie-4.0', modelType: 'chat', description: 'Flagship', contextWindow: 8192, inputPricePer1m: 0.5, outputPricePer1m: 2.0, sortOrder: 2, capabilities: ['chat'] },

  // Xiaomi
  { providerCode: 'xiaomi', name: 'MiLM-2', modelId: 'milm-2-8b-chat', modelType: 'chat', description: '2nd gen', contextWindow: 32768, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 1, capabilities: ['chat'] },
  { providerCode: 'xiaomi', name: 'MiLM-1', modelId: 'milm-1-8b-chat', modelType: 'chat', description: '8B param', contextWindow: 8192, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 2, capabilities: ['chat'] },

  // Tencent
  { providerCode: 'tencent', name: 'Hunyuan', modelId: 'hunyuan-pro', modelType: 'chat', description: 'Flagship', contextWindow: 128000, inputPricePer1m: 0.5, outputPricePer1m: 1.5, sortOrder: 1, capabilities: ['chat', 'function_calling'] },

  // ByteDance
  { providerCode: 'bytedance', name: 'Doubao Pro', modelId: 'doubao-pro', modelType: 'chat', description: 'AI assistant', contextWindow: 256000, inputPricePer1m: 0.3, outputPricePer1m: 0.9, sortOrder: 1, capabilities: ['chat'] },
  { providerCode: 'bytedance', name: 'Doubao Lite', modelId: 'doubao-lite', modelType: 'chat', description: 'Budget', contextWindow: 256000, inputPricePer1m: 0.05, outputPricePer1m: 0.2, sortOrder: 2, capabilities: ['chat'] },

  // Hugging Face
  { providerCode: 'huggingface', name: 'Inference API', modelId: 'inference-endpoint', modelType: 'chat', description: '200+ open models', contextWindow: 0, inputPricePer1m: 0.03, outputPricePer1m: 0.03, sortOrder: 1, capabilities: ['chat', 'vision', 'embedding'] },

  // Stability AI
  { providerCode: 'stability', name: 'Stable LM 3', modelId: 'stable-lm-3', modelType: 'chat', description: 'Open chat', contextWindow: 8192, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 1, capabilities: ['chat'] },

  // Replicate
  { providerCode: 'replicate', name: 'API Platform', modelId: 'replicate-api', modelType: 'chat', description: 'Open models API', contextWindow: 0, inputPricePer1m: 0.0, outputPricePer1m: 0.0, sortOrder: 1, capabilities: ['chat', 'vision', 'coding'] },
];

export async function seedAiModels(
  db: DatabaseService,
  encryption: EncryptionService,
): Promise<void> {
  console.log('Seeding AI providers...');

  const providerIds: Record<string, string> = {};
  for (const provider of PROVIDERS_SEED) {
    const id = generateUUID();
    providerIds[provider.code] = id;

    await db.query(
      `INSERT INTO ai_providers (id, name, code, logo_url, website_url, description, sort_order, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
       ON CONFLICT (code) DO NOTHING`,
      [id, provider.name, provider.code, provider.logoUrl || null, provider.websiteUrl || null, provider.description, provider.sortOrder],
    );
  }

  console.log('Seeding AI models...');

  for (const model of MODELS_SEED) {
    const providerId = providerIds[model.providerCode];
    if (!providerId) { console.warn(`Provider not found: ${model.providerCode}`); continue; }

    const id = generateUUID();
    await db.query(
      `INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, NOW(), NOW())
       ON CONFLICT (provider_id, model_id) DO NOTHING`,
      [id, providerId, model.name, model.modelId, model.modelType, model.description || null, model.contextWindow || null, model.inputPricePer1m || null, model.outputPricePer1m || null, model.sortOrder, model.capabilities ? JSON.stringify(model.capabilities) : null],
    );
  }

  console.log(`Seeded ${PROVIDERS_SEED.length} providers and ${MODELS_SEED.length} models`);
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
