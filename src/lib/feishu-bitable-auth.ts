/**
 * 飞书多维表格侧边栏插件 - 客户端登录
 * 
 * 插件环境可以直接获取用户信息，无需 OAuth 授权码
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
 * 检查可用的API方法
 */
export function checkAvailableAPIs(): string[] {
  const bitable = getBitable();
  if (!bitable) return [];
  
  const apis: string[] = [];
  
  // 检查 base 对象
  if (bitable.base) {
    apis.push('base');
    if (typeof bitable.base.getUserInfo === 'function') apis.push('base.getUserInfo');
    if (typeof bitable.base.getCurrentUser === 'function') apis.push('base.getCurrentUser');
    if (typeof bitable.base.getTenantAccessToken === 'function') apis.push('base.getTenantAccessToken');
  }
  
  // 检查 authen 对象
  if (bitable.authen) {
    apis.push('authen');
    if (typeof bitable.authen.getUserInfo === 'function') apis.push('authen.getUserInfo');
    if (typeof bitable.authen.requestAuthCode === 'function') apis.push('authen.requestAuthCode');
  }
  
  // 检查 auth 对象
  if (bitable.auth) {
    apis.push('auth');
    if (typeof bitable.auth.getUserInfo === 'function') apis.push('auth.getUserInfo');
  }
  
  return apis;
}

/**
 * 获取插件环境用户信息
 * 尝试多种可用的 API 方法
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

    // 检查可用的API
    const availableAPIs = checkAvailableAPIs();
    console.log('[BitableAuth] 可用API列表:', availableAPIs);

    let userInfo: any = null;
    let methodUsed = '';

    // 方法1: 使用 base.getCurrentUser (推荐)
    if (!userInfo && bitable.base && typeof bitable.base.getCurrentUser === 'function') {
      try {
        console.log('[BitableAuth] 尝试使用 base.getCurrentUser...');
        userInfo = await bitable.base.getCurrentUser();
        methodUsed = 'base.getCurrentUser';
        console.log('[BitableAuth] 通过 base.getCurrentUser 获取成功');
      } catch (e) {
        console.log('[BitableAuth] base.getCurrentUser 失败:', e);
      }
    }

    // 方法2: 使用 authen.getUserInfo
    if (!userInfo && bitable.authen && typeof bitable.authen.getUserInfo === 'function') {
      try {
        console.log('[BitableAuth] 尝试使用 authen.getUserInfo...');
        userInfo = await bitable.authen.getUserInfo();
        methodUsed = 'authen.getUserInfo';
        console.log('[BitableAuth] 通过 authen.getUserInfo 获取成功');
      } catch (e) {
        console.log('[BitableAuth] authen.getUserInfo 失败:', e);
      }
    }

    // 方法3: 使用 auth.getUserInfo
    if (!userInfo && bitable.auth && typeof bitable.auth.getUserInfo === 'function') {
      try {
        console.log('[BitableAuth] 尝试使用 auth.getUserInfo...');
        userInfo = await bitable.auth.getUserInfo();
        methodUsed = 'auth.getUserInfo';
        console.log('[BitableAuth] 通过 auth.getUserInfo 获取成功');
      } catch (e) {
        console.log('[BitableAuth] auth.getUserInfo 失败:', e);
      }
    }

    // 方法4: 获取 tenant_access_token 作为降级方案
    if (!userInfo && bitable.base && typeof bitable.base.getTenantAccessToken === 'function') {
      try {
        console.log('[BitableAuth] 尝试获取 tenant_access_token...');
        const token = await bitable.base.getTenantAccessToken();
        methodUsed = 'base.getTenantAccessToken';
        console.log('[BitableAuth] 获取 tenant_access_token 成功');
        
        // 使用 token 尝试从后端获取用户信息
        return await loginWithTenantToken(token);
      } catch (e) {
        console.log('[BitableAuth] 获取 tenant_access_token 失败:', e);
      }
    }

    if (!userInfo) {
      throw new Error('没有可用的用户信息获取API，请检查SDK版本');
    }

    console.log('[BitableAuth] 获取到用户信息 (方法: ' + methodUsed + '):', {
      id: userInfo?.id || userInfo?.user_id,
      name: userInfo?.name || userInfo?.display_name,
    });

    // 标准化用户数据格式
    const normalizedUserInfo = {
      id: userInfo.id || userInfo.user_id || userInfo.union_id || '',
      name: userInfo.name || userInfo.display_name || '未知用户',
      avatar: userInfo.avatar_url || userInfo.avatar || userInfo.avatar_thumb || '',
      feishuUserId: userInfo.user_id || userInfo.id || userInfo.union_id || '',
      email: userInfo.email || '',
      mobile: userInfo.mobile || '',
    };

    if (!normalizedUserInfo.id) {
      throw new Error('获取用户信息失败：用户ID为空');
    }

    return {
      success: true,
      userInfo: normalizedUserInfo,
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
 * 使用 tenant_access_token 登录
 * 当无法直接获取用户信息时的降级方案
 */
async function loginWithTenantToken(token: string): Promise<{
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
    console.log('[BitableAuth] 使用 tenant_access_token 获取用户信息...');
    
    // 调用后端 API，使用 tenant_access_token 获取用户信息
    const response = await fetch('/api/auth/feishu/tenant-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantAccessToken: token }),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '获取用户信息失败');
    }

    return {
      success: true,
      userInfo: result.userInfo,
    };
  } catch (error) {
    console.error('[BitableAuth] 使用 tenant token 登录失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '登录失败',
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
