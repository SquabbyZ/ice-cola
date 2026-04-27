/**
 * Auth Service - 认证服务
 * 
 * 负责:
 * 1. 用户登录/登出
 * 2. 会话管理
 * 3. 支持多种认证方式 (Local, WeChat, WeCom, DingTalk)
 */

import { IUserRepository, User } from '../repositories/interfaces';

/**
 * 用户会话信息
 */
export interface IUserSession {
  userId: string;
  authType: 'local' | 'wechat' | 'wecom' | 'dingtalk';
  userInfo: {
    displayName: string;
    avatar: string | null;
  };
  accessToken?: string;
  createdAt: Date;
  expiresAt: Date | null;
}

/**
 * 认证提供者接口
 */
export interface IAuthProvider {
  /** 执行认证,返回用户会话 */
  authenticate(...args: any[]): Promise<IUserSession>;
}

/**
 * 认证服务
 * 
 * 核心职责:
 * - 管理用户登录/登出
 * - 维护当前用户会话
 * - 支持多种认证方式
 */
export class AuthService {
  private provider: IAuthProvider;
  private currentSession: IUserSession | null = null;

  /**
   * 构造函数
   * @param provider 认证提供者
   */
  constructor(provider: IAuthProvider) {
    this.provider = provider;
  }

  /**
   * 用户登录
   * 
   * @returns 用户会话信息
   */
  async login(): Promise<IUserSession> {
    try {
      const session = await this.provider.authenticate();
      this.currentSession = session;
      
      // TODO: 将会话保存到本地存储
      // await this.saveSession(session);
      
      console.log(`✅ 用户登录成功: ${session.userInfo.displayName}`);
      return session;
    } catch (error) {
      console.error('❌ 登录失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前用户会话
   * 
   * @returns 当前会话,如果未登录则返回 null
   */
  async getCurrentUser(): Promise<IUserSession | null> {
    if (this.currentSession) {
      return this.currentSession;
    }

    // TODO: 从本地存储恢复会话
    // const savedSession = await this.loadSession();
    // if (savedSession && !this.isSessionExpired(savedSession)) {
    //   this.currentSession = savedSession;
    //   return savedSession;
    // }

    return null;
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    if (!this.currentSession) {
      console.warn('⚠️ 用户未登录');
      return;
    }

    // TODO: 清除本地存储的会话
    // await this.clearSession();

    this.currentSession = null;
    console.log('✅ 用户已登出');
  }

}

/**
 * 本地匿名认证提供者
 * 
 * MVP 版本: 创建或复用本地匿名用户
 */
export class LocalAuthProvider implements IAuthProvider {
  private userRepo: IUserRepository;

  /**
   * 构造函数
   * @param userRepo 用户数据仓库
   */
  constructor(userRepo: IUserRepository) {
    this.userRepo = userRepo;
  }

  /**
   * 执行本地认证
   * 
   * 逻辑:
   * 1. 查找已有的本地用户
   * 2. 如果不存在,创建新的匿名用户
   * 3. 返回用户会话
   * 
   * @returns 用户会话
   */
  async authenticate(): Promise<IUserSession> {
    const user = await this.getOrCreateLocalUser();

    return {
      userId: user.id,
      authType: 'local',
      userInfo: {
        displayName: '本地用户',
        avatar: null,
      },
      createdAt: user.createdAt,
      expiresAt: null, // 永不过期
    };
  }

  /**
   * 获取或创建本地用户
   * 
   * @returns 用户对象
   */
  private async getOrCreateLocalUser(): Promise<User> {
    // 查找已有的用户
    const existingUsers = await this.userRepo.findAll();

    if (existingUsers.length > 0) {
      // 复用第一个用户
      console.log('♻️  复用已有本地用户:', existingUsers[0].id);
      return existingUsers[0];
    }

    // 创建新的匿名用户
    const newUser = await this.userRepo.create({
      authType: 'local',
      externalId: null,
    });

    console.log('✨ 创建新的本地用户:', newUser.id);
    return newUser;
  }
}
