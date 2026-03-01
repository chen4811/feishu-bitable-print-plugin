import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';
import { feishuAuth } from '@/lib/feishu-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const isMock = searchParams.get('mock') === 'true';

    console.log('[Feishu Callback API] 收到回调请求');
    console.log('[Feishu Callback API] Code:', code ? '***' : 'missing');
    console.log('[Feishu Callback API] State:', state);
    console.log('[Feishu Callback API] Is Mock:', isMock);

    const client = getSupabaseClient();
    let userInfo: any;

    if (isMock || !code) {
      console.log('[Feishu Callback API] 使用模拟用户信息');
      // 模拟用户信息
      userInfo = {
        user_id: 'mock_user_' + Date.now(),
        union_id: 'mock_union_' + Date.now(),
        name: '测试用户',
        avatar_url: '',
        email: 'test@example.com',
      };
    } else {
      console.log('[Feishu Callback API] 获取真实飞书用户信息');
      // 1. 用 code 换 access_token
      const tokenResult = await feishuAuth.getUserAccessToken(code);
      console.log('[Feishu Callback API] 获取访问令牌成功');

      // 2. 获取用户信息
      userInfo = await feishuAuth.getUserInfo(tokenResult.access_token);
      console.log('[Feishu Callback API] 获取用户信息成功');
    }

    console.log('[Feishu Callback API] 用户信息:', {
      user_id: userInfo.user_id,
      name: userInfo.name,
    });

    // 3. 在数据库中查找或创建用户
    console.log('[Feishu Callback API] 查找或创建用户');
    let { data: existingUsers, error: findError } = await client
      .from('users')
      .select('*')
      .eq('feishu_user_id', userInfo.user_id);

    if (findError) {
      console.error('[Feishu Callback API] 查找用户失败:', findError);
      throw findError;
    }

    let dbUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

    if (!dbUser) {
      console.log('[Feishu Callback API] 用户不存在，创建新用户');
      const { data: newUser, error: insertError } = await client
        .from('users')
        .insert({
          feishu_user_id: userInfo.user_id,
          feishu_union_id: userInfo.union_id,
          name: userInfo.name,
          avatar: userInfo.avatar_url,
          email: userInfo.email,
        })
        .select();

      if (insertError) {
        console.error('[Feishu Callback API] 创建用户失败:', insertError);
        throw insertError;
      }
      
      dbUser = newUser[0];
      console.log('[Feishu Callback API] 新用户创建成功，ID:', dbUser.id);
    } else {
      console.log('[Feishu Callback API] 用户已存在，ID:', dbUser.id);
      // 更新用户信息
      const { error: updateError } = await client
        .from('users')
        .update({
          name: userInfo.name,
          avatar: userInfo.avatar_url,
          email: userInfo.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbUser.id);

      if (updateError) {
        console.error('[Feishu Callback API] 更新用户失败:', updateError);
      }
    }

    // 4. 生成 JWT token
    console.log('[Feishu Callback API] 生成 JWT token');
    const jwtToken = generateToken({
      userId: dbUser.id,
      feishuUserId: userInfo.user_id,
      name: userInfo.name,
    });
    console.log('[Feishu Callback API] JWT token 生成成功');

    // 5. 检查用户是否已有保存的授权码
    console.log('[Feishu Callback API] 检查授权码');
    const { data: authorizations, error: authError } = await client
      .from('user_table_authorizations')
      .select('*')
      .eq('user_id', dbUser.id);

    if (authError) {
      console.error('[Feishu Callback API] 检查授权码失败:', authError);
    }

    const hasAuthorizations = authorizations && authorizations.length > 0;
    console.log('[Feishu Callback API] 用户授权码数量:', hasAuthorizations ? authorizations.length : 0);

    // 6. 重定向到前端，通过 URL 参数传递 token（生产环境应该用更安全的方式）
    console.log('[Feishu Callback API] 重定向到前端');
    const redirectUrl = `/auth/callback?token=${jwtToken}&userId=${dbUser.id}&name=${encodeURIComponent(dbUser.name || '')}&hasAuthorizations=${hasAuthorizations}`;
    
    console.log('[Feishu Callback API] 回调处理完成');
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('[Feishu Callback API] 飞书登录回调错误:', error);
    // 重定向到错误页面
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}
