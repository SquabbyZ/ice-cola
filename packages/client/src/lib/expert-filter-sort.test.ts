/**
 * expert-filter-sort 单元测试
 */

import { describe, it, expect } from 'vitest';
import { filterExperts, sortExperts, filterAndSortExperts } from './expert-filter-sort';

const experts = [
  { name: 'Zebra Expert', description: 'An expert on zebras', systemPrompt: 'You are a zebra', isDefault: false },
  { name: 'Alpha Bot', description: 'First alphabetically', systemPrompt: 'You are alpha', isDefault: true },
  { name: 'Code Reviewer', description: 'Reviews code', systemPrompt: 'Review code carefully', isDefault: false },
  { name: 'Python Guru', description: 'Python specialist', systemPrompt: 'Write clean Python', isDefault: false },
];

describe('filterExperts', () => {
  it('returns all experts when query is empty', () => {
    expect(filterExperts(experts, '')).toHaveLength(4);
  });

  it('filters by name (case-insensitive)', () => {
    expect(filterExperts(experts, 'alpha')).toEqual([
      { name: 'Alpha Bot', description: 'First alphabetically', systemPrompt: 'You are alpha', isDefault: true },
    ]);
  });

  it('filters by description', () => {
    const result = filterExperts(experts, 'zebras');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Zebra Expert');
  });

  it('filters by systemPrompt', () => {
    const result = filterExperts(experts, 'python');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Python Guru');
  });

  it('returns empty array when no match', () => {
    expect(filterExperts(experts, 'nonexistent')).toHaveLength(0);
  });

  it('handles experts with undefined description and systemPrompt', () => {
    const sparse = [
      { name: 'Test', isDefault: false },
      { name: 'Other', description: undefined, systemPrompt: undefined, isDefault: false },
    ];
    expect(filterExperts(sparse, 'test')).toHaveLength(1);
    expect(filterExperts(sparse, 'missing')).toHaveLength(0);
  });
});

describe('sortExperts', () => {
  it('sorts by name ascending', () => {
    const result = sortExperts(experts, 'name-asc');
    expect(result.map((e) => e.name)).toEqual([
      'Alpha Bot', 'Code Reviewer', 'Python Guru', 'Zebra Expert',
    ]);
  });

  it('sorts by name descending', () => {
    const result = sortExperts(experts, 'name-desc');
    expect(result.map((e) => e.name)).toEqual([
      'Zebra Expert', 'Python Guru', 'Code Reviewer', 'Alpha Bot',
    ]);
  });

  it('sorts default-first: defaults on top, then alphabetical', () => {
    const result = sortExperts(experts, 'default-first');
    expect(result[0].name).toBe('Alpha Bot'); // isDefault: true
    expect(result[0].isDefault).toBe(true);
    // remaining should be alphabetical
    expect(result.slice(1).map((e) => e.name)).toEqual([
      'Code Reviewer', 'Python Guru', 'Zebra Expert',
    ]);
  });

  it('does not mutate original array', () => {
    const original = [...experts];
    sortExperts(experts, 'name-desc');
    expect(experts.map((e) => e.name)).toEqual(original.map((e) => e.name));
  });
});

describe('filterAndSortExperts', () => {
  it('filters then sorts in one call', () => {
    const result = filterAndSortExperts(experts, 'e', 'name-asc');
    // "e" matches: Zebra Expert, Code Reviewer, Python Guru (Alpha Bot has "e" in systemPrompt "You are alpha"? no)
    // Actually "Alpha Bot" has "First alphabetically" description - contains "e"
    // Let's be precise: name "Alpha Bot" has no "e", description "First alphabetically" has "e", systemPrompt "You are alpha" has no "e"
    const names = result.map((e) => e.name);
    expect(names).toContain('Code Reviewer');
    expect(names).toContain('Zebra Expert');
    expect(names).toContain('Python Guru');
    // Should be sorted ascending
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('returns empty when filter matches nothing', () => {
    expect(filterAndSortExperts(experts, 'zzzzz', 'name-asc')).toHaveLength(0);
  });

  it('returns sorted full list with empty query', () => {
    const result = filterAndSortExperts(experts, '', 'default-first');
    expect(result).toHaveLength(4);
    expect(result[0].isDefault).toBe(true);
  });
});
