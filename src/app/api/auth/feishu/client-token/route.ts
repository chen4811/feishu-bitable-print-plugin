import { NextResponse } from 'next/server';
import { getSystemConfig } from '@/lib/system-config';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/feishu/client-token
 * 使用客户端授权码换取 user_access_token 和用户信息
 * 
 * 请求体：
 * {
 *   code: string;  // 客户端授权码（通过 bitable.auth.requestAuthCode 获取）
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少授权码' },
        { status: 400 }
      );
    }

    console.log('[API] 使用客户端授权码换取 token');

    // 获取应用配置
    const appId = await getSystemConfig('FEISHU_APP_ID');
    const appSecret = await getSystemConfig('FEISHU_APP_SECRET');

    if (!appId || !appSecret) {
      return NextResponse.json(
        { success: false, error: '飞书应用配置不完整' },
        { status: 500 }
      );
    }

    // 1. 使用授权码换取 user_access_token
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: appId,
        client_secret: appSecret,
        code: code,
      }),
    });

    const tokenResult = await tokenResponse.json();

    if (tokenResult.code !== 0) {
      console.error('[API] 换取 token 失败:', tokenResult);
      return NextResponse.json(
        { success: false, error: `换取 token 失败: ${tokenResult.msg}` },
        { status: 400 }
      );
    }

    const userAccessToken = tokenResult.data?.access_token;
    const refreshToken = tokenResult.data?.refresh_token;
    const expiresIn = tokenResult.data?.expires_in;

    if (!userAccessToken) {
      return NextResponse.json(
        { success: false, error: '获取 access_token 失败' },
        { status: 500 }
      );
    }

    console.log('[API] 换取 token 成功');

    // 2. 使用 user_access_token 获取用户信息
    const userInfoResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userAccessToken}`,
      },
    });

    const userInfoResult = await userInfoResponse.json();

    if (userInfoResult.code !== 0) {
      console.error('[API] 获取用户信息失败:', userInfoResult);
      return NextResponse.json(
        { success: false, error: `获取用户信息失败: ${userInfoResult.msg}` },
        { status: 500 }
      );
    }

    const userData = userInfoResult.data;

    console.log('[API] 获取用户信息成功:', {
      userId: userData?.user_id,
      name: userData?.name,
    });

    return NextResponse.json({
      success: true,
      userInfo: {
        userId: userData?.user_id,
        openId: userData?.open_id,
        unionId: userData?.union_id,
        name: userData?.name,
        avatar: userData?.avatar_url || userData?.avatar_thumb,
        email: userData?.email,
        mobile: userData?.mobile,
      },
      tokenInfo: {
        accessToken: userAccessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,
      },
    });
  } catch (error) {
    console.error('[API] 客户端授权登录失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '登录失败' },
      { status: 500 }
    );
  }
}
