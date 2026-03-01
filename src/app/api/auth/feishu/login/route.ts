import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';
import { getUserInfo } from '@/lib/feishu-client';

export const dynamic = 'force-dynamic';

// 飞书登录 - 使用 user_ticket 方式
export async function POST(request: Request) {
  try {
    console.log('[Feishu Login API] 收到登录请求');
    const body = await request.json();
    const { user_ticket } = body;

    if (!user_ticket) {
      console.error('[Feishu Login API] 缺少 user_ticket');
      return NextResponse.json(
        { success: false, error: '缺少登录凭证' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 1. 使用 user_ticket 获取飞书用户信息
    console.log('[Feishu Login API] 获取飞书用户信息');
    const feishuUserInfo = await getUserInfo(user_ticket);

    // 2. 在数据库中查找或创建用户（使用 union_id 作为唯一标识）
    console.log('[Feishu Login API] 查找用户，union_id:', feishuUserInfo.union_id);
    
    let { data: existingUsers, error: findError } = await client
      .from('users')
      .select('*')
      .eq('feishu_union_id', feishuUserInfo.union_id);

    if (findError) {
      console.error('[Feishu Login API] 查找用户失败:', findError);
      throw findError;
    }

    let dbUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

    if (!dbUser) {
      console.log('[Feishu Login API] 新用户，自动注册');
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
        console.error('[Feishu Login API] 创建用户失败:', insertError);
        throw insertError;
      }
      
      dbUser = newUser[0];
      console.log('[Feishu Login API] 新用户创建成功，ID:', dbUser.id);
    } else {
      console.log('[Feishu Login API] 用户已存在，ID:', dbUser.id);
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
        console.error('[Feishu Login API] 更新用户失败:', updateError);
      }
    }

    // 3. 生成 JWT token
    console.log('[Feishu Login API] 生成 JWT token');
    const jwtToken = generateToken({
      userId: dbUser.id,
      unionId: feishuUserInfo.union_id,
      name: feishuUserInfo.name,
    });
    console.log('[Feishu Login API] JWT token 生成成功');

    // 4. 检查用户是否已有保存的授权码
    console.log('[Feishu Login API] 检查授权码');
    const { data: authorizations, error: authError } = await client
      .from('user_table_authorizations')
      .select('*')
      .eq('user_id', dbUser.id)
      .eq('is_active', true);

    if (authError) {
      console.error('[Feishu Login API] 检查授权码失败:', authError);
    }

    const hasAuthorizations = authorizations && authorizations.length > 0;
    console.log('[Feishu Login API] 用户授权码数量:', hasAuthorizations ? authorizations.length : 0);

    console.log('[Feishu Login API] 登录完成');

    // 返回结果给前端
    return NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        token: jwtToken,
        user: {
          id: dbUser.id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          avatar: dbUser.avatar,
          feishuUserId: dbUser.feishu_user_id,
          feishuUnionId: dbUser.feishu_union_id,
        },
        hasAuthorizations,
      },
    });
  } catch (error) {
    console.error('[Feishu Login API] 飞书登录错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '登录失败' },
      { status: 500 }
    );
  }
}
