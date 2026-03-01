// 飞书 API 客户端 - 按照官方文档实现
interface AppAccessTokenCache {
  token: string;
  expireAt: number; // 过期时间戳（毫秒）
}

let appAccessTokenCache: AppAccessTokenCache | null = null;

interface FeishuUserInfo {
  user_id: string;
  union_id: string;
  open_id: string;
  name: string;
  avatar: {
    avatar_72: string;
    avatar_200: string;
  };
  mobile?: string;
  email?: string;
  tenant_key: string;
}

interface FeishuApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

/**
 * 获取应用访问令牌 (App Access Token)
 * 带缓存机制，有效期2小时，提前10分钟刷新
 */
export async function getAppAccessToken(): Promise<string> {
  const now = Date.now();
  
  // 如果缓存有效且未过期（提前10分钟刷新）
  if (appAccessTokenCache && now < appAccessTokenCache.expireAt - 10 * 60 * 1000) {
    console.log('[Feishu Client] 使用缓存的 app_access_token');
    return appAccessTokenCache.token;
  }

  console.log('[Feishu Client] 获取新的 app_access_token');
  
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置');
  }

  const response = await fetch('https://open.feishu.com/open-apis/auth/v3/app_access_token/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  const result: FeishuApiResponse<{ app_access_token: string; expire: number }> = await response.json();

  if (result.code !== 0) {
    console.error('[Feishu Client] 获取 app_access_token 失败:', result);
    throw new Error(`获取飞书访问令牌失败: ${result.msg}`);
  }

  // 缓存 token，expire 单位是秒，转换为毫秒
  appAccessTokenCache = {
    token: result.data.app_access_token,
    expireAt: now + result.data.expire * 1000,
  };

  console.log('[Feishu Client] app_access_token 获取成功，有效期:', result.data.expire, '秒');
  return appAccessTokenCache.token;
}

/**
 * 使用 user_ticket 获取用户身份信息
 */
export async function getUserInfo(userTicket: string): Promise<FeishuUserInfo> {
  console.log('[Feishu Client] 获取用户信息');
  
  const appAccessToken = await getAppAccessToken();

  const response = await fetch('https://open.feishu.com/open-apis/authen/v1/user_info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appAccessToken}`,
    },
    body: JSON.stringify({
      user_ticket: userTicket,
    }),
  });

  const result: FeishuApiResponse<FeishuUserInfo> = await response.json();

  if (result.code !== 0) {
    console.error('[Feishu Client] 获取用户信息失败:', result);
    
    if (result.code === 99991663) {
      throw new Error('登录凭证已过期，请重新登录');
    } else if (result.code === 99991661) {
      throw new Error('应用访问令牌无效，请重试');
    } else if (result.code === 99991658) {
      throw new Error('应用权限不足');
    } else if (result.code === 99991633) {
      throw new Error('用户不在企业通讯录中');
    }
    
    throw new Error(`获取用户信息失败: ${result.msg}`);
  }

  console.log('[Feishu Client] 获取用户信息成功:', {
    union_id: result.data.union_id,
    name: result.data.name,
  });

  return result.data;
}
