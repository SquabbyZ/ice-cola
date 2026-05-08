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

const storedToken = localStorage.getItem('adminToken');
const storedUser = localStorage.getItem('adminUser');
const parsedUser = storedUser ? JSON.parse(storedUser) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: parsedUser,
  token: storedToken,
  setAuth: (user, token) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    set({ user: null, token: null });
  },
}));