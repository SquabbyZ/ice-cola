import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { ModelDialog } from './ModelDialog';

const providers = [{ id: 'provider-1', name: 'OpenAI' }];

function renderDialog(onSubmit = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <ModelDialog open onClose={vi.fn()} onSubmit={onSubmit} providers={providers} />
    </I18nextProvider>,
  );

  return { onSubmit };
}

describe('ModelDialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('zh');
  });

  it('submits client catalog projection fields', () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText('模型名称 *'), { target: { value: 'GPT-4o' } });
    fireEvent.change(screen.getByLabelText('模型 ID *'), { target: { value: 'gpt-4o' } });
    fireEvent.change(screen.getByLabelText('Client 展示名'), { target: { value: 'GPT-4o Client' } });
    fireEvent.change(screen.getByLabelText('阶位'), { target: { value: '2' } });
    const costMultiplierInput = screen.getByLabelText('消耗倍率');
    fireEvent.change(costMultiplierInput, { target: { value: '1.5' } });
    expect(costMultiplierInput).toHaveDisplayValue('1.5');
    fireEvent.change(screen.getByLabelText('订阅等级'), { target: { value: '1' } });
    fireEvent.click(screen.getByLabelText('Client 可见'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '保存' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'provider-1',
        name: 'GPT-4o',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o Client',
        rank: 2,
        costMultiplier: 1.5,
        requiredPlanLevel: 1,
        isCatalogVisible: false,
      }),
    );
  });

  it('uses local accessible controls for selects, capability chips, and description', () => {
    renderDialog();

    expect(screen.getByRole('combobox', { name: '供应商 *' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: '类型 *' })).toBeVisible();
    expect(screen.getByText('配置模型目录展示、消耗倍率和访问要求。')).toBeVisible();

    const chatChip = screen.getByRole('button', { name: '聊天' });
    expect(chatChip).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(chatChip);

    expect(chatChip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('描述')).toHaveClass('rounded-md');
  });
});
