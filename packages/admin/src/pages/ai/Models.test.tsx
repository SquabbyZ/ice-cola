import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import Models from './Models';

const models = [
  {
    id: 'model-1',
    providerId: 'provider-1',
    name: 'GPT-4o',
    modelId: 'gpt-4o',
    modelType: 'chat',
    description: 'Fast model',
    contextWindow: 128000,
    inputPricePer1m: 5,
    outputPricePer1m: 15,
    sortOrder: 1,
    status: 'active',
    capabilities: ['chat', 'streaming'],
    providerName: 'OpenAI',
    providerCode: 'openai',
    displayName: '问道 GPT-4o',
    rank: 2,
    costMultiplier: 1.5,
    requiredPlanLevel: 1,
    isCatalogVisible: true,
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
  },
];

vi.mock('../../hooks/useAiModels', () => ({
  useModels: () => ({ data: models, isLoading: false }),
  useProviders: () => ({ data: [{ id: 'provider-1', name: 'OpenAI' }] }),
  useCreateModel: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateModel: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteModel: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: { role: string } }) => unknown) => selector({ user: { role: 'OWNER' } }),
}));

describe('Models page', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh');
  });

  it('renders catalog projection fields and shadcn badge text', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Models />
      </I18nextProvider>,
    );

    expect(screen.getByText('问道 GPT-4o')).toBeVisible();
    expect(screen.getByText('1.5x')).toBeVisible();
    expect(screen.getByText('L1')).toBeVisible();
    expect(screen.getByText('可见')).toBeVisible();
  });

  it('renders expanded capability badges with fixed i18n labels', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Models />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '展开 GPT-4o' }));

    const table = screen.getByRole('table');
    expect(within(table).getAllByText('聊天')).toHaveLength(2);
    expect(within(table).getByText('流式输出')).toBeVisible();
  });
});
