/**
 * Auth Service 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService, AuthService } from './auth-service';

// Mock axios
vi.mock('axios', () => {
  const mAxios = {
    post: vi.fn(),
    get: vi.fn(),
    create: vi.fn().mockReturnThis(),
    defaults: { baseURL: '' },
    interceptors: {
      request: { use: vi.fn(), handlers: [] },
      response: { use: vi.fn(), handlers: [] },
    },
  };
  return {
    default: mAxios,
  };
});

import axios from 'axios';

describe('AuthService', () => {
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('isAuthenticated', () => {
    it('returns false when no token exists', () => {
      localStorage.removeItem('accessToken');
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('returns true when token exists', () => {
      localStorage.setItem('accessToken', 'test-token');
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('getToken', () => {
    it('returns null when no token exists', () => {
      localStorage.removeItem('accessToken');
      expect(authService.getToken()).toBeNull();
    });

    it('returns token when it exists', () => {
      localStorage.setItem('accessToken', 'test-token-123');
      expect(authService.getToken()).toBe('test-token-123');
    });
  });

  describe('login', () => {
    it('stores tokens in localStorage on successful login', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          data: {
            user: { id: '1', email: 'test@test.com', name: 'Test', team: null },
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 900,
          },
        },
      });

      const result = await authService.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(localStorage.getItem('accessToken')).toBe('access-token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
    });
  });

  describe('register', () => {
    it('stores tokens in localStorage on successful registration', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          data: {
            user: { id: '1', email: 'test@test.com', name: 'Test', team: null },
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 900,
          },
        },
      });

      const result = await authService.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.accessToken).toBe('access-token');
      expect(localStorage.getItem('accessToken')).toBe('access-token');
    });
  });

  describe('logout', () => {
    it('removes tokens from localStorage', async () => {
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('refreshToken', 'refresh-token');

      mockAxios.post.mockResolvedValue({ data: {} });

      await authService.logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('calls API with auth headers', async () => {
      localStorage.setItem('accessToken', 'test-token');

      mockAxios.get.mockResolvedValue({
        data: {
          data: { id: '1', email: 'test@test.com', name: 'Test', team: null },
        },
      });

      const user = await authService.getCurrentUser();

      expect(user.id).toBe('1');
      expect(mockAxios.get).toHaveBeenCalledWith(
        '/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('updates access token in localStorage', async () => {
      localStorage.setItem('refreshToken', 'old-refresh-token');

      mockAxios.post.mockResolvedValue({
        data: {
          data: { accessToken: 'new-access-token', expiresIn: 900 },
        },
      });

      const result = await authService.refreshToken();

      expect(result.accessToken).toBe('new-access-token');
      expect(localStorage.getItem('accessToken')).toBe('new-access-token');
    });

    it('throws error when no refresh token', async () => {
      localStorage.removeItem('refreshToken');

      await expect(authService.refreshToken()).rejects.toThrow('No refresh token');
    });
  });

  describe('changePassword', () => {
    it('sends request with auth headers', async () => {
      localStorage.setItem('accessToken', 'test-token');
      mockAxios.post.mockResolvedValue({ data: {} });

      await authService.changePassword({
        currentPassword: 'old',
        newPassword: 'new',
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/auth/change-password',
        { currentPassword: 'old', newPassword: 'new' },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });
});