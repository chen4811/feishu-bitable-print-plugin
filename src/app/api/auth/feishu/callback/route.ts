import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';
import { getUserAccessToken, getUserInfo } from '@/lib/feishu-oauth';

export const dynamic = 'force-dynamic';

// 从请求头获取正确的基础 URL
function getBaseUrl(request: Request): string {
  // 优先使用环境变量配置的域名
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  const headers = new Headers(request.headers);
  const host = headers.get('host') || 'localhost:5000';
  const proto = headers.get('x-forwarded-proto') || 'http';
  
  // 如果是 localhost，尝试使用飞书重定向 URI 中的域名
  if (host === 'localhost:5000' && process.env.FEISHU_REDIRECT_URI) {
    try {
      const redirectUrl = new URL(process.env.FEISHU_REDIRECT_URI);
      return `${redirectUrl.protocol}//${redirectUrl.host}`;
    } catch {
      // 忽略错误，继续使用默认
    }
  }
  
  return `${proto}://${host}`;
}

// 飞书 OAuth 回调处理
export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  console.log('[Feishu OAuth Callback API] 收到回调请求');
  console.log('[Feishu OAuth Callback API] Base URL:', baseUrl);
  
  try {
    
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
      
      // 使用 union_id 作为 feishu_user_id 的备选（因为飞书 user_info API 可能不返回 user_id）
      const feishuUserId = feishuUserInfo.user_id || feishuUserInfo.union_id || feishuUserInfo.open_id;
      
      if (!feishuUserId) {
        console.error('[Feishu OAuth Callback API] 无法获取用户ID，飞书响应:', feishuUserInfo);
        throw new Error('无法获取用户唯一标识');
      }
      
      const { data: newUser, error: insertError } = await client
        .from('users')
        .insert({
          feishu_user_id: feishuUserId,
          feishu_union_id: feishuUserInfo.union_id,
          name: feishuUserInfo.name,
          avatar: feishuUserInfo.avatar_thumb || feishuUserInfo.avatar_middle || feishuUserInfo.avatar_big || feishuUserInfo.avatar_url || '',
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
          name: feishuUserInfo.name,
          avatar: feishuUserInfo.avatar_thumb || feishuUserInfo.avatar_middle || feishuUserInfo.avatar_big || feishuUserInfo.avatar_url || '',
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
      feishuUserId: feishuUserInfo.union_id,
      name: feishuUserInfo.name,
    });
    console.log('[Feishu OAuth Callback API] JWT token 生成成功，长度:', jwtToken?.length);
    console.log('[Feishu OAuth Callback API] JWT token 前50字符:', jwtToken?.substring(0, 50));

    // 5. 检查用户是否已有绑定的有效授权码
    console.log('[Feishu OAuth Callback API] 检查授权码绑定状态');
    console.log('[Feishu OAuth Callback API] 用户ID:', dbUser.id, '类型:', typeof dbUser.id);
    
    // 尝试用字符串和数字两种类型查询（兼容不同存储格式）
    const userIdStr = String(dbUser.id);
    const userIdNum = Number(dbUser.id);
    
    // 首先尝试字符串类型查询
    let { data: licenses, error: licenseError } = await client
      .from('plugin_licenses')
      .select('*')
      .eq('bound_user_id', userIdStr)
      .eq('status', 'active')
      .gt('valid_until', new Date().toISOString());
    
    // 如果没找到且字符串和数字不同，尝试数字类型
    if ((!licenses || licenses.length === 0) && userIdStr !== String(userIdNum)) {
      console.log('[Feishu OAuth Callback API] 字符串类型查询无结果，尝试数字类型');
      const numResult = await client
        .from('plugin_licenses')
        .select('*')
        .eq('bound_user_id', userIdNum)
        .eq('status', 'active')
        .gt('valid_until', new Date().toISOString());
      
      if (numResult.data && numResult.data.length > 0) {
        licenses = numResult.data;
        licenseError = numResult.error;
      }
    }

    if (licenseError) {
      console.error('[Feishu OAuth Callback API] 检查授权码失败:', licenseError);
    }

    const hasAuthorizations = licenses && licenses.length > 0;
    console.log('[Feishu OAuth Callback API] 用户有效授权码数量:', hasAuthorizations ? licenses!.length : 0);
    if (licenses && licenses.length > 0) {
      console.log('[Feishu OAuth Callback API] 授权码详情:', licenses.map(l => ({ code: l.code, bound_user_id: l.bound_user_id, status: l.status })));
    }

    console.log('[Feishu OAuth Callback API] 登录完成，重定向到前端');
    console.log('[Feishu OAuth Callback API] baseUrl:', baseUrl);
    console.log('[Feishu OAuth Callback API] dbUser.id:', dbUser.id);
    console.log('[Feishu OAuth Callback API] dbUser.name:', dbUser.name);
    console.log('[Feishu OAuth Callback API] hasAuthorizations:', hasAuthorizations);

    // 6. 创建响应，设置 Cookie 并重定向到前端回调页面
    // 将 token 存储在 httpOnly cookie 中（更安全）
    const callbackUrl = `/auth/callback?userId=${dbUser.id}&name=${encodeURIComponent(dbUser.name || '')}&hasAuthorizations=${hasAuthorizations}`;
    
    console.log('[Feishu OAuth Callback API] 回调URL:', callbackUrl);
    
    const fullUrl = new URL(callbackUrl, baseUrl);
    console.log('[Feishu OAuth Callback API] 完整重定向URL:', fullUrl.toString());
    
    // 创建重定向响应并设置 Cookie
    const response = NextResponse.redirect(fullUrl);
    
    // 设置 token cookie - 允许跨域访问
    response.cookies.set('auth_token', jwtToken, {
      httpOnly: false, // 允许前端 JavaScript 读取
      secure: true,    // 跨域需要 secure
      sameSite: 'none', // 允许跨域
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    });
    
    console.log('[Feishu OAuth Callback API] Cookie 已设置，准备重定向');
    
    return response;
  } catch (error) {
    console.error('[Feishu OAuth Callback API] 飞书 OAuth 回调错误:', error);
    // 重定向到错误页面
    return NextResponse.redirect(new URL('/login?error=auth_failed', baseUrl));
  }
}
