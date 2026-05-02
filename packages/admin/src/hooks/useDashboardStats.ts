import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface DashboardStats {
  totalUsers: number;
  pendingInvitations: number;
  activeSessions: number;
}

export const useDashboardStats = () => {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/auth/stats');
      return response.data.data;
    },
  });
};