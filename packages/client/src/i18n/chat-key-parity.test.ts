import { describe, expect, test } from 'vitest';
import en from './locales/en.json';
import zh from './locales/zh.json';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe('chat locale keys', () => {
  test('keeps zh and en chat keys in sync', () => {
    const zhKeys = flattenKeys(zh.chat).sort();
    const enKeys = flattenKeys(en.chat).sort();

    expect(enKeys).toEqual(zhKeys);
  });
});
