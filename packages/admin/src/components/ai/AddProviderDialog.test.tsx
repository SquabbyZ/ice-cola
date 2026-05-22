import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { AddProviderDialog } from './AddProviderDialog';

const providers = [
  {
    id: 'provider-minimax',
    name: 'MiniMax',
    code: 'minimax',
    status: 'active',
    sortOrder: 0,
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
  },
];

function renderDialog(onSubmit = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <AddProviderDialog
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        providers={providers}
        existingProviderIds={[]}
      />
    </I18nextProvider>,
  );

  return { onSubmit };
}

describe('AddProviderDialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('zh');
  });

  it('submits MiniMax with the Anthropic endpoint and temporary key while endpoint field is collapsed', () => {
    const { onSubmit } = renderDialog();

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'MiniMax' }));
    fireEvent.change(screen.getByLabelText('密钥名称 *'), { target: { value: 'MiniMax Test Key' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '保存' }));

    expect(screen.getByText('默认：https://api.minimaxi.com/anthropic')).toBeVisible();
    expect(onSubmit).toHaveBeenCalledWith({
      providerId: 'provider-minimax',
      keyName: 'MiniMax Test Key',
      apiKey: '123',
      endpointUrl: 'https://api.minimaxi.com/anthropic',
    });
  });
});
