import { create } from 'zustand';

interface GenerationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIGenerationState {
  messages: GenerationMessage[];
  isGenerating: boolean;
  currentStreamId: string | null;
  streamContent: string;
  parsedConfig: Record<string, unknown> | null;
  error: string | null;
  addUserMessage: (msg: string) => void;
  appendDelta: (delta: string) => void;
  setStreamId: (id: string) => void;
  setFinalConfig: (config: Record<string, unknown>) => void;
  setError: (error: string) => void;
  setIsGenerating: (val: boolean) => void;
  reset: () => void;
}

const initialState = {
  messages: [] as GenerationMessage[],
  isGenerating: false,
  currentStreamId: null,
  streamContent: '',
  parsedConfig: null,
  error: null,
};

function extractJson(text: string): Record<string, unknown> | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const useAIGenerationStore = create<AIGenerationState>((set) => ({
  ...initialState,

  addUserMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { role: 'user', content: msg }],
    })),

  appendDelta: (delta) =>
    set((s) => {
      const newContent = s.streamContent + delta;
      const parsed = extractJson(newContent);
      return {
        streamContent: newContent,
        parsedConfig: parsed,
      };
    }),

  setStreamId: (id) => set({ currentStreamId: id }),

  setFinalConfig: (config) =>
    set((s) => ({
      parsedConfig: config,
      messages: [
        ...s.messages,
        { role: 'assistant', content: s.streamContent },
      ],
      streamContent: '',
      isGenerating: false,
      currentStreamId: null,
    })),

  setError: (error) =>
    set({
      error,
      isGenerating: false,
      currentStreamId: null,
    }),

  setIsGenerating: (val) => set({ isGenerating: val }),

  reset: () => set(initialState),
}));
