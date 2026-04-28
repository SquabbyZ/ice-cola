import { create } from 'zustand';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  setAuth: (user: AdminUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('adminToken'),
  setAuth: (user, token) => {
    localStorage.setItem('adminToken', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('adminToken');
    set({ user: null, token: null });
  },
}));