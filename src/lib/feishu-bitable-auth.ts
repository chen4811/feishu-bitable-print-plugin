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
 * 使用客户端授权方式，无需重定向 URL
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
    console.log('[BitableAuth] bitable.bridge:', (bitable as any).bridge ? '存在' : '不存在');
    console.log('[BitableAuth] bitable.auth:', (bitable as any).auth ? '存在' : '不存在');

    // 等待 SDK 就绪
    console.log('[BitableAuth] 等待 SDK 就绪...');
    try {
      await (bitable as any).bridge?.onReady?.();
      console.log('[BitableAuth] SDK 就绪成功');
    } catch (readyError) {
      console.error('[BitableAuth] SDK 就绪失败:', readyError);
      // 继续尝试，有些版本可能不需要等待 onReady
    }

    // 检查 auth 模块
    const auth = (bitable as any).auth;
    console.log('[BitableAuth] auth 模块:', auth ? '存在' : '不存在');
    
    if (auth && typeof auth.requestAuthCode === 'function') {
      console.log('[BitableAuth] 使用 bitable.auth.requestAuthCode 获取授权码');
      console.log('[BitableAuth] requestAuthCode 方法类型:', typeof auth.requestAuthCode);

      // 使用 bitable.auth.requestAuthCode 获取授权码
      console.log('[BitableAuth] 调用 requestAuthCode，参数:', { scope });
      const authResult = await auth.requestAuthCode({
        scope,
      });

      console.log('[BitableAuth] requestAuthCode 返回结果:', {
        hasResult: !!authResult,
        resultType: typeof authResult,
        resultKeys: authResult ? Object.keys(authResult) : 'N/A',
        hasCode: !!(authResult as any)?.code,
        fullResult: authResult,
      });

      if (!authResult || !(authResult as any).code) {
        console.error('[BitableAuth] 返回结果中没有 code');
        throw new Error('获取授权码失败：返回结果中没有 code');
      }

      console.log('[BitableAuth] 授权码获取成功，code 长度:', (authResult as any).code.length);
      return {
        success: true,
        code: (authResult as any).code,
      };
    }
    
    // 备选方案：使用 bitable.bridge.call
    console.log('[BitableAuth] bitable.auth.requestAuthCode 不存在，尝试使用 bridge');
    const bridge = (bitable as any).bridge;
    
    if (bridge) {
      console.log('[BitableAuth] bridge 方法:', Object.keys(bridge));
      
      // 尝试 call 方法
      if (typeof bridge.call === 'function') {
        console.log('[BitableAuth] 使用 bitable.bridge.call 调用 getAuthCode');
        
        try {
          const authResult = await bridge.call('getAuthCode', { scope });
          
          console.log('[BitableAuth] bridge.call 返回结果:', {
            hasResult: !!authResult,
            resultKeys: authResult ? Object.keys(authResult) : 'N/A',
            hasCode: !!(authResult as any)?.code,
            fullResult: authResult,
          });

          if (authResult && (authResult as any).code) {
            return {
              success: true,
              code: (authResult as any).code,
            };
          }
        } catch (callError) {
          console.error('[BitableAuth] bridge.call 失败:', callError);
        }
      }
      
      // 尝试 callMethod 方法（某些版本使用）
      if (typeof bridge.callMethod === 'function') {
        console.log('[BitableAuth] 使用 bitable.bridge.callMethod 调用 getAuthCode');
        
        try {
          const authResult = await bridge.callMethod('getAuthCode', { scope });
          
          console.log('[BitableAuth] bridge.callMethod 返回结果:', {
            hasResult: !!authResult,
            resultKeys: authResult ? Object.keys(authResult) : 'N/A',
            hasCode: !!(authResult as any)?.code,
            fullResult: authResult,
          });

          if (authResult && (authResult as any).code) {
            return {
              success: true,
              code: (authResult as any).code,
            };
          }
        } catch (callMethodError) {
          console.error('[BitableAuth] bridge.callMethod 失败:', callMethodError);
        }
      }
    }
    
    console.error('[BitableAuth] 没有可用的授权方法');
    console.error('[BitableAuth] bitable 完整对象:', bitable);
    throw new Error('无法找到授权方法，请检查 SDK 版本和权限配置');
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
