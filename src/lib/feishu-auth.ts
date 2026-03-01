// 飞书认证相关 API
interface FeishuAccessTokenResponse {
  code: number;
  msg: string;
  data: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    refresh_expires_in: number;
  };
}

interface FeishuUserInfoResponse {
  code: number;
  msg: string;
  data: {
    name: string;
    en_name: string;
    avatar_url: string;
    avatar_thumb: string;
    avatar_middle: string;
    avatar_big: string;
    user_id: string;
    union_id: string;
    email: string;
    mobile: string;
    tenant_key: string;
  };
}

interface FeishuAppAccessTokenResponse {
  code: number;
  msg: string;
  app_access_token: string;
  expire: number;
}

// 获取飞书应用 access_token
export async function getFeishuAppAccessToken(): Promise<string> {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('Feishu app credentials not configured');
  }

  console.log('[FeishuAuth] 获取应用 access_token');

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

  const data: FeishuAppAccessTokenResponse = await response.json();

  if (data.code !== 0) {
    throw new Error(`Failed to get app access token: ${data.msg}`);
  }

  console.log('[FeishuAuth] 应用 access_token 获取成功');
  return data.app_access_token;
}

// 使用 code 换取用户 access_token
export async function getFeishuUserAccessToken(code: string): Promise<FeishuAccessTokenResponse['data']> {
  const appAccessToken = await getFeishuAppAccessToken();

  console.log('[FeishuAuth] 使用 code 换取用户 access_token');

  const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appAccessToken}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
    }),
  });

  const data: FeishuAccessTokenResponse = await response.json();

  if (data.code !== 0) {
    throw new Error(`Failed to get user access token: ${data.msg}`);
  }

  console.log('[FeishuAuth] 用户 access_token 获取成功');
  return data.data;
}

// 获取飞书用户信息
export async function getFeishuUserInfo(userAccessToken: string): Promise<FeishuUserInfoResponse['data']> {
  console.log('[FeishuAuth] 获取飞书用户信息');

  const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userAccessToken}`,
    },
  });

  const data: FeishuUserInfoResponse = await response.json();

  if (data.code !== 0) {
    throw new Error(`Failed to get user info: ${data.msg}`);
  }

  console.log('[FeishuAuth] 飞书用户信息获取成功:', {
    name: data.data.name,
    userId: data.data.user_id,
  });

  return data.data;
}
