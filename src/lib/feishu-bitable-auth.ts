/**
 * 飞书多维表格侧边栏插件 - 客户端登录
 * 
 * 插件环境可以直接获取用户信息，无需 OAuth 授权码
 * 使用 bitable.base.getUserInfo() 获取当前登录用户
 */

import { bitable as importedBitable } from '@lark-base-open/js-sdk';

// 尝试从多个来源获取 bitable 对象
function getBitable() {
  if (typeof window === 'undefined') return null;
  
  // 1. 优先使用 window.bitable（插件环境自动注入）
  if ((window as any).bitable) {
    console.log('[BitableAuth] 使用 window.bitable');
    return (window as any).bitable;
  }
  
  // 2. 使用导入的 SDK
  if (importedBitable) {
    console.log('[BitableAuth] 使用导入的 @lark-base-open/js-sdk');
    return importedBitable;
  }
  
  return null;
}

/**
 * 检查是否在多维表格插件环境
 */
export function isBitablePlugin(): boolean {
  const hasWindow = typeof window !== 'undefined';
  const isIframe = hasWindow && window.self !== window.top;
  const isLarkFeishu = hasWindow && /lark|feishu/i.test(navigator.userAgent);
  
  return hasWindow && (isIframe || isLarkFeishu || !!(window as any).bitable);
}

/**
 * 获取插件环境用户信息
 * 直接使用 bitable.base.getUserInfo()，无需授权码
 */
export async function getPluginUserInfo(): Promise<{
  success: boolean;
  userInfo?: {
    id: string;
    name: string;
    avatar?: string;
    feishuUserId: string;
    email?: string;
    mobile?: string;
  };
  error?: string;
}> {
  try {
    console.log('[BitableAuth] ========== 开始获取插件环境用户信息 ==========');

    const bitable = getBitable();
    
    if (!bitable) {
      throw new Error('无法获取 bitable SDK，请确保在多维表格插件环境中运行');
    }
    
    // 等待基础库加载完成
    console.log('[BitableAuth] 等待 bitable.base.ready...');
    await bitable.base.ready;
    console.log('[BitableAuth] bitable.base.ready 成功');

    // 直接获取用户信息
    console.log('[BitableAuth] 调用 bitable.base.getUserInfo()...');
    const userInfo = await bitable.base.getUserInfo();
    
    console.log('[BitableAuth] 获取到用户信息:', {
      id: userInfo?.id,
      name: userInfo?.name,
      email: userInfo?.email,
    });

    if (!userInfo || !userInfo.id) {
      throw new Error('获取用户信息失败：返回数据无效');
    }

    return {
      success: true,
      userInfo: {
        id: userInfo.id,
        name: userInfo.name || '未知用户',
        avatar: userInfo.avatar_url,
        feishuUserId: userInfo.id,
        email: userInfo.email,
        mobile: userInfo.mobile,
      },
    };
  } catch (error) {
    console.error('[BitableAuth] 获取用户信息失败:', error);
    
    return {
      success: false,
      error: error instanceof Error ? `获取用户信息失败: ${error.message}` : '获取用户信息失败',
    };
  }
}

/**
 * 获取 tenant_access_token（应用身份）
 * 用于调用 OpenAPI
 */
export async function getTenantAccessToken(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    console.log('[BitableAuth] 获取 tenant_access_token...');

    const bitable = getBitable();
    
    if (!bitable) {
      throw new Error('无法获取 bitable SDK');
    }
    
    await bitable.base.ready;
    const token = await bitable.base.getTenantAccessToken();
    
    console.log('[BitableAuth] 获取 token 成功');
    return { success: true, token };
  } catch (error) {
    console.error('[BitableAuth] 获取 token 失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取 token 失败',
    };
  }
}

/**
 * 插件环境登录
 * 直接获取用户信息并同步到后端
 */
export async function loginWithPluginAuth(): Promise<{
  success: boolean;
  userInfo?: {
    id: string;
    name: string;
    avatar?: string;
    feishuUserId: string;
  };
  token?: string;
  error?: string;
}> {
  console.log('[BitableAuth] ========== 开始插件环境登录 ==========');
  
  try {
    // 1. 获取插件环境用户信息
    console.log('[BitableAuth] 步骤 1: 获取插件环境用户信息');
    const userResult = await getPluginUserInfo();
    
    if (!userResult.success || !userResult.userInfo) {
      console.error('[BitableAuth] 获取用户信息失败:', userResult.error);
      return { success: false, error: userResult.error };
    }

    console.log('[BitableAuth] 获取用户信息成功:', userResult.userInfo.name);

    // 2. 调用后端 API 同步用户并获取 JWT token
    console.log('[BitableAuth] 步骤 2: 同步用户到后端');
    
    const response = await fetch('/api/auth/feishu/plugin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInfo: userResult.userInfo,
      }),
    });

    console.log('[BitableAuth] API 响应状态:', response.status);
    
    const result = await response.json();
    console.log('[BitableAuth] API 响应:', { 
      success: result.success, 
      hasUserInfo: !!result.userInfo, 
      hasToken: !!result.token,
      error: result.error,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      userInfo: result.userInfo,
      token: result.token,
    };
  } catch (error) {
    console.error('[BitableAuth] 登录流程失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '登录失败',
    };
  }
}

/**
 * 兼容旧代码：请求授权码（插件环境不需要）
 * @deprecated 插件环境直接使用 getPluginUserInfo
 */
export async function requestAuthCode(_scope?: string): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}> {
  console.warn('[BitableAuth] requestAuthCode 在插件环境中不需要，请使用 loginWithPluginAuth');
  return {
    success: false,
    error: '插件环境不需要授权码，请使用 loginWithPluginAuth',
  };
}

/**
 * 兼容旧代码：完整的客户端授权登录流程
 * @deprecated 请使用 loginWithPluginAuth
 */
export async function loginWithClientAuth(): Promise<{
  success: boolean;
  userInfo?: {
    id: string;
    name: string;
    avatar?: string;
    feishuUserId: string;
  };
  token?: string;
  error?: string;
}> {
  return loginWithPluginAuth();
}
