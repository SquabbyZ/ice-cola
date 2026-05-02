import { useMutation } from '@tanstack/react-query';
import api from '../services/api';

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await api.put('/admin/auth/profile', data);
      return response.data;
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const response = await api.put('/admin/auth/change-password', data);
      return response.data;
    },
  });
};