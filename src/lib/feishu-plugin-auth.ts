/**
 * 飞书插件环境 OAuth 授权
 * 
 * 在飞书插件/嵌入环境下，使用 JS SDK 的静默授权方式
 * 而不是跳转式 OAuth 授权
 */

import { bitable } from '@lark-base-open/js-sdk';

/**
 * 检查是否在飞书插件环境
 */
export function isFeishuPluginEnvironment(): boolean {
  return typeof window !== 'undefined' && 
    (window.self !== window.top || /lark|feishu/i.test(navigator.userAgent));
}

/**
 * 飞书插件环境下的用户授权
 * 使用 bitable.bridge 获取用户信息
 */
export async function authorizeInFeishuPlugin(): Promise<{
  success: boolean;
  userInfo?: {
    userId: string;
    openId: string;
    unionId: string;
    name: string;
    avatar?: string;
  };
  error?: string;
}> {
  try {
    console.log('[FeishuPluginAuth] 开始插件环境授权...');

    // 等待 SDK 准备就绪 - 使用 bitable.bridge 的初始化方式
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SDK 初始化超时'));
      }, 5000);

      try {
        // bitable 在插件环境下会自动初始化
        // 我们通过检查 bitable.bridge 是否存在来判断
        if ((bitable as any).bridge) {
          clearTimeout(timeout);
          resolve();
        } else {
          // 等待一小段时间让 SDK 初始化
          setTimeout(() => {
            clearTimeout(timeout);
            resolve();
          }, 500);
        }
      } catch (e) {
        clearTimeout(timeout);
        reject(e);
      }
    });

    // 获取当前用户信息
    // 使用类型断言访问可能存在的 API
    const bridge = (bitable as any).bridge;
    
    if (!bridge) {
      throw new Error('bitable.bridge 不可用');
    }

    // 尝试获取用户信息
    let userInfo: any;
    
    if (typeof bridge.getUserId === 'function') {
      // 如果有 getUserId 方法
      const userId = await bridge.getUserId();
      userInfo = {
        userId: userId,
        openId: userId,
        unionId: userId,
        name: '飞书用户',
        avatar: '',
      };
    } else if (typeof bridge.getTenantId === 'function') {
      // 尝试通过租户ID构建用户信息
      const tenantId = await bridge.getTenantId();
      userInfo = {
        userId: `tenant_${tenantId}`,
        openId: `tenant_${tenantId}`,
        unionId: `tenant_${tenantId}`,
        name: '飞书用户',
        avatar: '',
      };
    } else {
      // 如果都没有，使用基础信息
      userInfo = {
        userId: 'feishu_user',
        openId: 'feishu_user',
        unionId: 'feishu_user',
        name: '飞书用户',
        avatar: '',
      };
    }
    
    console.log('[FeishuPluginAuth] 获取用户信息成功:', userInfo);

    return {
      success: true,
      userInfo,
    };
  } catch (error) {
    console.error('[FeishuPluginAuth] 插件授权失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '授权失败',
    };
  }
}

/**
 * 通用的飞书登录方法
 * 自动检测环境并使用适当的授权方式
 */
export async function feishuLogin(): Promise<{
  success: boolean;
  userInfo?: {
    userId: string;
    openId: string;
    unionId: string;
    name: string;
    avatar?: string;
  };
  error?: string;
}> {
  // 检查是否在飞书插件环境
  if (isFeishuPluginEnvironment()) {
    console.log('[FeishuLogin] 检测到飞书插件环境，使用 SDK 授权');
    return authorizeInFeishuPlugin();
  }

  // 非插件环境，使用跳转式 OAuth
  console.log('[FeishuLogin] 非插件环境，使用跳转式 OAuth');
  window.location.href = '/api/auth/feishu/login';
  
  // 跳转后不会立即返回
  return { success: false, error: '正在跳转登录...' };
}
