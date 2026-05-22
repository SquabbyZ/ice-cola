import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import AISettings from './AISettings';

vi.mock('./Providers', () => ({
  default: () => <div>providers panel</div>,
}));

vi.mock('./ApiKeys', () => ({
  default: () => <div>api keys panel</div>,
}));

vi.mock('./Models', () => ({
  default: () => <div>models panel</div>,
}));

describe('AISettings page', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh');
  });

  it('exposes providers, api keys, and models as usable configuration sections', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AISettings />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: 'AI 配置' })).toBeVisible();
    expect(screen.getByRole('tab', { name: '供应商' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'API 密钥' })).toBeVisible();
    expect(screen.getByRole('tab', { name: '模型' })).toBeVisible();
    expect(screen.getByText('providers panel')).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'API 密钥' }));
    expect(screen.getByText('api keys panel')).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: '模型' }));
    expect(screen.getByText('models panel')).toBeVisible();
  });
});
