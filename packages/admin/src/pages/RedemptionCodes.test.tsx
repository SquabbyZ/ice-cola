import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import RedemptionCodes from './RedemptionCodes';

const mutateMock = vi.fn();
const resetMock = vi.fn();
const refetchMock = vi.fn();

vi.mock('../hooks/useRedemptionCodes', () => ({
  useAdminRedemptionCodes: () => ({
    data: { items: [], total: 0, limit: 10, offset: 0 },
    isLoading: false,
    refetch: refetchMock,
  }),
  useCreateAdminRedemptionCode: () => ({
    mutate: mutateMock,
    reset: resetMock,
    isPending: false,
  }),
  useDisableAdminRedemptionCode: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RedemptionCodes />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('RedemptionCodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('zh');
  });

  it('opens a visible shadcn dialog when clicking generate redemption code', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '生成兑换码' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: '生成兑换码' })).toBeVisible();
    expect(within(dialog).getByText('生成后请立即复制完整兑换码，后续页面不会再次展示明文。')).toBeVisible();
  });

  it('does not render a native datetime-local input for expiry', () => {
    const { container } = renderPage();

    fireEvent.click(screen.getByRole('button', { name: '生成兑换码' }));

    expect(screen.getByLabelText('过期时间')).toBeVisible();
    expect(container.querySelector('input[type="datetime-local"]')).toBeNull();
  });

  it('shows inline validation feedback instead of alert for invalid lingqi amount', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '生成兑换码' }));
    fireEvent.change(screen.getByLabelText('灵气数量'), { target: { value: '0' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '生成' }));

    expect(screen.getByText('灵气数量必须为正整数')).toBeVisible();
    expect(mutateMock).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('shows visible API error feedback instead of alert when create fails', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    mutateMock.mockImplementation((_, options) => {
      options.onError({ response: { data: { message: '创建失败测试' } } });
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '生成兑换码' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '生成' }));

    expect(screen.getByText('创建兑换码失败')).toBeVisible();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('opens the generated code dialog without alert after successful create', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    mutateMock.mockImplementation((_, options) => {
      options.onSuccess({
        id: 'code-1',
        type: 'lingqi_only',
        code: 'ICE-TEST-CODE',
        codePreview: 'ICE-***-CODE',
        lingqiAmount: 1000,
        planId: null,
        maxUses: 1,
        usedCount: 0,
        status: 'active',
        expiresAt: null,
        note: null,
        createdByUserId: null,
        disabledAt: null,
        disabledByUserId: null,
        disabledReason: null,
        redeemedTeamId: null,
        redeemedUserId: null,
        redeemedAt: null,
        createdAt: '2026-05-21T00:00:00.000Z',
        updatedAt: '2026-05-21T00:00:00.000Z',
      });
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '生成兑换码' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '生成' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: '兑换码已生成' })).toBeVisible();
    expect(within(dialog).getByText('ICE-TEST-CODE')).toBeVisible();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
