import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyUserToken } from '@/lib/auth/jwt';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

/**
 * 删除用户账号
 * - 删除用户的所有授权码信息
 * - 删除用户的飞书登录信息
 * - 用户需要重新登录和绑定授权码
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const payload = verifyUserToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const client = getSupabaseClient();

    console.log('[Delete Account API] 开始删除用户账号:', userId);

    // 1. 删除用户的所有授权码信息
    const { error: authError } = await client
      .from('user_table_authorizations')
      .delete()
      .eq('user_id', userId);

    if (authError) {
      console.error('[Delete Account API] 删除授权码失败:', authError);
      return NextResponse.json(
        { success: false, error: '删除授权码信息失败' },
        { status: 500 }
      );
    }

    console.log('[Delete Account API] 授权码已删除');

    // 2. 删除用户的飞书登录信息
    const { error: userError } = await client
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) {
      console.error('[Delete Account API] 删除用户信息失败:', userError);
      return NextResponse.json(
        { success: false, error: '删除用户信息失败' },
        { status: 500 }
      );
    }

    console.log('[Delete Account API] 用户账号已删除:', userId);

    return NextResponse.json({
      success: true,
      message: '账号已删除',
    });
  } catch (error) {
    console.error('[Delete Account API] 删除账号错误:', error);
    return NextResponse.json(
      { success: false, error: '删除账号失败' },
      { status: 500 }
    );
  }
}
