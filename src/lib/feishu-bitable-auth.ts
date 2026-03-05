/**
 * 飞书多维表格侧边栏插件 - 客户端授权
 * 
 * 使用 bitable.auth.requestAuthCode 获取授权码
 * 无需配置重定向 URL，适合插件场景
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
  
  console.log('[BitableAuth] 环境检测:', {
    hasWindow,
    isIframe,
    isLarkFeishu,
    hasWindowBitable: hasWindow && !!(window as any).bitable,
    userAgent: hasWindow ? navigator.userAgent.slice(0, 50) : 'N/A',
    result: hasWindow && (isIframe || isLarkFeishu),
  });
  
  return hasWindow && (isIframe || isLarkFeishu);
}

/**
 * 通过 bitable.bridge 调用授权
 * 侧边栏插件环境下 auth 可能在 bridge 中
 */
async function requestAuthCodeViaBridge(scope: string): Promise<string> {
  const bitable = getBitable();
  if (!bitable?.bridge) {
    throw new Error('bitable.bridge 不可用');
  }

  console.log('[BitableAuth] 尝试通过 bitable.bridge 调用授权...');

  // 尝试多种调用方式
  const methods = [
    // 方式1: 直接调用 bridge.callFunction
    async () => {
      console.log('[BitableAuth] 尝试方式1: bridge.callFunction("requestAuthCode")');
      const result = await bitable.bridge.callFunction('requestAuthCode', { scope });
      return result?.data?.code || result?.code || result;
    },
    // 方式2: 调用 bridge 上的 auth 方法
    async () => {
      console.log('[BitableAuth] 尝试方式2: bridge.auth.requestAuthCode');
      if (bitable.bridge.auth?.requestAuthCode) {
        return await bitable.bridge.auth.requestAuthCode({ scope });
      }
      throw new Error('bridge.auth.requestAuthCode 不存在');
    },
    // 方式3: 调用 bridge.call
    async () => {
      console.log('[BitableAuth] 尝试方式3: bridge.call("auth.requestAuthCode")');
      const result = await bitable.bridge.call('auth.requestAuthCode', { scope });
      return result?.code || result;
    },
  ];

  for (let i = 0; i < methods.length; i++) {
    try {
      const code = await methods[i]();
      if (code && typeof code === 'string') {
        console.log(`[BitableAuth] 方式${i + 1}成功，获取授权码`);
        return code;
      }
    } catch (err) {
      console.log(`[BitableAuth] 方式${i + 1}失败:`, (err as Error).message);
    }
  }

  throw new Error('所有 bridge 调用方式均失败');
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

    const bitable = getBitable();
    console.log('[BitableAuth] bitable SDK:', bitable ? '已获取' : '未获取');
    
    if (!bitable) {
      throw new Error('无法获取 bitable SDK，请确保在多维表格插件环境中运行');
    }
    
    // 输出 bitable 的所有顶层属性
    console.log('[BitableAuth] bitable 对象属性:', Object.keys(bitable));
    console.log('[BitableAuth] bitable.base:', bitable.base ? '存在' : '不存在');
    console.log('[BitableAuth] bitable.auth:', bitable.auth ? '存在' : '不存在');
    console.log('[BitableAuth] bitable.bridge:', bitable.bridge ? '存在' : '不存在');

    // 等待基础库加载完成
    if (bitable.base?.ready) {
      console.log('[BitableAuth] 等待 bitable.base.ready...');
      try {
        await bitable.base.ready;
        console.log('[BitableAuth] bitable.base.ready 成功');
      } catch (readyError) {
        console.error('[BitableAuth] bitable.base.ready 失败:', readyError);
      }
    }

    let authCode: string;

    // 尝试方式1: 直接调用 bitable.auth.requestAuthCode
    if (bitable.auth?.requestAuthCode) {
      console.log('[BitableAuth] 使用 bitable.auth.requestAuthCode');
      authCode = await bitable.auth.requestAuthCode({ scope });
    } 
    // 尝试方式2: 通过 bridge 调用
    else if (bitable.bridge) {
      console.log('[BitableAuth] 尝试通过 bitable.bridge 调用授权');
      authCode = await requestAuthCodeViaBridge(scope);
    }
    // 方式3: 尝试使用 window.lark 或 window.Feishu
    else if (typeof window !== 'undefined' && ((window as any).lark || (window as any).Feishu)) {
      console.log('[BitableAuth] 尝试使用 window.lark/window.Feishu');
      const lark = (window as any).lark || (window as any).Feishu;
      if (lark.auth?.requestAuthCode) {
        authCode = await lark.auth.requestAuthCode({ scope });
      } else {
        throw new Error('window.lark.auth.requestAuthCode 不可用');
      }
    }
    else {
      console.error('[BitableAuth] bitable.auth 不存在且没有可用的 bridge');
      console.error('[BitableAuth] bitable 完整对象:', bitable);
      
      // 检查是否是权限问题
      console.error('[BitableAuth] 可能原因:');
      console.error('1. 飞书应用后台未开启"获取用户授权码"权限');
      console.error('2. SDK 版本过低');
      console.error('3. 不在正确的插件环境中运行');
      
      throw new Error('bitable.auth 不存在，请在飞书开发者后台申请"获取用户授权码"权限');
    }

    console.log('[BitableAuth] requestAuthCode 返回:', {
      authCode: authCode ? `${authCode.slice(0, 10)}...` : null,
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
    
    const response = await fetch('/api/auth/feishu/client-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: authResult.code }),
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
