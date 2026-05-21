import { create } from 'zustand';
import { lingqiService } from '../services/lingqi-service';
import type {
  LingqiEstimate,
  LingqiEstimateRequest,
  LingqiLedgerEntry,
  LingqiModel,
  LingqiStatus,
} from '../services/lingqi-service';

const FALLBACK_ERROR_MESSAGE = '灵气阁暂不可用，请稍后再试。';

export interface LingqiState {
  status: LingqiStatus | null;
  models: LingqiModel[];
  ledger: LingqiLedgerEntry[];
  selectedModel: LingqiModel | null;
  estimate: LingqiEstimate | null;
  isLoading: boolean;
  error: string | null;
  loadLingqi: (teamId: string) => Promise<void>;
  redeemCode: (teamId: string, code: string) => Promise<number>;
  selectModel: (teamId: string, modelId: string, conversationId?: string) => Promise<void>;
  estimateCost: (teamId: string, request: LingqiEstimateRequest) => Promise<LingqiEstimate>;
  refreshStatus: (teamId: string) => Promise<void>;
  clearEstimate: () => void;
  clearError: () => void;
  clearSelectedModel: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return FALLBACK_ERROR_MESSAGE;
}

function getSelectedModel(models: LingqiModel[], currentModel: LingqiModel | null): LingqiModel | null {
  if (currentModel) {
    const refreshedModel = models.find((model) => model.id === currentModel.id && model.isAvailable);
    return refreshedModel ?? null;
  }

  return models.find((model) => model.isAvailable) ?? null;
}

export const useLingqiStore = create<LingqiState>((set, get) => ({
  status: null,
  models: [],
  ledger: [],
  selectedModel: null,
  estimate: null,
  isLoading: false,
  error: null,

  loadLingqi: async (teamId) => {
    set({ isLoading: true, error: null });

    try {
      const [status, models, ledger] = await Promise.all([
        lingqiService.getStatus(teamId),
        lingqiService.getModelCatalog(teamId),
        lingqiService.getLedger(teamId),
      ]);

      set({
        status,
        models,
        ledger,
        selectedModel: getSelectedModel(models, get().selectedModel),
        isLoading: false,
      });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  redeemCode: async (teamId, code) => {
    set({ isLoading: true, error: null });

    try {
      const result = await lingqiService.redeem(teamId, code);
      set({
        status: result.status,
        isLoading: false,
      });

      try {
        const ledger = await lingqiService.getLedger(teamId);
        set({ ledger });
      } catch {
        set({ ledger: get().ledger });
      }

      return result.grantedAmount;
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  selectModel: async (teamId, modelId, conversationId) => {
    set({ error: null });

    try {
      const selectedModel = await lingqiService.selectModel(teamId, modelId, conversationId);
      if (!conversationId) {
        set({ selectedModel });
      }
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
      throw error;
    }
  },

  estimateCost: async (teamId, request) => {
    set({ error: null });

    try {
      const estimate = await lingqiService.estimate(teamId, request);
      set({ estimate });
      return estimate;
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
      throw error;
    }
  },

  refreshStatus: async (teamId) => {
    set({ error: null });

    try {
      const [status, ledger] = await Promise.all([
        lingqiService.getStatus(teamId),
        lingqiService.getLedger(teamId),
      ]);
      set({ status, ledger });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
      throw error;
    }
  },

  clearEstimate: () => set({ estimate: null }),

  clearError: () => set({ error: null }),

  clearSelectedModel: () => set({ selectedModel: null, estimate: null }),
}));
