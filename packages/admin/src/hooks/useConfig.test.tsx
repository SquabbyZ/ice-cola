import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfig, useUpdateConfig } from './useConfig';

// Mock api
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import api from '../services/api';

describe('useConfig', () => {
  const queryClient = new QueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('returns config data from API', async () => {
    const mockConfig = {
      RESEND_API_KEY: 'test-key',
      VERIFICATION_CODE_EXPIRY: '300',
    };

    vi.mocked(api.get).mockResolvedValue({
      data: { data: mockConfig },
    });

    const { result } = renderHook(() => useConfig(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockConfig);
    expect(api.get).toHaveBeenCalledWith('/admin/config');
  });

  it('returns empty object when no data', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: null },
    });

    const { result } = renderHook(() => useConfig(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({});
  });
});

describe('useUpdateConfig', () => {
  const queryClient = new QueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('calls API with correct params', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useUpdateConfig(), { wrapper });

    result.current.mutate({ key: 'RESEND_API_KEY', value: 'new-key' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.put).toHaveBeenCalledWith('/admin/config/RESEND_API_KEY', {
      value: 'new-key',
    });
  });
});