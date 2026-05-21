import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLingqiStore } from './lingqi';
import { lingqiService } from '../services/lingqi-service';
import type {
  LingqiEstimate,
  LingqiEstimateRequest,
  LingqiLedgerEntry,
  LingqiModel,
  LingqiStatus,
} from '../services/lingqi-service';

vi.mock('../services/lingqi-service', () => ({
  lingqiService: {
    getStatus: vi.fn(),
    redeem: vi.fn(),
    getModelCatalog: vi.fn(),
    getLedger: vi.fn(),
    selectModel: vi.fn(),
    estimate: vi.fn(),
  },
}));

const mockedLingqiService = vi.mocked(lingqiService);

const status: LingqiStatus = {
  teamId: 'team-1',
  balance: 100,
  totalGranted: 150,
  totalConsumed: 50,
  subscription: {
    planName: 'free',
    displayName: 'Free',
    level: 0,
    costDiscountRate: 1,
    modelRankLimit: 1,
    expiresAt: null,
  },
  realmProgress: {
    current: 50,
    required: 100,
    percentage: 50,
  },
};

const refreshedStatus: LingqiStatus = {
  ...status,
  balance: 180,
  totalGranted: 230,
};

const availableModel: LingqiModel = {
  id: 'model-available',
  modelName: 'lingqi-basic',
  displayName: 'Lingqi Basic',
  description: 'Available model',
  rank: 1,
  costMultiplier: 1,
  requiredPlanLevel: 0,
  isAvailable: true,
  unavailableReason: null,
};

const unavailableModel: LingqiModel = {
  id: 'model-unavailable',
  modelName: 'lingqi-pro',
  displayName: 'Lingqi Pro',
  description: 'Unavailable model',
  rank: 2,
  costMultiplier: 2,
  requiredPlanLevel: 1,
  isAvailable: false,
  unavailableReason: 'SUBSCRIPTION_REQUIRED',
};

const estimateRequest: LingqiEstimateRequest = {
  transactionType: 'chat_message',
  modelId: availableModel.id,
};

const estimate: LingqiEstimate = {
  estimatedCost: 12,
  balanceAfterEstimate: 88,
  canAfford: true,
  reason: null,
  model: availableModel,
};

const ledgerEntry: LingqiLedgerEntry = {
  id: 'ledger-1',
  direction: 'grant',
  amount: 80,
  transactionType: 'redemption_code',
  sourceType: 'redemption_code',
  description: '灵气兑换码充值',
  metadata: {},
  createdAt: '2026-05-21T10:00:00.000Z',
};

function resetStore(): void {
  useLingqiStore.setState({
    status: null,
    models: [],
    ledger: [],
    selectedModel: null,
    estimate: null,
    isLoading: false,
    error: null,
  });
}

