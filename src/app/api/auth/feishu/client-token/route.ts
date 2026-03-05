import { NextResponse } from 'next/server';
import { getSystemConfig } from '@/lib/system-config';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/feishu/client-token
 * 使用客户端授权码换取 user_access_token、用户信息和 JWT token
 * 
 * 请求体：
 * {
 *   code: string;  // 客户端授权码（通过 bitable.auth.requestAuthCode 获取）
 * }
 * 
 * 响应：
 * {
 *   success: boolean;
 *   userInfo?: { id, name, avatar, feishuUserId };
 *   token?: string;  // JWT token
 *   error?: string;
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

    const feishuUser = userInfoResult.data;
    console.log('[API] 获取用户信息成功:', {
      userId: feishuUser?.user_id,
      name: feishuUser?.name,
    });

    // 3. 在数据库中查找或创建用户
    const client = getSupabaseClient();
    const { data: existingUsers } = await client
      .from('users')
      .select('*')
      .eq('feishu_union_id', feishuUser.union_id);

    let dbUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

    if (!dbUser) {
      // 创建新用户
      const { data: newUser } = await client
        .from('users')
        .insert({
          feishu_user_id: feishuUser.user_id || feishuUser.union_id,
          feishu_union_id: feishuUser.union_id,
          name: feishuUser.name,
          avatar: feishuUser.avatar_url || feishuUser.avatar_thumb || '',
        })
        .select();
      dbUser = newUser?.[0];
    } else {
      // 更新用户信息
      await client
        .from('users')
        .update({
          feishu_user_id: feishuUser.user_id || feishuUser.union_id,
          name: feishuUser.name,
          avatar: feishuUser.avatar_url || feishuUser.avatar_thumb || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbUser.id);
    }

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: '用户数据处理失败' },
        { status: 500 }
      );
    }

    // 4. 生成 JWT token
    const jwtToken = generateToken({
      userId: dbUser.id,
      feishuUserId: feishuUser.union_id,
      name: feishuUser.name,
    });

    console.log('[API] 登录成功，用户:', dbUser.id);

    return NextResponse.json({
      success: true,
      userInfo: {
        id: dbUser.id,
        name: feishuUser.name,
        avatar: feishuUser.avatar_url || feishuUser.avatar_thumb || '',
        feishuUserId: feishuUser.user_id,
      },
      token: jwtToken,
    });
  } catch (error) {
    console.error('[API] 客户端授权登录失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '登录失败' },
      { status: 500 }
    );
  }
}
