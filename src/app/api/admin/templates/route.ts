import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyAdminToken } from '@/lib/auth/jwt';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

// 获取所有模板列表（需要管理员权限）
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

    // 查询所有模板，并关联用户信息
    const { data: templates, error } = await client
      .from('templates')
      .select(`
        *,
        users:user_id (
          id,
          name,
          feishu_user_id,
          avatar
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Admin Templates API] 查询模板失败:', error);
      return NextResponse.json(
        { success: false, error: '查询模板失败' },
        { status: 500 }
      );
    }

    // 格式化数据
    const formattedData = (templates || []).map((template: any) => ({
      id: template.id,
      userId: template.user_id,
      userName: template.users?.name || '未知用户',
      userAvatar: template.users?.avatar || '',
      feishuUserId: template.users?.feishu_user_id || '',
      name: template.name,
      description: template.description,
      isPublic: template.is_public,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('[Admin Templates API] 获取模板列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取模板列表失败' },
      { status: 500 }
    );
  }
}

// 删除模板（需要管理员权限）
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

    // 获取要删除的模板ID
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '模板ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    const { error } = await client
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin Templates API] 删除模板失败:', error);
      return NextResponse.json(
        { success: false, error: '删除模板失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '模板已删除',
    });
  } catch (error) {
    console.error('[Admin Templates API] 删除模板错误:', error);
    return NextResponse.json(
      { success: false, error: '删除模板失败' },
      { status: 500 }
    );
  }
}

// 更新模板状态（需要管理员权限）
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
    const { id, isPublic } = body;

    if (!id || typeof isPublic !== 'boolean') {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    const { error } = await client
      .from('templates')
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[Admin Templates API] 更新模板失败:', error);
      return NextResponse.json(
        { success: false, error: '更新模板失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '模板状态已更新',
    });
  } catch (error) {
    console.error('[Admin Templates API] 更新模板错误:', error);
    return NextResponse.json(
      { success: false, error: '更新模板失败' },
      { status: 500 }
    );
  }
}
