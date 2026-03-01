import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';
import { getUserAccessToken, getUserInfo } from '@/lib/feishu-oauth';

export const dynamic = 'force-dynamic';

// 从请求头获取正确的基础 URL
function getBaseUrl(request: Request): string {
  const headers = new Headers(request.headers);
  const host = headers.get('host') || 'localhost:5000';
  const proto = headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

// 飞书 OAuth 回调处理
export async function GET(request: Request) {
  try {
    console.log('[Feishu OAuth Callback API] 收到回调请求');
    
    const baseUrl = getBaseUrl(request);
    console.log('[Feishu OAuth Callback API] Base URL:', baseUrl);
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      console.error('[Feishu OAuth Callback API] 缺少 code 参数');
      return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl));
    }

    console.log('[Feishu OAuth Callback API] Code:', code ? '***' : 'missing');
    console.log('[Feishu OAuth Callback API] State:', state);

    const client = getSupabaseClient();

    // 1. 使用授权码获取用户访问令牌
    console.log('[Feishu OAuth Callback API] 获取用户访问令牌');
    const userAccessToken = await getUserAccessToken(code);

    // 2. 使用用户访问令牌获取用户信息
    console.log('[Feishu OAuth Callback API] 获取用户信息');
    const feishuUserInfo = await getUserInfo(userAccessToken.access_token);

    // 3. 在数据库中查找或创建用户（使用 union_id 作为唯一标识）
    console.log('[Feishu OAuth Callback API] 查找用户，union_id:', feishuUserInfo.union_id);
    
    let { data: existingUsers, error: findError } = await client
      .from('users')
      .select('*')
      .eq('feishu_union_id', feishuUserInfo.union_id);

    if (findError) {
      console.error('[Feishu OAuth Callback API] 查找用户失败:', findError);
      throw findError;
    }

    let dbUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

    if (!dbUser) {
      console.log('[Feishu OAuth Callback API] 新用户，自动注册');
      const { data: newUser, error: insertError } = await client
        .from('users')
        .insert({
          feishu_user_id: feishuUserInfo.user_id,
          feishu_union_id: feishuUserInfo.union_id,
          feishu_open_id: feishuUserInfo.open_id,
          name: feishuUserInfo.name,
          avatar: feishuUserInfo.avatar.avatar_72,
          email: feishuUserInfo.email,
          tenant_key: feishuUserInfo.tenant_key,
        })
        .select();

      if (insertError) {
        console.error('[Feishu OAuth Callback API] 创建用户失败:', insertError);
        throw insertError;
      }
      
      dbUser = newUser[0];
      console.log('[Feishu OAuth Callback API] 新用户创建成功，ID:', dbUser.id);
    } else {
      console.log('[Feishu OAuth Callback API] 用户已存在，ID:', dbUser.id);
      // 更新用户信息
      const { error: updateError } = await client
        .from('users')
        .update({
          feishu_user_id: feishuUserInfo.user_id,
          feishu_open_id: feishuUserInfo.open_id,
          name: feishuUserInfo.name,
          avatar: feishuUserInfo.avatar.avatar_72,
          email: feishuUserInfo.email,
          tenant_key: feishuUserInfo.tenant_key,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbUser.id);

      if (updateError) {
        console.error('[Feishu OAuth Callback API] 更新用户失败:', updateError);
      }
    }

    // 4. 生成 JWT token
    console.log('[Feishu OAuth Callback API] 生成 JWT token');
    const jwtToken = generateToken({
      userId: dbUser.id,
      unionId: feishuUserInfo.union_id,
      name: feishuUserInfo.name,
    });
    console.log('[Feishu OAuth Callback API] JWT token 生成成功');

    // 5. 检查用户是否已有保存的授权码
    console.log('[Feishu OAuth Callback API] 检查授权码');
    const { data: authorizations, error: authError } = await client
      .from('user_table_authorizations')
      .select('*')
      .eq('user_id', dbUser.id)
      .eq('is_active', true);

    if (authError) {
      console.error('[Feishu OAuth Callback API] 检查授权码失败:', authError);
    }

    const hasAuthorizations = authorizations && authorizations.length > 0;
    console.log('[Feishu OAuth Callback API] 用户授权码数量:', hasAuthorizations ? authorizations.length : 0);

    console.log('[Feishu OAuth Callback API] 登录完成，重定向到前端');

    // 6. 重定向到前端回调页面，通过 URL 参数传递 token
    const callbackUrl = `/auth/callback?token=${jwtToken}&userId=${dbUser.id}&name=${encodeURIComponent(dbUser.name || '')}&hasAuthorizations=${hasAuthorizations}`;
    
    return NextResponse.redirect(new URL(callbackUrl, baseUrl));
  } catch (error) {
    console.error('[Feishu OAuth Callback API] 飞书 OAuth 回调错误:', error);
    // 重定向到错误页面
    return NextResponse.redirect(new URL('/login?error=auth_failed', baseUrl));
  }
}
