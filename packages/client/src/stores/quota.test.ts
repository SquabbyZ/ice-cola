/**
 * Quota Store 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuotaStore } from './quota';

// Mock services
vi.mock('@/services/gateway-rpc', () => {
  return {
    GatewayRpcService: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  };
});

vi.mock('@/services/quota-service', () => {
  return {
    QuotaService: vi.fn().mockImplementation(() => ({
      getConfig: vi.fn(),
      updateConfig: vi.fn(),
      getStatus: vi.fn(),
    })),
  };
});

vi.mock('@/lib/gateway-client', () => {
  return {
    gatewayClient: {},
  };
});

describe('useQuotaStore', () => {
  beforeEach(() => {
    useQuotaStore.setState({
      config: null,
      status: null,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has null config', () => {
      expect(useQuotaStore.getState().config).toBeNull();
    });

    it('has null status', () => {
      expect(useQuotaStore.getState().status).toBeNull();
    });

    it('has isLoading false', () => {
      expect(useQuotaStore.getState().isLoading).toBe(false);
    });

    it('has null error', () => {
      expect(useQuotaStore.getState().error).toBeNull();
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      useQuotaStore.getState().setError('Test error');
      expect(useQuotaStore.getState().error).toBe('Test error');
    });

    it('clears error with null', () => {
      useQuotaStore.getState().setError('Some error');
      useQuotaStore.getState().setError(null);
      expect(useQuotaStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets state to initial values', () => {
      useQuotaStore.setState({
        config: { monthlyBudget: 100, warningThreshold: 0.5, hardLimit: false },
        status: { currentCost: 50, budget: 100, utilization: 0.5, isExceeded: false, isWarning: true },
        isLoading: true,
        error: 'Some error',
      });

      useQuotaStore.getState().reset();

      const state = useQuotaStore.getState();
      expect(state.config).toBeNull();
      expect(state.status).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});