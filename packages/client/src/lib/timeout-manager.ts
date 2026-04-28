/**
 * TimeoutManager - 统一的超时管理器
 * 
 * 用于管理多个超时定时器，确保在组件卸载时能够正确清理所有定时器，
 * 防止内存泄漏。
 */

export class TimeoutManager {
  private timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * 设置超时定时器
   * 
   * @param id 超时ID（用于后续清除）
   * @param callback 超时回调函数
   * @param delay 延迟时间（毫秒）
   */
  set(id: string, callback: () => void, delay: number): void {
    // 如果已存在同名超时，先清除
    this.clear(id);
    
    const timeoutId = setTimeout(() => {
      this.timeouts.delete(id);
      callback();
    }, delay);
    
    this.timeouts.set(id, timeoutId);
  }

  /**
   * 清除指定的超时定时器
   * 
   * @param id 超时ID
   */
  clear(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }

  /**
   * 清除所有超时定时器
   */
  clearAll(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
  }

  /**
   * 获取当前活跃的超时数量
   * 
   * @returns 活跃超时数量
   */
  get size(): number {
    return this.timeouts.size;
  }

  /**
   * 检查是否存在指定的超时
   * 
   * @param id 超时ID
   * @returns 是否存在
   */
  has(id: string): boolean {
    return this.timeouts.has(id);
  }
}
