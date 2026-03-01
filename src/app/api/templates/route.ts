import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 获取模板列表
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

    const { data: templates, error } = await client
      .from('templates')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Templates API] 查询模板失败:', error);
      return NextResponse.json(
        { error: '查询模板失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: templates || [],
    });
  } catch (error) {
    console.error('[Templates API] 获取模板列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取模板列表失败' },
      { status: 500 }
    );
  }
}

// 创建模板
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
    const { name, description, thumbnail, data, isPublic } = body;

    if (!name || !data) {
      return NextResponse.json(
        { error: '模板名称和数据不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    const { data: newTemplate, error } = await client
      .from('templates')
      .insert({
        user_id: decoded.userId,
        name,
        description,
        thumbnail,
        data,
        is_public: isPublic || false,
      })
      .select();

    if (error) {
      console.error('[Templates API] 创建模板失败:', error);
      return NextResponse.json(
        { error: '创建模板失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newTemplate[0],
    });
  } catch (error) {
    console.error('[Templates API] 创建模板错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建模板失败' },
      { status: 500 }
    );
  }
}
