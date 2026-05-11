import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset store state
    useAuthStore.setState({ user: null, token: null });
  });

  it('initializes with null user and token when localStorage is empty', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('setAuth stores user and token in localStorage', () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test', role: 'ADMIN' as const };
    const mockToken = 'test-token';

    useAuthStore.getState().setAuth(mockUser, mockToken);

    expect(localStorage.getItem('adminToken')).toBe(mockToken);
    expect(localStorage.getItem('adminUser')).toBe(JSON.stringify(mockUser));
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().token).toBe(mockToken);
  });

  it('logout clears localStorage and resets state', () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test', role: 'ADMIN' as const };
    useAuthStore.getState().setAuth(mockUser, 'test-token');

    useAuthStore.getState().logout();

    expect(localStorage.getItem('adminToken')).toBeNull();
    expect(localStorage.getItem('adminUser')).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });
});