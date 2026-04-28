import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface SystemConfig {
  RESEND_API_KEY?: string;
  VERIFICATION_CODE_EXPIRY?: string;
  VERIFICATION_CODE_LENGTH?: string;
  [key: string]: string | undefined;
}

export const useConfig = () => {
  return useQuery<SystemConfig>({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const response = await api.get('/admin/config');
      return response.data.data || {};
    },
  });
};

export const useUpdateConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put(`/admin/config/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
    },
  });
};