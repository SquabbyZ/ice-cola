import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

export interface InvitationValidation {
  valid: boolean;
  email?: string;
  expiresAt?: string;
  message?: string;
}

export const useInvitations = () => {
  return useQuery<Invitation[]>({
    queryKey: ['admin-invitations'],
    queryFn: async () => {
      const response = await api.get('/admin/auth/invitations');
      const allInvitations: Invitation[] = response.data.data || [];
      // Filter to show only pending invitations
      return allInvitations.filter((inv) => inv.status === 'PENDING');
    },
  });
};

export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/admin/auth/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
    },
  });
};

export const useValidateInvitationToken = (token: string | null) => {
  return useQuery<InvitationValidation>({
    queryKey: ['admin-invitation-validate', token],
    queryFn: async () => {
      const response = await api.get(`/admin/auth/invitations/${token}/validate`);
      return response.data.data;
    },
    enabled: !!token,
  });
};

export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: async (data: { token: string; name: string; password: string }) => {
      const response = await api.post('/admin/auth/invitations/accept', data);
      return response.data.data;
    },
  });
};