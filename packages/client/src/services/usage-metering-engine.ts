/**
 * Usage Metering Engine - 用量计量引擎
 * 
 * 负责:
 * 1. 记录 API 调用的用量 (tokens, cost)
 * 2. 计算不同模型的成本
 * 3. 触发配额检查
 * 4. 提供用量统计查询
 */

import { IUsageRepository } from '../repositories/interfaces';
import { QuotaController } from './quota-controller';

/**
 * 用量记录参数
 */
export interface UsageRecordParams {
  userId: string;
  sessionId: string;
  conversationId: string;
  messageId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * 用量统计结果
 */
export interface UsageStats {
  period: 'today' | 'week' | 'month';
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
}

/**
 * 模型定价配置
 */
interface ModelPricing {
  inputPerToken: number;  // 每输入 token 的价格 (USD)
  outputPerToken: number; // 每输出 token 的价格 (USD)
}

/**
 * 主流 LLM 模型定价表 (USD per token)
 * 数据来源: 各厂商官方定价 (2024)
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4': { inputPerToken: 0.00003, outputPerToken: 0.00006 },
  'gpt-4-turbo': { inputPerToken: 0.00001, outputPerToken: 0.00003 },
  'gpt-4o': { inputPerToken: 0.000005, outputPerToken: 0.000015 },
  'gpt-3.5-turbo': { inputPerToken: 0.0000015, outputPerToken: 0.000002 },
  
  // Anthropic Claude
  'claude-3.5-sonnet': { inputPerToken: 0.000003, outputPerToken: 0.000015 },
  'claude-3-opus': { inputPerToken: 0.000015, outputPerToken: 0.000075 },
  'claude-3-haiku': { inputPerToken: 0.00000025, outputPerToken: 0.00000125 },
  
  // Google Gemini
  'gemini-pro': { inputPerToken: 0.0000005, outputPerToken: 0.0000015 },
  'gemini-1.5-pro': { inputPerToken: 0.0000035, outputPerToken: 0.0000105 },
  
  // 默认定价 (保守估计)
  'default': { inputPerToken: 0.00001, outputPerToken: 0.00003 },
};

/**
 * 用量计量引擎
 * 
 * 核心职责:
 * - 记录每次 API 调用的用量
 * - 根据模型定价计算成本
 * - 自动触发配额检查
 * - 提供多维度用量统计
 */
export class UsageMeteringEngine {
  private usageRepo: IUsageRepository;
  private quotaController: QuotaController;

  /**
   * 构造函数
   * @param usageRepo 用量数据仓库
   * @param quotaController 配额控制器
   */
  constructor(usageRepo: IUsageRepository, quotaController: QuotaController) {
    this.usageRepo = usageRepo;
    this.quotaController = quotaController;
  }

  /**
   * 记录一次 API 调用的用量
   * 
   * 流程:
   * 1. 计算成本
   * 2. 保存到数据库
   * 3. 检查配额
   * 
   * @param params 用量记录参数
   * @throws {QuotaExceededError} 当超出配额限制时
   */
  async recordUsage(params: UsageRecordParams): Promise<void> {
    // 1. 计算成本
    const cost = this.calculateCost(params.model, params.inputTokens, params.outputTokens);

    // 2. 记录到数据库
    await this.usageRepo.record({
      userId: params.userId,
      sessionId: params.sessionId,
      conversationId: params.conversationId,
      messageId: params.messageId,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cost,
      timestamp: new Date(),
    });

    // 3. 检查并执行配额控制
    await this.quotaController.checkAndEnforce(params.userId, {
      userId: params.userId,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cost,
      timestamp: new Date(),
    });
  }

  /**
   * 获取用量统计
   * 
   * @param userId 用户 ID
   * @param period 统计周期 ('today' | 'week' | 'month')
   * @returns 用量统计数据
   */
  async getStats(userId: string, period: 'today' | 'week' | 'month'): Promise<UsageStats> {
    const { start, end } = this.getPeriodRange(period);
    const stats = await this.usageRepo.getStats(userId, { start, end });

    return {
      period,
      ...stats,
    };
  }

  /**
   * 获取指定时间段的用量记录列表
   * 
   * @param userId 用户 ID
   * @param period 时间段
   * @returns 用量记录列表
   */
  async getUsageRecords(
    userId: string,
    period: { start: Date; end: Date }
  ): Promise<Array<{
    id: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    timestamp: Date;
  }>> {
    const records = await this.usageRepo.findByUserId(userId, period);

    return records.map(record => ({
      id: record.id,
      model: record.model,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      cost: record.cost,
      timestamp: record.timestamp,
    }));
  }

  /**
   * 清理旧数据
   * 
   * @param beforeDate 删除此日期之前的所有记录
   * @returns 删除的记录数
   */
  async cleanupOldData(beforeDate: Date): Promise<number> {
    return this.usageRepo.deleteOlderThan(beforeDate);
  }

  /**
   * 计算 API 调用成本
   * 
   * @param model 模型名称
   * @param inputTokens 输入 token 数
   * @param outputTokens 输出 token 数
   * @returns 成本 (USD)
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];
    
    const inputCost = inputTokens * pricing.inputPerToken;
    const outputCost = outputTokens * pricing.outputPerToken;
    
    // 保留 6 位小数,避免浮点数精度问题
    return Math.round((inputCost + outputCost) * 1000000) / 1000000;
  }

  /**
   * 获取时间段的起止日期
   * 
   * @param period 周期类型
   * @returns 起始和结束日期
   */
  private getPeriodRange(period: 'today' | 'week' | 'month'): { start: Date; end: Date } {
    const now = new Date();
    const end = now;
    let start: Date;

    switch (period) {
      case 'today':
        // 今天 00:00:00
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;

      case 'week':
        // 本周一 00:00:00
        const dayOfWeek = now.getDay(); // 0 (Sunday) - 6 (Saturday)
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        start.setHours(0, 0, 0, 0);
        break;

      case 'month':
        // 本月 1 号 00:00:00
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      default:
        throw new Error(`Invalid period: ${period}`);
    }

    return { start, end };
  }
}
