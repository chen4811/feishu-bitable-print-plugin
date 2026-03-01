import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 获取单个模板
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
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

    const { data: template, error } = await client
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Template API] 查询模板失败:', error);
      return NextResponse.json(
        { error: '查询模板失败' },
        { status: 500 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }

    // 检查权限：只有模板所有者或公开模板可以访问
    if (template.user_id !== decoded.userId && !template.is_public) {
      return NextResponse.json(
        { error: '无权访问此模板' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[Template API] 获取模板错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取模板失败' },
      { status: 500 }
    );
  }
}

// 更新模板
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
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

    const client = getSupabaseClient();

    // 先检查模板是否存在且属于当前用户
    const { data: existingTemplate, error: findError } = await client
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingTemplate) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }

    if (existingTemplate.user_id !== decoded.userId) {
      return NextResponse.json(
        { error: '无权修改此模板' },
        { status: 403 }
      );
    }

    const { data: updatedTemplate, error } = await client
      .from('templates')
      .update({
        name: name || existingTemplate.name,
        description: description !== undefined ? description : existingTemplate.description,
        thumbnail: thumbnail !== undefined ? thumbnail : existingTemplate.thumbnail,
        data: data || existingTemplate.data,
        is_public: isPublic !== undefined ? isPublic : existingTemplate.is_public,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Template API] 更新模板失败:', error);
      return NextResponse.json(
        { error: '更新模板失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTemplate[0],
    });
  } catch (error) {
    console.error('[Template API] 更新模板错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新模板失败' },
      { status: 500 }
    );
  }
}

// 删除模板
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
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

    // 先检查模板是否存在且属于当前用户
    const { data: existingTemplate, error: findError } = await client
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingTemplate) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }

    if (existingTemplate.user_id !== decoded.userId) {
      return NextResponse.json(
        { error: '无权删除此模板' },
        { status: 403 }
      );
    }

    const { error } = await client
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Template API] 删除模板失败:', error);
      return NextResponse.json(
        { error: '删除模板失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '模板删除成功',
    });
  } catch (error) {
    console.error('[Template API] 删除模板错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除模板失败' },
      { status: 500 }
    );
  }
}
