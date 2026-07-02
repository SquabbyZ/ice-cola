// Slice 2026-07-02-gateway-split-foundation: shared types for the gateway service and its cluster services.
// Slice 2026-07-02-gateway-gateway-split-foundation: gateway-side message + hermes param interfaces
// (moved from gateway.gateway.ts to centralize inbound payload shapes).
import { WebSocket } from 'ws';

export interface HermesAttachmentParams {
  type: string;
  name: string;
  mimeType: string;
  data?: string;
}

export interface HermesSendParams {
  sessionId: string;
  message: string;
  conversationId?: string;
  expertId?: string;
  model?: string;
  messageId?: string;
  skillIds?: string[];
  mcpServerIds?: string[];
  extensionIds?: string[];
  attachments?: HermesAttachmentParams[];
}

export interface GatewayMessage {
  type: 'req' | 'resp' | 'res' | 'evt' | 'event';
  id?: string;
  method?: string;
  params?: any;
  result?: any;
  payload?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  event?: string;
  data?: any;
  ok?: boolean;
}

export interface ConnectParams {
  minProtocol?: number;
  maxProtocol?: number;
  client?: {
    id?: string;
    displayName?: string;
    version?: string;
    platform?: string;
    mode?: string;
  };
  auth?: {
    token?: string;
  };
  scopes?: string[];
}

export interface ConnectResult {
  ok: boolean;
  protocol: number;
  expiresAt: number;
  user?: {
    id: string;
    email: string;
    name: string;
    team?: {
      id: string;
      name: string;
      role: string;
    };
  };
  token?: string;
}

export interface GatewayJwtPayload {
  sub?: string;
  teamId?: string;
  role?: string;
  type?: string;
  exp?: number;
}

export interface HermesMCPServer {
  name: string;
  type: string;
  config: Record<string, unknown>;
}

export interface ConversationMcpServerRow {
  name: string;
  server_type?: string | null;
  config?: Record<string, unknown> | null;
}

export interface ExtensionContextRow {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  instructions?: string | null;
}

export type HermesMessageContent = string | Array<{
  type: string;
  text?: string;
  image_url?: { url: string };
}>;

export interface HermesChatMessage {
  role: string;
  content: HermesMessageContent;
}

export interface HermesChatRequestBody {
  model: string;
  messages: HermesChatMessage[];
  stream: boolean;
  system?: string;
  mcp_servers?: HermesMCPServer[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface ProviderStreamChunk {
  type?: unknown;
  error?: unknown;
  choices?: Array<{
    delta?: {
      content?: unknown;
      tool_calls?: unknown;
    };
  }>;
  delta?: {
    type?: unknown;
    text?: unknown;
  };
  usage?: {
    total_tokens?: unknown;
    output_tokens?: unknown;
  };
  message?: {
    usage?: {
      input_tokens?: unknown;
      output_tokens?: unknown;
    };
  };
}

export interface HermesMessageParams {
  sessionId: string;
  message: string;
  userId?: string;
  teamId?: string;
  role?: string;
  conversationId?: string;
  expertId?: string;
  model?: string;
  messageId?: string;
  skillIds?: string[];
  mcpServerIds?: string[];
  extensionIds?: string[];
  attachments?: Array<{ type: string; name: string; mimeType: string; data?: string }>;
}

export interface HermesSendResult {
  ok: boolean;
  messageId: string;
  error?: string;
  aborted?: boolean;
}

export interface LingqiChargeDecision {
  charge: { amount: number; modelId?: string; billingId: string };
  billingId: string;
  executionModelName?: string;
}

export interface ActiveStreamEntry {
  ws?: WebSocket;
  stream: { destroy?: () => void };
  aborted: boolean;
  hasBillableOutput: boolean;
  prepaid?: {
    params: HermesMessageParams;
    charge: { amount: number; modelId?: string; billingId: string };
  };
}

export interface ProviderModelRow {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_code?: string | null;
  model_id: string;
  temperature?: number | null;
  max_tokens?: number | null;
  top_p?: number | null;
}

export interface HermesAgentProviderOverride {
  baseUrl: string;
  apiKey: string;
  authStyle: 'x-api-key' | 'bearer';
  modelId: string;
  providerCode: string;
}

export interface ConversationPromptMessage {
  role: string;
  content: HermesMessageContent;
}

export interface GenerateConfigParams {
  type: 'expert' | 'skill';
  description: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  teamId: string;
  userId: string;
}
