import { useChatStore, type Attachment } from '@/stores/chat';
import { formatLingqiAmount } from '@/lib/lingqi';

export { formatLingqiAmount };

export interface StreamContext {
  conversationId?: string;
  teamId: string;
  expertId?: string;
  mcpServerIds: string[];
  skillIds: string[];
  extensionIds: string[];
  modelId?: string;
  content: string;
  attachments: Attachment[];
}

export interface LocationState {
  presetMessage?: string;
}

export interface HermesMessageEvent {
  messageId?: string;
  runId?: string;
}

export interface HermesDeltaEvent extends HermesMessageEvent {
  delta?: string;
}

export interface HermesFinalEvent extends HermesMessageEvent {
  content?: string;
}

export interface HermesErrorEvent extends HermesMessageEvent {
  error?: string;
}

export interface HermesToolEvent extends HermesMessageEvent {
  toolCallId: string;
  toolName: string;
  input?: string;
  output?: string;
  imageUrl?: string;
  status?: 'running' | 'complete' | 'error';
}

export type CapabilityTarget = 'model' | 'expert' | 'mcp' | 'skills' | 'plugins' | 'attach';

export const COMPACT_CHAT_MEDIA_QUERY = '(max-width: 1180px), (max-height: 700px)';
export const LINGQI_ESTIMATE_DEBOUNCE_MS = 250;

const CAPABILITY_SELECTOR_TRIGGERS: Record<Exclude<CapabilityTarget, 'attach'>, string> = {
  model: '[data-chat-selector-trigger="model"]',
  expert: '[data-chat-selector-trigger="expert"]',
  mcp: '[data-chat-selector-trigger="mcp"]',
  skills: '[data-chat-selector-trigger="skills"]',
  plugins: '[data-chat-selector-trigger="plugins"]',
};

export function getCapabilitySelectorTrigger(target: CapabilityTarget): string | null {
  if (target === 'attach') return null;
  return CAPABILITY_SELECTOR_TRIGGERS[target];
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function appendLocalErrorMessage(content: string): void {
  useChatStore.getState().addMessage({
    id: crypto.randomUUID(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
    status: 'error',
  });
}

export function lingqiNotChargedMessage(reason: string, suffix: string): string {
  return `${reason}${suffix}`;
}

export function generateTitle(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 20) return trimmed;
  return `${trimmed.slice(0, 20)}...`;
}
