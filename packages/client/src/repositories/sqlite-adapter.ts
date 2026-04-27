/**
 * SQLite Repository 基类
 * 
 * 提供通用的数据库操作方法和表初始化逻辑
 * 所有具体的 Repository 实现都应继承此类
 */

import Database from '@tauri-apps/plugin-sql';

export abstract class SqliteRepository {
  protected db: Database;
  protected initialized: boolean = false;

  /**
   * 构造函数
   * @param dbPath SQLite 数据库文件路径
   */
  constructor(protected dbPath: string) {
    this.db = new Database(`sqlite:${dbPath}`);
  }

  /**
   * 初始化仓库(创建表)
   * 应在首次使用时调用
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.createTables();
      this.initialized = true;
      console.log(`[SqliteRepository] Tables initialized for ${this.constructor.name}`);
    } catch (error) {
      console.error(`[SqliteRepository] Failed to initialize tables:`, error);
      throw error;
    }
  }

  /**
   * 创建数据表(由子类实现)
   */
  protected abstract createTables(): Promise<void>;

  /**
   * 将 Date 对象转换为 ISO 字符串(用于存储)
   */
  protected mapDate(date: Date | string): string {
    return date instanceof Date ? date.toISOString() : date;
  }

  /**
   * 将 ISO 字符串转换为 Date 对象(从数据库读取)
   */
  protected unmapDate(dateStr: string): Date {
    return new Date(dateStr);
  }

  /**
   * 执行 SQL 查询并返回结果
   */
  protected async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      const results = await this.db.select(sql, params || []);
      return results as T[];
    } catch (error) {
      console.error(`[SqliteRepository] Query failed:`, { sql, params, error });
      throw error;
    }
  }

  /**
   * 执行 SQL 命令(INSERT, UPDATE, DELETE)
   */
  protected async execute(sql: string, params?: any[]): Promise<{ rowsAffected: number }> {
    try {
      const result = await this.db.execute(sql, params || []);
      return { rowsAffected: result.rowsAffected || 0 };
    } catch (error) {
      console.error(`[SqliteRepository] Execute failed:`, { sql, params, error });
      throw error;
    }
  }

  /**
   * 在事务中执行多个操作
   */
  protected async transaction<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.execute('BEGIN TRANSACTION');
      const result = await callback();
      await this.execute('COMMIT');
      return result;
    } catch (error) {
      await this.execute('ROLLBACK');
      console.error(`[SqliteRepository] Transaction failed:`, error);
      throw error;
    }
  }

  /**
   * 生成 UUID
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }

  private static lastNowTime = 0;

  /**
   * 获取当前时间的 ISO 字符串
   * 确保每次调用返回不同的值（增加微秒偏移）
   */
  protected now(): string {
    const now = Date.now();
    if (now <= SqliteRepository.lastNowTime) {
      SqliteRepository.lastNowTime += 1;
    } else {
      SqliteRepository.lastNowTime = now;
    }
    return new Date(SqliteRepository.lastNowTime).toISOString();
  }
}
