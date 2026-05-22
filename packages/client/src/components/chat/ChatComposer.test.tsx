import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import '../../i18n';
import { ChatComposer } from './ChatComposer';

interface RenderedComposer {
  container: HTMLDivElement;
  root: Root;
  textarea: HTMLTextAreaElement;
}

function renderComposer(
  overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {}
): RenderedComposer {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const props: React.ComponentProps<typeof ChatComposer> = {
    value: '',
    isEditing: false,
    isSending: false,
    gatewayConnected: true,
    canSend: true,
    attachments: [],
    onChange: vi.fn(),
    onSend: vi.fn(),
    onStop: vi.fn(),
    onCancelEdit: vi.fn(),
    onAttachClick: vi.fn(),
    ...overrides,
  };

  act(() => {
    root.render(<ChatComposer {...props} />);
  });

  const textarea = container.querySelector('textarea');
  if (!textarea) {
    throw new Error('textarea not found');
  }

  return { container, root, textarea };
}

describe('ChatComposer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('uses one row by default and caps input at three rows', () => {
    const { root, textarea } = renderComposer();

    expect(textarea.rows).toBe(1);
    expect(textarea.dataset.maxRows).toBe('3');

    act(() => {
      root.unmount();
    });
  });

  test('submits on Enter and allows Shift+Enter newline', () => {
    const onSend = vi.fn();
    const { root, textarea } = renderComposer({ value: 'hello Hermes', onSend });

    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true })
      );
    });
    expect(onSend).not.toHaveBeenCalled();

    act(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onSend).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  test('does not submit on Enter during IME composition', () => {
    const onSend = vi.fn();
    const { root, textarea } = renderComposer({ value: '你好', onSend });
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(enterEvent, 'isComposing', { value: true });

    act(() => {
      textarea.dispatchEvent(enterEvent);
    });

    expect(onSend).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  test('shows connected and disconnected placeholders', () => {
    const connected = renderComposer({ gatewayConnected: true });
    expect(connected.textarea.placeholder).toContain('Hermes');
    act(() => connected.root.unmount());

    const disconnected = renderComposer({ gatewayConnected: false });
    expect(disconnected.textarea.placeholder).toContain('Hermes');
    expect(disconnected.textarea.disabled).toBe(true);
    act(() => disconnected.root.unmount());
  });
});
