import api from './api';

export type AdminRedemptionCodeType = 'lingqi_only' | 'plan_with_lingqi';
export type AdminRedemptionCodeStatus = 'active' | 'redeemed' | 'expired' | 'disabled';
export type LingqiDirection = 'grant' | 'consume';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface CreateAdminRedemptionCodeRequest {
  type: AdminRedemptionCodeType;
  lingqiAmount: number;
  planId?: string;
  expiresAt?: string;
  note?: string;
}

export interface AdminRedemptionCode {
  id: string;
  type: AdminRedemptionCodeType;
  codePreview: string;
  lingqiAmount: number;
  planId: string | null;
  maxUses: number;
  usedCount: number;
  status: AdminRedemptionCodeStatus;
  expiresAt: string | null;
  note: string | null;
  createdByUserId: string | null;
  disabledAt: string | null;
  disabledByUserId: string | null;
  disabledReason: string | null;
  redeemedTeamId: string | null;
  redeemedUserId: string | null;
  redeemedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedAdminRedemptionCode extends AdminRedemptionCode {
  code: string;
}

export interface ListAdminRedemptionCodesQuery {
  status?: AdminRedemptionCodeStatus;
  limit?: number;
  offset?: number;
}

export interface AdminLingqiLedgerEntry {
  id: string;
  teamId: string;
  userId: string | null;
  direction: string;
  amount: number;
  transactionType: string;
  sourceType: string;
  sourceId: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminLingqiLedgerQuery {
  teamId?: string;
  userId?: string;
  direction?: LingqiDirection;
  transactionType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

function resourcePath(basePath: string, id: string, suffix = ''): string {
  return `${basePath}/${encodeURIComponent(id)}${suffix}`;
}

export const redemptionCodesApi = {
  listRedemptionCodes: async (params: ListAdminRedemptionCodesQuery = {}): Promise<PaginatedResult<AdminRedemptionCode>> => {
    const response = await api.get<ApiEnvelope<PaginatedResult<AdminRedemptionCode>>>('/admin/lingqi/redemption-codes', { params });
    return response.data.data;
  },

  getRedemptionCode: async (id: string): Promise<AdminRedemptionCode> => {
    const response = await api.get<ApiEnvelope<AdminRedemptionCode>>(resourcePath('/admin/lingqi/redemption-codes', id));
    return response.data.data;
  },

  createRedemptionCode: async (data: CreateAdminRedemptionCodeRequest): Promise<CreatedAdminRedemptionCode> => {
    const response = await api.post<ApiEnvelope<CreatedAdminRedemptionCode>>('/admin/lingqi/redemption-codes', data);
    return response.data.data;
  },

  disableRedemptionCode: async (id: string, reason?: string): Promise<AdminRedemptionCode> => {
    const response = await api.post<ApiEnvelope<AdminRedemptionCode>>(
      resourcePath('/admin/lingqi/redemption-codes', id, '/disable'),
      { reason },
    );
    return response.data.data;
  },

  listLedgerEntries: async (params: AdminLingqiLedgerQuery = {}): Promise<PaginatedResult<AdminLingqiLedgerEntry>> => {
    const response = await api.get<ApiEnvelope<PaginatedResult<AdminLingqiLedgerEntry>>>('/admin/lingqi/ledger', { params });
    return response.data.data;
  },
};
