import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 模拟登录 - 直接返回登录结果，不需要跳转
export async function POST() {
  try {
    console.log('[Mock Login API] 模拟登录请求');
    const client = getSupabaseClient();

    // 模拟用户信息
    const mockUserInfo = {
      user_id: 'mock_user_' + Date.now(),
      union_id: 'mock_union_' + Date.now(),
      name: '测试用户',
      avatar_url: '',
      email: 'test@example.com',
    };

    console.log('[Mock Login API] 模拟用户信息:', mockUserInfo);

    // 在数据库中查找或创建用户
    console.log('[Mock Login API] 查找用户');
    let { data: existingUsers, error: findError } = await client
      .from('users')
      .select('*')
      .eq('feishu_user_id', mockUserInfo.user_id);

    if (findError) {
      console.error('[Mock Login API] 查找用户失败:', findError);
      throw findError;
    }

    let dbUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

    if (!dbUser) {
      console.log('[Mock Login API] 用户不存在，创建新用户');
      const { data: newUser, error: insertError } = await client
        .from('users')
        .insert({
          feishu_user_id: mockUserInfo.user_id,
          feishu_union_id: mockUserInfo.union_id,
          name: mockUserInfo.name,
          avatar: mockUserInfo.avatar_url,
          email: mockUserInfo.email,
        })
        .select();

      if (insertError) {
        console.error('[Mock Login API] 创建用户失败:', insertError);
        throw insertError;
      }
      
      dbUser = newUser[0];
      console.log('[Mock Login API] 新用户创建成功，ID:', dbUser.id);
    } else {
      console.log('[Mock Login API] 用户已存在，ID:', dbUser.id);
      // 更新用户信息
      const { error: updateError } = await client
        .from('users')
        .update({
          name: mockUserInfo.name,
          avatar: mockUserInfo.avatar_url,
          email: mockUserInfo.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbUser.id);

      if (updateError) {
        console.error('[Mock Login API] 更新用户失败:', updateError);
      }
    }

    // 生成 JWT token
    console.log('[Mock Login API] 生成 JWT token');
    const jwtToken = generateToken({
      userId: dbUser.id,
      feishuUserId: mockUserInfo.user_id,
      name: mockUserInfo.name,
    });
    console.log('[Mock Login API] JWT token 生成成功');

    // 检查用户是否已有保存的授权码
    console.log('[Mock Login API] 检查授权码');
    const { data: authorizations, error: authError } = await client
      .from('user_table_authorizations')
      .select('*')
      .eq('user_id', dbUser.id);

    if (authError) {
      console.error('[Mock Login API] 检查授权码失败:', authError);
    }

    const hasAuthorizations = authorizations && authorizations.length > 0;
    console.log('[Mock Login API] 用户授权码数量:', hasAuthorizations ? authorizations.length : 0);

    console.log('[Mock Login API] 模拟登录完成');

    // 返回结果给前端
    return NextResponse.json({
      success: true,
      message: 'Mock login successful',
      data: {
        token: jwtToken,
        user: {
          id: dbUser.id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          avatar: dbUser.avatar,
          feishuUserId: dbUser.feishu_user_id,
        },
        hasAuthorizations,
      },
    });
  } catch (error) {
    console.error('[Mock Login API] 模拟登录错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Mock login failed' },
      { status: 500 }
    );
  }
}
