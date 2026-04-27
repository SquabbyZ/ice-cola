/**
 * Service Container - 服务容器
 * 
 * 负责:
 * 1. 管理所有服务的生命周期
 * 2. 提供依赖注入
 * 3. 单例模式确保全局唯一实例
 */

import { SqliteSessionRepository } from '../repositories/sqlite-session-repo';
import { SqliteUsageRepository } from '../repositories/sqlite-usage-repo';
import { IQuotaConfigStore, QuotaConfig, QuotaController } from './quota-controller';
import { UsageMeteringEngine } from './usage-metering-engine';
import { AuthService, LocalAuthProvider } from './auth-service';
import { GatewayClient } from './gateway-client';

/**
 * 简单的内存配置存储 (MVP 版本)
 * 
 * TODO: V2 持久化到数据库或文件系统
 */
class InMemoryQuotaConfigStore implements IQuotaConfigStore {
  private configs: Map<string, QuotaConfig> = new Map();

  async getConfig(userId: string): Promise<QuotaConfig | null> {
    return this.configs.get(userId) || null;
  }

  async saveConfig(config: QuotaConfig): Promise<void> {
    this.configs.set(config.userId, config);
  }
}

/**
 * 服务容器
 * 
 * 提供所有核心服务的统一访问入口
 * 使用单例模式确保全局唯一
 */
export class ServiceContainer {
  private static instance: ServiceContainer | null = null;

  // ==================== Repositories ====================
  
  /** Session 仓库 */
  public readonly sessionRepo: SqliteSessionRepository;
  
  /** Usage 仓库 */
  public readonly usageRepo: SqliteUsageRepository;

  // ==================== Services ====================
  
  /** 配额控制器 */
  public readonly quotaController: QuotaController;
  
  /** 用量计量引擎 */
  public readonly usageMetering: UsageMeteringEngine;
  
  /** 认证服务 */
  public readonly authService: AuthService;
  
  /** Gateway 客户端 */
  public readonly gatewayClient: GatewayClient;

  /**
   * 私有构造函数 (单例模式)
   * @param dbPath 数据库文件路径
   */
  private constructor(dbPath: string) {
    console.log('🔧 Initializing ServiceContainer...');

    // 初始化 Repositories
    this.sessionRepo = new SqliteSessionRepository(dbPath);
    this.usageRepo = new SqliteUsageRepository(dbPath);

    // 初始化配置存储
    const configStore = new InMemoryQuotaConfigStore();

    // 初始化 Services (注意依赖顺序)
    this.quotaController = new QuotaController(this.usageRepo, configStore);
    this.usageMetering = new UsageMeteringEngine(this.usageRepo, this.quotaController);
    
    // 注意: LocalAuthProvider 需要 IUserRepository,这里暂时传 null
    // TODO: Week 3 实现 UserRepository 后修复
    const localAuthProvider = new LocalAuthProvider(null as any);
    this.authService = new AuthService(localAuthProvider);
    
    // 从配置文件读取 Gateway Token
    const gatewayToken = this.readGatewayToken();
    this.gatewayClient = new GatewayClient({
      token: gatewayToken,
      onConnected: () => {
        console.log('🔧 ServiceContainer: Gateway connected');
      },
      onDisconnected: () => {
        console.log('🔧 ServiceContainer: Gateway disconnected');
      },
    });

    console.log('✅ ServiceContainer initialized', gatewayToken ? 'with token' : 'without token');
  }

  /**
   * 获取服务容器实例 (单例)
   * 
   * @param dbPath 数据库文件路径
   * @returns 服务容器实例
   */
  static getInstance(dbPath: string): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(dbPath);
    }
    return ServiceContainer.instance;
  }

  /**
   * 重置实例 (仅用于测试)
   */
  static resetInstance(): void {
    ServiceContainer.instance = null;
  }

  /**
   * 初始化所有服务
   * 
   * 应在应用启动时调用
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing all services...');

    try {
      // 初始化所有 Repository (创建表)
      await this.sessionRepo.initialize();
      await this.usageRepo.initialize();

      console.log('✅ All services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * 从配置文件读取 Gateway Token
   * 
   * @returns Gateway Token (如果存在)
   */
  private readGatewayToken(): string | undefined {
    try {
      // 尝试从 localStorage 读取配置
      const stored = localStorage.getItem('openclaw_gateway_config');
      if (stored) {
        const config = JSON.parse(stored);
        if (config.token) {
          console.log('✅ Loaded Gateway token from localStorage');
          return config.token;
        }
      }
      
      // 如果没有配置，使用默认 token（开发环境）
      // TODO: 生产环境应该从安全的配置源读取
      const defaultToken = 'ff905ffe94711d52ba7ca34cc56399f5788caaf8ec67027c';
      console.log('⚠️ Using default Gateway token (dev mode)');
      return defaultToken;
    } catch (error) {
      console.error('❌ Failed to read Gateway token:', error);
      return undefined;
    }
  }

  /**
   * 清理资源
   * 
   * 应在应用关闭时调用
   */
  async dispose(): Promise<void> {
    console.log('🧹 Disposing ServiceContainer...');

    // 断开 Gateway 连接
    this.gatewayClient.disconnect();

    // 清除当前用户会话
    await this.authService.logout();

    console.log('✅ ServiceContainer disposed');
  }
}

/**
 * 便捷函数: 获取服务容器
 * 
 * @param dbPath 数据库路径
 * @returns 服务容器实例
 */
export function getServiceContainer(dbPath: string = 'openclaw.db'): ServiceContainer {
  return ServiceContainer.getInstance(dbPath);
}
