/**
 * 飞书多维表格侧边栏插件 - 客户端授权
 * 
 * 使用 bitable.auth.requestAuthCode 获取授权码
 * 无需配置重定向 URL，适合插件场景
 */

import { bitable } from '@lark-base-open/js-sdk';

/**
 * 检查是否在多维表格插件环境
 */
export function isBitablePlugin(): boolean {
  return typeof window !== 'undefined' && 
    (window.self !== window.top || /lark|feishu/i.test(navigator.userAgent));
}

/**
 * 请求授权码
 * 使用客户端授权方式，无需重定向 URL
 */
export async function requestAuthCode(scope: string = 'contact:user.base:readonly'): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}> {
  try {
    console.log('[BitableAuth] 请求客户端授权码...');

    // 等待 SDK 就绪
    await (bitable as any).bridge?.onReady?.();

    // 使用 bitable.auth.requestAuthCode 获取授权码
    const authResult = await (bitable as any).auth?.requestAuthCode?.({
      scope,
    });

    if (!authResult?.code) {
      throw new Error('获取授权码失败');
    }

    console.log('[BitableAuth] 授权码获取成功');
    return {
      success: true,
      code: authResult.code,
    };
  } catch (error) {
    console.error('[BitableAuth] 获取授权码失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取授权码失败',
    };
  }
}

/**
 * 完整的客户端授权登录流程
 */
export async function loginWithClientAuth(): Promise<{
  success: boolean;
  userInfo?: {
    userId: string;
    openId: string;
    unionId: string;
    name: string;
    avatar?: string;
    email?: string;
    mobile?: string;
  };
  error?: string;
}> {
  try {
    // 1. 获取授权码
    const authResult = await requestAuthCode();
    if (!authResult.success || !authResult.code) {
      return { success: false, error: authResult.error };
    }

    // 2. 调用后端 API 换取 user_access_token 和用户信息
    const response = await fetch('/api/auth/feishu/client-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authResult.code }),
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      userInfo: result.userInfo,
    };
  } catch (error) {
    console.error('[BitableAuth] 客户端授权登录失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '登录失败',
    };
  }
}
