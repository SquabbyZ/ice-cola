import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AdminLingqiLedgerQuery,
  CreateAdminRedemptionCodeRequest,
  ListAdminRedemptionCodesQuery,
  redemptionCodesApi,
} from '../services/redemptionCodesApi';

export function useAdminRedemptionCodes(query: ListAdminRedemptionCodesQuery = {}) {
  return useQuery({
    queryKey: ['admin-lingqi', 'redemption-codes', query],
    queryFn: () => redemptionCodesApi.listRedemptionCodes(query),
  });
}

export function useAdminRedemptionCode(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-lingqi', 'redemption-codes', id],
    queryFn: () => redemptionCodesApi.getRedemptionCode(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateAdminRedemptionCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminRedemptionCodeRequest) => redemptionCodesApi.createRedemptionCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lingqi', 'redemption-codes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-lingqi', 'ledger'] });
    },
  });
}

export function useDisableAdminRedemptionCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => redemptionCodesApi.disableRedemptionCode(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-lingqi', 'redemption-codes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-lingqi', 'redemption-codes', id] });
    },
  });
}

export function useAdminLingqiLedger(query: AdminLingqiLedgerQuery = {}) {
  return useQuery({
    queryKey: ['admin-lingqi', 'ledger', query],
    queryFn: () => redemptionCodesApi.listLedgerEntries(query),
  });
}
