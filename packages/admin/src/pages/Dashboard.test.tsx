import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import Dashboard from './Dashboard';

vi.mock('../hooks/useDashboardStats', () => ({
  useDashboardStats: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('Dashboard (R002 dogfood)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the dogfood banner with the EN translation by default', async () => {
    renderDashboard();
    const banner = await screen.findByTestId('dogfood-missing-key');
    expect(banner.textContent).toBeTruthy();
    // EN: "Dogfood: 1.4.0 banner active. All clear." — must contain "Dogfood" and "1.4.0"
    expect(banner.textContent).toMatch(/Dogfood/);
    expect(banner.textContent).toMatch(/1\.4\.0/);
    // Must NOT echo the raw key path
    expect(banner.textContent).not.toMatch(/dogfoodTestBanner/);
  });

  it('renders the ZH translation when language is switched to zh', async () => {
    await i18n.changeLanguage('zh');
    renderDashboard();
    const banner = await screen.findByTestId('dogfood-missing-key');
    expect(banner.textContent).toBeTruthy();
    // ZH: "Dogfood：1.4.0 测试横幅已激活。一切正常。" — must contain a CJK char
    expect(banner.textContent).toMatch(/[一-鿿]/);
    // Must NOT echo the raw key path
    expect(banner.textContent).not.toMatch(/dogfoodTestBanner/);
  });

  it('switches correctly when language toggles back to en', async () => {
    await i18n.changeLanguage('zh');
    renderDashboard();
    const banner = await screen.findByTestId('dogfood-missing-key');
    expect(banner.textContent).toMatch(/[一-鿿]/);

    await waitFor(async () => {
      await i18n.changeLanguage('en');
      expect(banner.textContent).toMatch(/Dogfood/);
    });
  });
});
