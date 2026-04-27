/**
 * Quota Controller - 配额控制器
 * 
 * 负责:
 * 1. 检查用户用量是否超出预算
 * 2. 执行硬限制 (阻止超额使用)
 * 3. 发送警告通知 (接近预算时)
 * 4. 提供配额状态查询
 */

import { IUsageRepository } from '../repositories/interfaces';

/**
 * 配额配置
 */
export interface QuotaConfig {
  userId: string;
  monthlyBudget: number;      // 月度预算 (USD)
  warningThreshold: number;   // 警告阈值 (0.8 = 80%)
  hardLimit: boolean;         // 是否启用硬限制
}

/**
 * 配额状态
 */
export interface QuotaStatus {
  currentCost: number;    // 当前已用金额
  budget: number;         // 总预算
  utilization: number;    // 使用率 (0-1)
  isExceeded: boolean;    // 是否已超出
  isWarning: boolean;     // 是否触发警告
}

/**
 * 配额配置存储接口
 */
export interface IQuotaConfigStore {
  /** 获取用户的配额配置 */
  getConfig(userId: string): Promise<QuotaConfig | null>;
  
  /** 保存用户的配额配置 */
  saveConfig(config: QuotaConfig): Promise<void>;
}

/**
 * 配额超出错误
 */
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * 配额控制器
 * 
 * 核心职责:
 * - 检查用量是否超出预算
 * - 执行硬限制或发送警告
 * - 提供实时配额状态
 */
export class QuotaController {
  private usageRepo: IUsageRepository;
  private configStore: IQuotaConfigStore;

  /**
   * 构造函数
   * @param usageRepo 用量数据仓库
   * @param configStore 配额配置存储
   */
  constructor(usageRepo: IUsageRepository, configStore: IQuotaConfigStore) {
    this.usageRepo = usageRepo;
    this.configStore = configStore;
  }

  /**
   * 检查并执行配额控制
   * 
   * 流程:
   * 1. 获取用户配额配置
   * 2. 计算本月已用金额 + 新用量
   * 3. 判断是否超出预算
   * 4. 如果超出且启用硬限制,抛出异常
   * 5. 如果接近预算,发送警告
   * 
   * @param userId 用户 ID
   * @param newUsage 新增用量
   * @throws {QuotaExceededError} 当超出配额且启用硬限制时
   */
  async checkAndEnforce(
    userId: string,
    newUsage: {
      userId: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      timestamp: Date;
    }
  ): Promise<void> {
    // 1. 获取配额配置
    const config = await this.configStore.getConfig(userId);
    if (!config) {
      // 无配额限制,直接返回
      return;
    }

    // 2. 获取本月已用金额
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const stats = await this.usageRepo.getStats(userId, {
      start: monthStart,
      end: now,
    });

    // 3. 计算预计总金额 (已用 + 新增)
    const projectedTotal = stats.totalCost + newUsage.cost;
    const utilization = projectedTotal / config.monthlyBudget;

    // 4. 检查是否超出预算
    if (utilization >= 1.0 && config.hardLimit) {
      throw new QuotaExceededError(
        `月度预算 $${config.monthlyBudget.toFixed(2)} 已超出。` +
        `当前: $${projectedTotal.toFixed(2)} (${(utilization * 100).toFixed(1)}%)`
      );
    }

    // 5. 检查是否接近预算 (触发警告)
    if (utilization >= config.warningThreshold && utilization < 1.0) {
      await this.sendWarningNotification(userId, utilization, projectedTotal, config.monthlyBudget);
    }
  }

  /**
   * 获取当前配额状态
   * 
   * @param userId 用户 ID
   * @returns 配额状态,如果没有配置则返回 null
   */
  async getStatus(userId: string): Promise<QuotaStatus | null> {
    // 获取配额配置
    const config = await this.configStore.getConfig(userId);
    if (!config) {
      return null;
    }

    // 获取本月已用金额
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const stats = await this.usageRepo.getStats(userId, {
      start: monthStart,
      end: now,
    });

    // 计算使用率
    const utilization = stats.totalCost / config.monthlyBudget;

    return {
      currentCost: stats.totalCost,
      budget: config.monthlyBudget,
      utilization: Math.min(utilization, 1.0),
      isExceeded: utilization >= 1.0,
      isWarning: utilization >= config.warningThreshold && utilization < 1.0,
    };
  }

  /**
   * 更新用户配额配置
   * 
   * @param config 新的配额配置
   */
  async updateConfig(config: QuotaConfig): Promise<void> {
    // 验证配置
    if (config.monthlyBudget <= 0) {
      throw new Error('月度预算必须大于 0');
    }

    if (config.warningThreshold < 0 || config.warningThreshold > 1) {
      throw new Error('警告阈值必须在 0-1 之间');
    }

    await this.configStore.saveConfig(config);
  }

  /**
   * 发送警告通知
   * 
   * TODO: V2 集成系统通知或邮件
   * 
   * @param userId 用户 ID
   * @param utilization 使用率
   * @param currentCost 当前已用金额
   * @param budget 总预算
   */
  private async sendWarningNotification(
    userId: string,
    utilization: number,
    currentCost: number,
    budget: number
  ): Promise<void> {
    const warningMessage = 
      `⚠️ 用量警告: 用户 ${userId} 已达到 ${(utilization * 100).toFixed(0)}% 的预算 ` +
      `($${currentCost.toFixed(2)} / $${budget.toFixed(2)})`;

    console.warn(warningMessage);

    // TODO: V2 实现
    // - 发送桌面通知
    // - 发送邮件提醒
    // - 记录到通知日志
  }
}
