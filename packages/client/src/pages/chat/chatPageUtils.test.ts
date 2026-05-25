import { describe, expect, test } from 'vitest';
import { getCapabilitySelectorTrigger } from './chatPageUtils';

describe('getCapabilitySelectorTrigger', () => {
  test('maps each capability target to its own selector trigger', () => {
    expect(getCapabilitySelectorTrigger('model')).toBe('[data-chat-selector-trigger="model"]');
    expect(getCapabilitySelectorTrigger('expert')).toBe('[data-chat-selector-trigger="expert"]');
    expect(getCapabilitySelectorTrigger('mcp')).toBe('[data-chat-selector-trigger="mcp"]');
    expect(getCapabilitySelectorTrigger('skills')).toBe('[data-chat-selector-trigger="skills"]');
    expect(getCapabilitySelectorTrigger('plugins')).toBe('[data-chat-selector-trigger="plugins"]');
  });

  test('does not map attachment clicks to a selector trigger', () => {
    expect(getCapabilitySelectorTrigger('attach')).toBeNull();
  });
});
