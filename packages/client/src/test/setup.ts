/**
 * 测试全局设置
 * Mock Tauri API 以避免在测试环境中调用真实的原生模块
 */

import { vi, afterEach } from 'vitest';

/**
 * 内存数据库 Mock - 模拟 SQLite 的数据存储
 */
class InMemoryDatabase {
  private tables: Map<string, any[]> = new Map();
  private autoIncrementIds: Map<string, number> = new Map();

  /**
   * 清空所有数据 - 用于在每个测试后重置数据库
   */
  clear(): void {
    this.tables.clear();
    this.autoIncrementIds.clear();
  }

  async execute(sql: string, params?: any[]): Promise<{ rowsAffected: number; lastInsertId: string | null }> {
    const upperSql = sql.toUpperCase().trim();

    if (upperSql.startsWith('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match && !this.tables.has(match[1])) {
        this.tables.set(match[1], []);
        this.autoIncrementIds.set(match[1], 0);
      }
      return { rowsAffected: 0, lastInsertId: null };
    }

    if (upperSql.startsWith('CREATE INDEX')) {
      return { rowsAffected: 0, lastInsertId: null };
    }

    if (upperSql.startsWith('INSERT INTO')) {
      const match = sql.match(/INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)/i);
      if (match) {
        const tableName = match[1];
        const columns = match[2].split(',').map(c => c.trim());
        const values = params || [];

        const row: any = {};
        columns.forEach((col, idx) => {
          row[col] = values[idx];
        });

        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
          this.autoIncrementIds.set(tableName, 0);
        }

        this.tables.get(tableName)!.push(row);
        const id = (this.autoIncrementIds.get(tableName) || 0) + 1;
        this.autoIncrementIds.set(tableName, id);

        return { rowsAffected: 1, lastInsertId: String(id) };
      }
    }

    if (upperSql.startsWith('UPDATE')) {
      const match = sql.match(/UPDATE (\w+) SET (.+?) WHERE (.+)/i);
      if (match) {
        const tableName = match[1];
        const setClause = match[2];
        const whereClause = match[3];

        const table = this.tables.get(tableName);
        if (!table) return { rowsAffected: 0, lastInsertId: null };

        // For UPDATE: params are [SET_values..., WHERE_values...]
        // WHERE params are at the END of the params array
        const whereParamCount = (whereClause.match(/\?/g) || []).length;
        const whereParamOffset = (params?.length ?? 0) - whereParamCount;

        let updated = 0;
        for (const row of table) {
          if (this.matchWhere(row, whereClause, params, whereParamOffset)) {
            this.applySet(row, setClause, params, 0);
            updated++;
          }
        }

        return { rowsAffected: updated, lastInsertId: null };
      }
    }

    if (upperSql.startsWith('DELETE FROM')) {
      const match = sql.match(/DELETE FROM (\w+) WHERE (.+)/i);
      if (match) {
        const tableName = match[1];
        const whereClause = match[2];

        const table = this.tables.get(tableName);
        if (!table) return { rowsAffected: 0, lastInsertId: null };

        const beforeLength = table.length;
        const filtered = table.filter(row => !this.matchWhere(row, whereClause, params));
        this.tables.set(tableName, filtered);

        return { rowsAffected: beforeLength - filtered.length, lastInsertId: null };
      }
    }

    return { rowsAffected: 0, lastInsertId: null };
  }

  async select(sql: string, params?: any[]): Promise<any[]> {
    const upperSql = sql.toUpperCase().trim();

    if (upperSql.startsWith('SELECT')) {
      const match = sql.match(/SELECT \* FROM (\w+)(?: WHERE (.+?))?(?: ORDER BY (.+?))?(?: LIMIT (\d+|\?))?$/i);
      if (match) {
        const tableName = match[1];
        const whereClause = match[2];
        const orderBy = match[3];
        const limitMatch = match[4];
        let limit: number | undefined;

        if (limitMatch === '?') {
          // LIMIT was a parameter - find it in params array
          const limitParamIndex = params?.length ?? 0;
          // The LIMIT param is always the last param
          limit = params?.[limitParamIndex - 1];
        } else if (limitMatch) {
          limit = parseInt(limitMatch);
        }

        let results = this.tables.get(tableName) || [];

        if (whereClause) {
          results = results.filter(row => this.matchWhere(row, whereClause, params));
        }

        if (orderBy) {
          const [column, direction] = orderBy.split(/\s+/);
          results = [...results].sort((a, b) => {
            const aVal = a[column] || '';
            const bVal = b[column] || '';
            if (direction?.toUpperCase() === 'DESC') {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
        }

        if (limit !== undefined) {
          results = results.slice(0, limit);
        }

        return results;
      }
    }

    return [];
  }

  private matchWhere(row: any, whereClause: string, params?: any[], paramOffset: number = 0): boolean {
    const conditions = whereClause.split(' AND ');

    for (const condition of conditions) {
      const trimmed = condition.trim();

      if (trimmed.includes('IS NULL')) {
        const [column] = trimmed.split(' IS NULL');
        if (row[column.trim()] !== null && row[column.trim()] !== undefined) {
          return false;
        }
      } else if (trimmed.includes('=')) {
        const parts = trimmed.split('=').map(s => s.trim());
        const column = parts[0];
        const valueOrPlaceholder = parts[1];

        if (valueOrPlaceholder === '?') {
          const expectedValue = params?.[paramOffset];
          if (row[column] !== expectedValue) {
            return false;
          }
          paramOffset++;
        } else {
          // Handle literal values like 'is_active = 1' or 'is_active = TRUE'
          const rowValue = row[column];
          let expectedValue: any = valueOrPlaceholder;

          // Normalize TRUE/FALSE to 1/0 for INTEGER columns
          if (expectedValue.toUpperCase() === 'TRUE') expectedValue = 1;
          else if (expectedValue.toUpperCase() === 'FALSE') expectedValue = 0;
          else if (!isNaN(Number(expectedValue))) expectedValue = Number(expectedValue);

          if (rowValue !== expectedValue) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private applySet(row: any, setClause: string, params?: any[], paramOffset: number = 0): void {
    const assignments = setClause.split(',');

    for (const assignment of assignments) {
      const [column, placeholder] = assignment.split('=').map(s => s.trim());
      if (placeholder === '?') {
        row[column] = params?.[paramOffset];
        paramOffset++;
      }
    }
  }
}

// 全局共享数据库实例
const globalDb = new InMemoryDatabase();

// 在每个测试后清空数据库
afterEach(() => {
  globalDb.clear();
});

// Mock @tauri-apps/plugin-sql
vi.mock('@tauri-apps/plugin-sql', () => {
  return {
    default: class MockDatabase {
      execute = vi.fn().mockImplementation((sql: string, params?: any[]) =>
        globalDb.execute(sql, params)
      );
      select = vi.fn().mockImplementation((sql: string, params?: any[]) =>
        globalDb.select(sql, params)
      );
    },
  };
});

// 全局测试超时设置
vi.setConfig({ testTimeout: 10000 });