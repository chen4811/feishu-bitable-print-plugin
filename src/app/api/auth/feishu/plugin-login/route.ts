/**
 * 飞书多维表格插件登录 API
 * 插件环境直接获取用户信息，无需 OAuth 授权码
 */

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/feishu/plugin-login
 * 插件环境直接登录，无需授权码
 * 
 * 请求体：
 * {
 *   userInfo: {
 *     id: string;
 *     name: string;
 *     avatar?: string;
 *     email?: string;
 *     mobile?: string;
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    console.log('[PluginLogin] ========== 开始插件环境登录 ==========');

    // 解析请求体
    const body = await request.json();
    const { userInfo } = body;

    console.log('[PluginLogin] 收到用户信息:', {
      id: userInfo?.id,
      name: userInfo?.name,
      hasEmail: !!userInfo?.email,
    });

    // 验证必要参数
    if (!userInfo?.id) {
      console.error('[PluginLogin] 缺少用户ID');
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 同步用户到数据库
    console.log('[PluginLogin] 同步用户到数据库:', userInfo.id);
    
    const client = getSupabaseClient();
    
    // 查找现有用户
    const { data: existingUsers } = await client
      .from('users')
      .select('*')
      .eq('feishu_user_id', userInfo.id);

    let dbUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

    if (dbUser) {
      // 更新现有用户
      console.log('[PluginLogin] 更新现有用户:', dbUser.id);
      await client
        .from('users')
        .update({
          name: userInfo.name || dbUser.name,
          avatar: userInfo.avatar || dbUser.avatar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbUser.id);
    } else {
      // 创建新用户
      console.log('[PluginLogin] 创建新用户');
      const { data: newUsers } = await client
        .from('users')
        .insert({
          feishu_user_id: userInfo.id,
          name: userInfo.name || '未知用户',
          avatar: userInfo.avatar || '',
        })
        .select();
      dbUser = newUsers?.[0];
    }

    if (!dbUser) {
      throw new Error('数据库操作失败');
    }

    console.log('[PluginLogin] 用户同步成功:', dbUser.id);

    // 生成 JWT
    const jwtToken = generateToken({
      userId: dbUser.id,
      feishuUserId: userInfo.id,
      name: userInfo.name,
    });

    console.log('[PluginLogin] JWT 生成成功');

    console.log('[PluginLogin] ========== 登录成功 ==========');

    return NextResponse.json({
      success: true,
      userInfo: {
        id: dbUser.id,
        name: dbUser.name,
        avatar: dbUser.avatar,
        feishuUserId: userInfo.id,
      },
      token: jwtToken,
    });
  } catch (error) {
    console.error('[PluginLogin] 登录失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '登录失败' 
      },
      { status: 500 }
    );
  }
}
