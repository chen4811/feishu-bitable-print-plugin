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
  const hasWindow = typeof window !== 'undefined';
  const isIframe = hasWindow && window.self !== window.top;
  const isLarkFeishu = hasWindow && /lark|feishu/i.test(navigator.userAgent);
  
  console.log('[BitableAuth] 环境检测:', {
    hasWindow,
    isIframe,
    isLarkFeishu,
    userAgent: hasWindow ? navigator.userAgent.slice(0, 50) : 'N/A',
    result: hasWindow && (isIframe || isLarkFeishu),
  });
  
  return hasWindow && (isIframe || isLarkFeishu);
}

/**
 * 请求授权码
 * 使用客户端授权方式 bitable.auth.requestAuthCode，无需重定向 URL
 */
export async function requestAuthCode(scope: string = 'contact:user.base:readonly'): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}> {
  try {
    console.log('[BitableAuth] ========== 开始请求客户端授权码 ==========');
    console.log('[BitableAuth] 请求的 scope:', scope);
    console.log('[BitableAuth] bitable SDK:', bitable ? '已加载' : '未加载');
    
    if (!bitable) {
      throw new Error('bitable SDK 未加载，请检查 @lark-base-open/js-sdk 是否正确导入');
    }
    
    // 输出 bitable 的所有顶层属性
    console.log('[BitableAuth] bitable 对象属性:', Object.keys(bitable));
    console.log('[BitableAuth] bitable.base:', (bitable as any).base ? '存在' : '不存在');
    console.log('[BitableAuth] bitable.auth:', (bitable as any).auth ? '存在' : '不存在');

    // 等待基础库加载完成 (bitable.base.ready)
    console.log('[BitableAuth] 等待 bitable.base.ready...');
    try {
      await (bitable as any).base?.ready;
      console.log('[BitableAuth] bitable.base.ready 成功');
    } catch (readyError) {
      console.error('[BitableAuth] bitable.base.ready 失败:', readyError);
      // 继续尝试
    }

    // 检查 auth 模块
    const auth = (bitable as any).auth;
    console.log('[BitableAuth] auth 模块:', auth ? '存在' : '不存在');
    
    if (!auth) {
      console.error('[BitableAuth] bitable.auth 不存在');
      console.error('[BitableAuth] bitable 完整对象:', bitable);
      throw new Error('bitable.auth 不存在，请检查 SDK 版本和权限配置');
    }
    
    if (typeof auth.requestAuthCode !== 'function') {
      console.error('[BitableAuth] bitable.auth.requestAuthCode 不是函数');
      console.error('[BitableAuth] auth 模块方法:', Object.keys(auth));
      throw new Error('bitable.auth.requestAuthCode 不可用');
    }

    console.log('[BitableAuth] 调用 bitable.auth.requestAuthCode，参数:', { scope });

    // 使用 bitable.auth.requestAuthCode 获取授权码
    // 注意：返回的是字符串（授权码），不是对象
    const authCode = await auth.requestAuthCode({ scope });

    console.log('[BitableAuth] requestAuthCode 返回:', {
      authCode,
      type: typeof authCode,
      hasValue: !!authCode,
    });

    if (!authCode || typeof authCode !== 'string') {
      console.error('[BitableAuth] 返回的授权码无效:', authCode);
      throw new Error('获取授权码失败：返回的授权码无效');
    }

    console.log('[BitableAuth] 授权码获取成功，长度:', authCode.length);
    return {
      success: true,
      code: authCode,
    };
  } catch (error) {
    console.error('[BitableAuth] ========== 获取授权码失败 ==========');
    console.error('[BitableAuth] 错误类型:', error?.constructor?.name);
    console.error('[BitableAuth] 错误信息:', error);
    console.error('[BitableAuth] 错误堆栈:', error instanceof Error ? error.stack : 'N/A');
    
    // 检查是否是权限错误
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
      console.error('[BitableAuth] 可能是权限问题，请检查应用权限设置');
    }
    
    return {
      success: false,
      error: error instanceof Error ? `获取授权码失败: ${error.message}` : '获取授权码失败',
    };
  }
}

/**
 * 完整的客户端授权登录流程
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
  console.log('[BitableAuth] ========== 开始客户端授权登录流程 ==========');
  
  try {
    // 1. 获取授权码
    console.log('[BitableAuth] 步骤 1: 获取授权码');
    const authResult = await requestAuthCode();
    console.log('[BitableAuth] 授权码结果:', { success: authResult.success, hasCode: !!authResult.code });
    
    if (!authResult.success || !authResult.code) {
      console.error('[BitableAuth] 获取授权码失败:', authResult.error);
      return { success: false, error: authResult.error };
    }

    // 2. 调用后端 API 换取用户信息、JWT token
    console.log('[BitableAuth] 步骤 2: 调用后端 API 换取 token');
    console.log('[BitableAuth] API 地址:', '/api/auth/feishu/client-token');
    
    const response = await fetch('/api/auth/feishu/client-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authResult.code }),
    });

    console.log('[BitableAuth] API 响应状态:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('[BitableAuth] API 响应结果:', { 
      success: result.success, 
      hasUserInfo: !!result.userInfo, 
      hasToken: !!result.token,
      error: result.error,
    });

    if (!result.success) {
      console.error('[BitableAuth] 后端返回错误:', result.error);
      return { success: false, error: result.error };
    }

    console.log('[BitableAuth] 客户端授权登录成功');
    return {
      success: true,
      userInfo: result.userInfo,
      token: result.token,
    };
  } catch (error) {
    console.error('[BitableAuth] ========== 客户端授权登录流程失败 ==========');
    console.error('[BitableAuth] 错误:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '登录失败',
    };
  }
}
