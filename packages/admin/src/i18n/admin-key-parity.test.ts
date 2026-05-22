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

function expectMatchingNamespaceKeys(namespace: unknown, matchingNamespace: unknown): void {
  const namespaceKeys = flattenKeys(namespace).sort();

  expect(namespaceKeys.length).toBeGreaterThan(0);
  expect(namespaceKeys).toEqual(flattenKeys(matchingNamespace).sort());
}

describe('admin remediation locale keys', () => {
  test('keeps redemption and Lingqi keys in sync', () => {
    expectMatchingNamespaceKeys(en.redemptionCodes, zh.redemptionCodes);
    expectMatchingNamespaceKeys(en.redemptionCodeDetail, zh.redemptionCodeDetail);
    expectMatchingNamespaceKeys(en.lingqiLedger, zh.lingqiLedger);
  });
});
