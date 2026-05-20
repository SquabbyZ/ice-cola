import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { authService } from '@/services/auth-service';

vi.mock('@/services/auth-service', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });
    vi.mocked(authService.getCurrentUser).mockReset();
    vi.mocked(authService.isAuthenticated).mockReset();
  });

  it('refreshSession reloads the current user from the server', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      team: { id: 'team-1', name: 'Team One', role: 'OWNER' },
    };

    vi.mocked(authService.getCurrentUser).mockResolvedValue(currentUser);

    await expect(useAuthStore.getState().refreshSession()).resolves.toEqual(currentUser);

    expect(useAuthStore.getState().user).toEqual(currentUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('refreshSession clears auth state when the server rejects with unauthorized', async () => {
    vi.mocked(authService.getCurrentUser).mockRejectedValue({
      response: { status: 401, data: { message: 'Unauthorized' } },
    });

    await expect(useAuthStore.getState().refreshSession()).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().error).toBe('Unauthorized');
  });

  it('refreshSession keeps auth state on transient errors', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        team: { id: 'team-1', name: 'Team One', role: 'OWNER' },
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('boom'));

    await expect(useAuthStore.getState().refreshSession()).rejects.toThrow('boom');

    expect(useAuthStore.getState().user).not.toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().error).toBe('boom');
  });
});
