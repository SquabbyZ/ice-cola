import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

export type LingqiTransactionType = 'chat_message' | 'tool_call' | 'expert_skill' | 'background_task';
export type LingqiLedgerDirection = 'grant' | 'consume';

export interface LingqiLedgerEntry {
  id: string;
  direction: LingqiLedgerDirection;
  amount: number;
  transactionType: string;
  sourceType: string;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date | string;
}

export interface CultivationRealm {
  name: string;
  displayName: string;
  minTotalConsumed: number;
  sortOrder: number;
  privileges: Record<string, unknown>;
}

export interface LingqiSubscription {
  planName: string;
  displayName: string;
  level: number;
  costDiscountRate: number;
  modelRankLimit: number;
  expiresAt: Date | string | null;
}

export interface LingqiStatus {
  teamId: string;
  balance: number;
  totalGranted: number;
  totalConsumed: number;
  cultivationRealm?: CultivationRealm;
  nextCultivationRealm?: CultivationRealm | null;
  subscription: LingqiSubscription;
  realmProgress: {
    current: number;
    required: number;
    percentage: number;
  };
  warningThreshold?: number;
}

export interface LingqiModel {
  id: string;
  modelName: string;
  displayName: string;
  description: string | null;
  rank: number;
  costMultiplier: number;
  requiredPlanLevel: number;
  isAvailable: boolean;
  unavailableReason: 'SUBSCRIPTION_REQUIRED' | null;
}

export interface LingqiEstimateRequest {
  transactionType: LingqiTransactionType;
  modelId?: string;
  toolComplexity?: 'light' | 'medium' | 'heavy';
  taskPhase?: 'create' | 'execute' | 'artifact';
  context?: Record<string, unknown>;
}

export interface LingqiEstimate {
  estimatedCost: number;
  balanceAfterEstimate?: number;
  canAfford: boolean;
  reason?: 'SUBSCRIPTION_REQUIRED' | 'LINGQI_INSUFFICIENT_BALANCE' | null;
  model?: LingqiModel;
  subscription?: LingqiSubscription;
}

export interface LingqiRedeemResult {
  grantedAmount: number;
  status: LingqiStatus;
}

export class LingqiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getStatus(teamId: string): Promise<LingqiStatus> {
    const response = await axios.get(`${API_BASE}/teams/${encodePathSegment(teamId)}/quota/status`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getLedger(teamId: string): Promise<LingqiLedgerEntry[]> {
    const response = await axios.get(`${API_BASE}/teams/${encodePathSegment(teamId)}/quota/ledger`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async redeem(teamId: string, code: string): Promise<LingqiRedeemResult> {
    const response = await axios.post(
      `${API_BASE}/teams/${encodePathSegment(teamId)}/quota/redeem`,
      { code },
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  async getModelCatalog(teamId: string): Promise<LingqiModel[]> {
    const response = await axios.get(`${API_BASE}/teams/${encodePathSegment(teamId)}/models/catalog`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async selectModel(
    teamId: string,
    modelId: string,
    conversationId?: string
  ): Promise<LingqiModel> {
    const response = await axios.post(
      `${API_BASE}/teams/${encodePathSegment(teamId)}/models/select`,
      { modelId, conversationId },
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  async estimate(teamId: string, request: LingqiEstimateRequest): Promise<LingqiEstimate> {
    const response = await axios.post(
      `${API_BASE}/teams/${encodePathSegment(teamId)}/quota/estimate`,
      request,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }
}

export const lingqiService = new LingqiService();
