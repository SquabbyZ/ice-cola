import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, test } from 'vitest';
import i18n from '../../i18n';
import { HermesExecutionBlock } from './HermesExecutionBlock';

function renderText(element: React.ReactElement): string {
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  const text = container.textContent ?? '';

  act(() => {
    root.unmount();
  });

  return text;
}

describe('HermesExecutionBlock', () => {
  beforeEach(async () => {
    document.body.innerHTML = '';
    await i18n.changeLanguage('zh');
  });

  test('renders running tool calls with localized label', () => {
    const text = renderText(
      <HermesExecutionBlock toolName="web_search" status="running" output="" />
    );

    expect(text).toContain('正在搜索网络');
  });

  test('renders failed tool calls with fallback error', () => {
    const text = renderText(<HermesExecutionBlock toolName="terminal" status="error" output="" />);

    expect(text).toContain('失败');
    expect(text).toContain('未知错误');
  });
});
