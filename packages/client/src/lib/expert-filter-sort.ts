/**
 * 专家列表搜索和排序工具函数
 */

export type SortMode = 'name-asc' | 'name-desc' | 'default-first';

interface ExpertLike {
  name: string;
  description?: string;
  systemPrompt?: string;
  isDefault: boolean;
}

/**
 * 按关键词过滤专家列表
 * 匹配名称、描述、系统提示词（大小写不敏感）
 */
export function filterExperts<T extends ExpertLike>(
  experts: T[],
  query: string
): T[] {
  if (!query) return experts;
  const lower = query.toLowerCase();
  return experts.filter(
    (e) =>
      e.name.toLowerCase().includes(lower) ||
      (e.description || '').toLowerCase().includes(lower) ||
      (e.systemPrompt || '').toLowerCase().includes(lower)
  );
}

/**
 * 按指定模式排序专家列表
 */
export function sortExperts<T extends ExpertLike>(
  experts: T[],
  mode: SortMode
): T[] {
  return [...experts].sort((a, b) => {
    if (mode === 'name-asc') return a.name.localeCompare(b.name);
    if (mode === 'name-desc') return b.name.localeCompare(a.name);
    // default-first: defaults on top, then alphabetical
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * 过滤 + 排序组合
 */
export function filterAndSortExperts<T extends ExpertLike>(
  experts: T[],
  query: string,
  mode: SortMode
): T[] {
  return sortExperts(filterExperts(experts, query), mode);
}