describe('useLingqiStore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetStore();
    mockedLingqiService.getLedger.mockResolvedValue([]);
  });

  it('loadLingqi refreshes status and catalog, then picks the first available model when nothing is selected', async () => {
    mockedLingqiService.getStatus.mockResolvedValue(status);
    mockedLingqiService.getModelCatalog.mockResolvedValue([unavailableModel, availableModel]);
    mockedLingqiService.getLedger.mockResolvedValue([ledgerEntry]);

    await useLingqiStore.getState().loadLingqi('team-1');

    expect(mockedLingqiService.getStatus).toHaveBeenCalledWith('team-1');
    expect(mockedLingqiService.getModelCatalog).toHaveBeenCalledWith('team-1');
    expect(mockedLingqiService.getLedger).toHaveBeenCalledWith('team-1');
    expect(useLingqiStore.getState()).toMatchObject({
      status,
      models: [unavailableModel, availableModel],
      ledger: [ledgerEntry],
      selectedModel: availableModel,
      isLoading: false,
      error: null,
    });
  });

  it('loadLingqi preserves the selected model when it is still available', async () => {
    const nextAvailableModel = {
      ...availableModel,
      displayName: 'Lingqi Basic Updated',
    };
    mockedLingqiService.getStatus.mockResolvedValue(status);
    mockedLingqiService.getModelCatalog.mockResolvedValue([nextAvailableModel, unavailableModel]);
    mockedLingqiService.getLedger.mockResolvedValue([ledgerEntry]);
    useLingqiStore.setState({ selectedModel: availableModel });

    await useLingqiStore.getState().loadLingqi('team-1');

    expect(useLingqiStore.getState()).toMatchObject({
      status,
      models: [nextAvailableModel, unavailableModel],
      selectedModel: nextAvailableModel,
      isLoading: false,
      error: null,
    });
  });

  it('loadLingqi clears the selected model when it is no longer available', async () => {
    mockedLingqiService.getStatus.mockResolvedValue(status);
    mockedLingqiService.getModelCatalog.mockResolvedValue([unavailableModel]);
    mockedLingqiService.getLedger.mockResolvedValue([ledgerEntry]);
    useLingqiStore.setState({ selectedModel: availableModel });

    await useLingqiStore.getState().loadLingqi('team-1');

    expect(useLingqiStore.getState().selectedModel).toBeNull();
    expect(useLingqiStore.getState().models).toEqual([unavailableModel]);
  });

  it('loadLingqi sets selectedModel null when no model is available', async () => {
    mockedLingqiService.getStatus.mockResolvedValue(status);
    mockedLingqiService.getModelCatalog.mockResolvedValue([unavailableModel]);
    mockedLingqiService.getLedger.mockResolvedValue([ledgerEntry]);

    await useLingqiStore.getState().loadLingqi('team-1');

    expect(useLingqiStore.getState().selectedModel).toBeNull();
    expect(useLingqiStore.getState().models).toEqual([unavailableModel]);
  });

  it('redeemCode replaces status and returns granted amount', async () => {
    mockedLingqiService.redeem.mockResolvedValue({
      grantedAmount: 80,
      status: refreshedStatus,
    });
    mockedLingqiService.getLedger.mockResolvedValue([ledgerEntry]);

    const grantedAmount = await useLingqiStore.getState().redeemCode('team-1', 'CODE-123');

    expect(mockedLingqiService.redeem).toHaveBeenCalledWith('team-1', 'CODE-123');
    expect(mockedLingqiService.getLedger).toHaveBeenCalledWith('team-1');
    expect(grantedAmount).toBe(80);
    expect(useLingqiStore.getState()).toMatchObject({
      status: refreshedStatus,
      ledger: [ledgerEntry],
      isLoading: false,
      error: null,
    });
  });

  it('redeemCode sets error, clears loading, and rethrows when redeem fails', async () => {
    const error = new Error('兑换失败');
    mockedLingqiService.redeem.mockRejectedValue(error);

    await expect(useLingqiStore.getState().redeemCode('team-1', 'CODE-123')).rejects.toThrow(
      '兑换失败',
    );

    expect(useLingqiStore.getState()).toMatchObject({
      error: '兑换失败',
      isLoading: false,
    });
  });

  it('redeemCode still succeeds when recent ledger refresh fails after redemption', async () => {
    mockedLingqiService.redeem.mockResolvedValue({
      grantedAmount: 80,
      status: refreshedStatus,
    });
    mockedLingqiService.getLedger.mockRejectedValue(new Error('账簿刷新失败'));

    const grantedAmount = await useLingqiStore.getState().redeemCode('team-1', 'CODE-123');

    expect(grantedAmount).toBe(80);
    expect(useLingqiStore.getState()).toMatchObject({
      status: refreshedStatus,
      ledger: [],
      isLoading: false,
      error: null,
    });
  });

  it('selectModel updates the global selected model for team defaults', async () => {
    mockedLingqiService.selectModel.mockResolvedValue(availableModel);

    await useLingqiStore.getState().selectModel('team-1', availableModel.id);

    expect(mockedLingqiService.selectModel).toHaveBeenCalledWith('team-1', availableModel.id, undefined);
    expect(useLingqiStore.getState().selectedModel).toEqual(availableModel);
  });

  it('selectModel keeps the global selected model when saving a conversation model', async () => {
    mockedLingqiService.selectModel.mockResolvedValue(unavailableModel);
    useLingqiStore.setState({ selectedModel: availableModel });

    await useLingqiStore.getState().selectModel('team-1', unavailableModel.id, 'conversation-1');

    expect(mockedLingqiService.selectModel).toHaveBeenCalledWith('team-1', unavailableModel.id, 'conversation-1');
    expect(useLingqiStore.getState().selectedModel).toEqual(availableModel);
  });

  it('selectModel sets error and rethrows when model selection fails', async () => {
    const error = new Error('模型不可用');
    mockedLingqiService.selectModel.mockRejectedValue(error);

    await expect(
      useLingqiStore.getState().selectModel('team-1', unavailableModel.id),
    ).rejects.toThrow('模型不可用');

    expect(useLingqiStore.getState().error).toBe('模型不可用');
  });

  it('estimateCost stores and returns estimate', async () => {
    mockedLingqiService.estimate.mockResolvedValue(estimate);

    const result = await useLingqiStore.getState().estimateCost('team-1', estimateRequest);

    expect(mockedLingqiService.estimate).toHaveBeenCalledWith('team-1', estimateRequest);
    expect(result).toEqual(estimate);
    expect(useLingqiStore.getState().estimate).toEqual(estimate);
  });

  it('estimateCost sets error and rethrows when estimate fails', async () => {
    const error = new Error('余额不足');
    mockedLingqiService.estimate.mockRejectedValue(error);

    await expect(
      useLingqiStore.getState().estimateCost('team-1', estimateRequest),
    ).rejects.toThrow('余额不足');

    expect(useLingqiStore.getState().error).toBe('余额不足');
  });

  it('refreshStatus refreshes status and recent ledger entries', async () => {
    mockedLingqiService.getStatus.mockResolvedValue(refreshedStatus);
    mockedLingqiService.getLedger.mockResolvedValue([ledgerEntry]);

    await useLingqiStore.getState().refreshStatus('team-1');

    expect(mockedLingqiService.getStatus).toHaveBeenCalledWith('team-1');
    expect(mockedLingqiService.getLedger).toHaveBeenCalledWith('team-1');
    expect(useLingqiStore.getState()).toMatchObject({
      status: refreshedStatus,
      ledger: [ledgerEntry],
      error: null,
    });
  });

  it('refreshStatus sets error and rethrows when status refresh fails', async () => {
    const error = new Error('状态刷新失败');
    mockedLingqiService.getStatus.mockRejectedValue(error);

    await expect(useLingqiStore.getState().refreshStatus('team-1')).rejects.toThrow(
      '状态刷新失败',
    );

    expect(useLingqiStore.getState().error).toBe('状态刷新失败');
  });

  it('clearEstimate and clearError reset estimate and error', () => {
    useLingqiStore.setState({
      estimate,
      error: 'Something went wrong',
    });

    useLingqiStore.getState().clearEstimate();
    useLingqiStore.getState().clearError();

    expect(useLingqiStore.getState().estimate).toBeNull();
    expect(useLingqiStore.getState().error).toBeNull();
  });

  it('clearSelectedModel clears selected model and stale estimate', () => {
    useLingqiStore.setState({
      selectedModel: availableModel,
      estimate,
    });

    useLingqiStore.getState().clearSelectedModel();

    expect(useLingqiStore.getState().selectedModel).toBeNull();
    expect(useLingqiStore.getState().estimate).toBeNull();
  });

  it('loadLingqi uses fallback message for non-Error failures and clears loading', async () => {
    mockedLingqiService.getStatus.mockRejectedValue('service unavailable');
    mockedLingqiService.getModelCatalog.mockResolvedValue([availableModel]);

    await useLingqiStore.getState().loadLingqi('team-1');

    expect(useLingqiStore.getState()).toMatchObject({
      error: '灵气阁暂不可用，请稍后再试。',
      isLoading: false,
    });
  });
});
