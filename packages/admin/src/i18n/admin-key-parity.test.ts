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

  test('keeps AI keys in sync and localizes Chinese admin copy', () => {
    expectMatchingNamespaceKeys(en.ai, zh.ai);

    expect(zh.ai.nav.title).toBe('AI 模型');
    expect(zh.ai.nav.endpoints).toBe('端点');
    expect(zh.ai.providers.title).toBe('AI 供应商');
    expect(zh.ai.apiKeys.description).toBe('管理 AI 供应商的 API 密钥');
    expect(zh.ai.settings.usingDefaultEndpoint).toBe('默认：{{url}}');
  });

  // R002: peaks-cli 1.4.0 dogfood. The synthetic banner on the Dashboard
  // (Dashboard.tsx `t('dashboard.dogfoodTestBanner')`) must resolve in both
  // EN and ZH — i18next otherwise returns the raw key path. This test
  // gates the fix so the bug cannot regress.
  test('keeps dashboard.dogfoodTestBanner in sync and non-empty (R002 dogfood)', () => {
    expectMatchingNamespaceKeys(en.dashboard, zh.dashboard);

    const enValue = en.dashboard.dogfoodTestBanner;
    const zhValue = zh.dashboard.dogfoodTestBanner;

    expect(typeof enValue).toBe('string');
    expect(typeof zhValue).toBe('string');

    expect((enValue as string).length).toBeGreaterThanOrEqual(5);
    expect((zhValue as string).length).toBeGreaterThanOrEqual(2);

    // EN must not contain any CJK character
    expect((enValue as string)).not.toMatch(/[一-鿿]/);

    // ZH must contain at least 2 CJK characters
    const zhCjkCount = ((zhValue as string).match(/[一-鿿]/g) ?? []).length;
    expect(zhCjkCount).toBeGreaterThanOrEqual(2);

    // Neither value may echo back the key path
    expect((enValue as string)).not.toContain('dogfoodTestBanner');
    expect((zhValue as string)).not.toContain('dogfoodTestBanner');
  });
});
