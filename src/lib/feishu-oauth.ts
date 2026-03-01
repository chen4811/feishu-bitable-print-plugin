// 飞书 OAuth 2.0 客户端
interface AppAccessTokenCache {
  token: string;
  expireAt: number; // 过期时间戳（毫秒）
}

interface UserAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  user_id: string;
  union_id: string;
  open_id: string;
}

interface UserInfo {
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

let appAccessTokenCache: AppAccessTokenCache | null = null;

/**
 * 获取应用访问令牌 (App Access Token)
 * 带缓存机制，有效期2小时，提前10分钟刷新
 */
export async function getAppAccessToken(): Promise<string> {
  const now = Date.now();
  
  // 如果缓存有效且未过期（提前10分钟刷新）
  if (appAccessTokenCache && now < appAccessTokenCache.expireAt - 10 * 60 * 1000) {
    console.log('[Feishu OAuth] 使用缓存的 app_access_token');
    return appAccessTokenCache.token;
  }

  console.log('[Feishu OAuth] 获取新的 app_access_token');
  
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置');
  }

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
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
    console.error('[Feishu OAuth] 获取 app_access_token 失败:', result);
    throw new Error(`获取飞书访问令牌失败: ${result.msg}`);
  }

  // 缓存 token，expire 单位是秒，转换为毫秒
  appAccessTokenCache = {
    token: result.data.app_access_token,
    expireAt: now + result.data.expire * 1000,
  };

  console.log('[Feishu OAuth] app_access_token 获取成功，有效期:', result.data.expire, '秒');
  return appAccessTokenCache.token;
}

/**
 * 生成 OAuth 授权 URL
 */
export function getOAuthUrl(state: string): string {
  const appId = process.env.FEISHU_APP_ID;
  const redirectUri = process.env.FEISHU_REDIRECT_URI;

  if (!appId || !redirectUri) {
    throw new Error('FEISHU_APP_ID 或 FEISHU_REDIRECT_URI 未配置');
  }

  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: state,
  });

  return `https://open.feishu.cn/open-apis/authen/v1/index?${params.toString()}`;
}

/**
 * 使用授权码获取用户访问令牌
 */
export async function getUserAccessToken(code: string): Promise<UserAccessTokenResponse> {
  console.log('[Feishu OAuth] 使用授权码获取用户访问令牌');
  
  const appAccessToken = await getAppAccessToken();

  const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appAccessToken}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
    }),
  });

  const result: FeishuApiResponse<UserAccessTokenResponse> = await response.json();

  if (result.code !== 0) {
    console.error('[Feishu OAuth] 获取用户访问令牌失败:', result);
    throw new Error(`获取用户访问令牌失败: ${result.msg}`);
  }

  console.log('[Feishu OAuth] 获取用户访问令牌成功');
  return result.data;
}

/**
 * 使用用户访问令牌获取用户信息
 */
export async function getUserInfo(userAccessToken: string): Promise<UserInfo> {
  console.log('[Feishu OAuth] 获取用户信息');

  const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userAccessToken}`,
    },
  });

  const result: FeishuApiResponse<UserInfo> = await response.json();

  if (result.code !== 0) {
    console.error('[Feishu OAuth] 获取用户信息失败:', result);
    throw new Error(`获取用户信息失败: ${result.msg}`);
  }

  console.log('[Feishu OAuth] 获取用户信息成功:', {
    union_id: result.data.union_id,
    name: result.data.name,
  });

  return result.data;
}
