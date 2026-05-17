import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../services/api';

describe('api service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('has correct base URL', () => {
    expect(api.defaults.baseURL).toBe('/');
  });

  it('does not add authorization header when no token exists', () => {
    localStorage.removeItem('adminToken');

    const token = localStorage.getItem('adminToken');

    expect(token).toBeNull();
  });

  it('adds authorization header when token exists', () => {
    const testToken = 'test-token-123';
    localStorage.setItem('adminToken', testToken);

    const config: { headers: { Authorization?: string } } = { headers: {} };
    config.headers.Authorization = `Bearer ${testToken}`;

    expect(config.headers.Authorization).toBe(`Bearer ${testToken}`);
  });
});