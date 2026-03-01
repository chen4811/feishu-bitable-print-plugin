import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 获取用户的授权码列表
export async function GET(request: Request) {
  try {
    // 获取 Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    const client = getSupabaseClient();

    const { data: authorizations, error } = await client
      .from('user_table_authorizations')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Authorizations API] 查询授权码失败:', error);
      return NextResponse.json(
        { error: '查询授权码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: authorizations || [],
    });
  } catch (error) {
    console.error('[Authorizations API] 获取授权码列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取授权码列表失败' },
      { status: 500 }
    );
  }
}

// 新增授权码
export async function POST(request: Request) {
  try {
    // 获取 Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    const body = await request.json();
    const { tableId, tableName, appToken } = body;

    if (!tableId || !appToken) {
      return NextResponse.json(
        { error: '表格ID和授权码不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 先检查是否已存在相同的记录
    const { data: existing, error: findError } = await client
      .from('user_table_authorizations')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('table_id', tableId);

    if (findError) {
      console.error('[Authorizations API] 检查授权码失败:', findError);
      return NextResponse.json(
        { error: '检查授权码失败' },
        { status: 500 }
      );
    }

    let result;
    if (existing && existing.length > 0) {
      // 更新现有记录
      const { data, error } = await client
        .from('user_table_authorizations')
        .update({
          table_name: tableName,
          app_token: appToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id)
        .select();

      if (error) {
        console.error('[Authorizations API] 更新授权码失败:', error);
        return NextResponse.json(
          { error: '更新授权码失败' },
          { status: 500 }
        );
      }
      result = data[0];
    } else {
      // 创建新记录
      const { data, error } = await client
        .from('user_table_authorizations')
        .insert({
          user_id: decoded.userId,
          table_id: tableId,
          table_name: tableName,
          app_token: appToken,
        })
        .select();

      if (error) {
        console.error('[Authorizations API] 保存授权码失败:', error);
        return NextResponse.json(
          { error: '保存授权码失败' },
          { status: 500 }
        );
      }
      result = data[0];
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Authorizations API] 保存授权码错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存授权码失败' },
      { status: 500 }
    );
  }
}
