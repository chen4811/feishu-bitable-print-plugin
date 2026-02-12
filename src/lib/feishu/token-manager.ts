/**
 * 飞书Token管理器
 * 负责管理飞书API的访问令牌
 */

export class TokenManager {
  private static instance: TokenManager;
  private tenantToken: string | null = null;
  private tenantTokenExpireTime: number = 0;
  private userTokens: Map<string, { token: string; expireTime: number }> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * 设置tenant_access_token
   */
  public setTenantToken(token: string, expire: number): void {
    this.tenantToken = token;
    // 提前5分钟过期，避免临界时间问题
    this.tenantTokenExpireTime = Date.now() + (expire - 300) * 1000;
  }

  /**
   * 获取tenant_access_token
   */
  public getTenantToken(): string | null {
    if (!this.tenantToken || Date.now() >= this.tenantTokenExpireTime) {
      return null;
    }
    return this.tenantToken;
  }

  /**
   * 检查tenant_access_token是否过期
   */
  public isTenantTokenExpired(): boolean {
    if (!this.tenantToken) {
      return true;
    }
    return Date.now() >= this.tenantTokenExpireTime;
  }

  /**
   * 设置user_access_token
   */
  public setUserToken(userId: string, token: string, expiresIn: number): void {
    this.userTokens.set(userId, {
      token,
      expireTime: Date.now() + (expiresIn - 300) * 1000,
    });
  }

  /**
   * 获取user_access_token
   */
  public getUserToken(userId: string): string | null {
    const tokenData = this.userTokens.get(userId);
    if (!tokenData || Date.now() >= tokenData.expireTime) {
      return null;
    }
    return tokenData.token;
  }

  /**
   * 删除user_access_token
   */
  public removeUserToken(userId: string): void {
    this.userTokens.delete(userId);
  }

  /**
   * 清除所有token
   */
  public clearAll(): void {
    this.tenantToken = null;
    this.tenantTokenExpireTime = 0;
    this.userTokens.clear();
  }
}

/**
 * 缓存管理器（用于生产环境）
 * 可以替换为Redis等分布式缓存
 */
export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, { value: any; expireTime: number }> = new Map();

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 设置缓存
   */
  public set(key: string, value: any, ttl: number): void {
    this.cache.set(key, {
      value,
      expireTime: Date.now() + ttl * 1000,
    });
  }

  /**
   * 获取缓存
   */
  public get<T = any>(key: string): T | null {
    const data = this.cache.get(key);
    if (!data || Date.now() >= data.expireTime) {
      this.cache.delete(key);
      return null;
    }
    return data.value as T;
  }

  /**
   * 删除缓存
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.cache.entries()) {
      if (now >= data.expireTime) {
        this.cache.delete(key);
      }
    }
  }
}

// 定期清理过期缓存（每5分钟）
if (typeof window === 'undefined') {
  setInterval(() => {
    CacheManager.getInstance().cleanup();
  }, 5 * 60 * 1000);
}
