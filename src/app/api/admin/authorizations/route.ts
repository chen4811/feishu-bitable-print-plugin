import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

// 获取所有用户的授权码列表（需要管理员权限）
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const client = getSupabaseClient();

    // 查询所有授权码
    const { data: authorizations, error: authError } = await client
      .from('user_table_authorizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (authError) {
      console.error('[Admin Authorizations API] 查询授权码失败:', authError);
      return NextResponse.json(
        { success: false, error: '查询授权码失败' },
        { status: 500 }
      );
    }

    // 查询所有用户信息（用于关联）
    const userIds = [...new Set((authorizations || []).map(a => a.user_id).filter(Boolean))];
    let usersMap: Record<number, any> = {};
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await client
        .from('users')
        .select('id, name, feishu_user_id, avatar')
        .in('id', userIds);
      
      if (!usersError && users) {
        usersMap = users.reduce((map, user) => {
          map[user.id] = user;
          return map;
        }, {} as Record<number, any>);
      }
    }

    // 格式化数据
    const formattedData = (authorizations || []).map((auth: any) => {
      const user = usersMap[auth.user_id];
      return {
        id: auth.id,
        userId: auth.user_id,
        userName: user?.name || '未知用户',
        userAvatar: user?.avatar || '',
        feishuUserId: user?.feishu_user_id || '',
        tableId: auth.table_id,
        tableName: auth.table_name,
        appTokenEncrypted: auth.app_token ? auth.app_token.substring(0, 10) + '...' : '',
        isActive: auth.is_active,
        lastUsedAt: auth.last_used_at,
        createdAt: auth.created_at,
        updatedAt: auth.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('[Admin Authorizations API] 获取授权码列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取授权码列表失败' },
      { status: 500 }
    );
  }
}

// 删除授权码（需要管理员权限）
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员身份
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // 获取要删除的授权码ID
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '授权码ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 软删除：将 is_active 设为 false
    const { error } = await client
      .from('user_table_authorizations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[Admin Authorizations API] 删除授权码失败:', error);
      return NextResponse.json(
        { success: false, error: '删除授权码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '授权码已删除',
    });
  } catch (error) {
    console.error('[Admin Authorizations API] 删除授权码错误:', error);
    return NextResponse.json(
      { success: false, error: '删除授权码失败' },
      { status: 500 }
    );
  }
}

// 更新授权码状态（需要管理员权限）
export async function PATCH(request: NextRequest) {
  try {
    // 验证管理员身份
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    const { error } = await client
      .from('user_table_authorizations')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[Admin Authorizations API] 更新授权码失败:', error);
      return NextResponse.json(
        { success: false, error: '更新授权码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '授权码状态已更新',
    });
  } catch (error) {
    console.error('[Admin Authorizations API] 更新授权码错误:', error);
    return NextResponse.json(
      { success: false, error: '更新授权码失败' },
      { status: 500 }
    );
  }
}
