import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 获取单个模板
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    console.log('[API Template] GET 请求, 模板ID:', templateId);

    const numericId = parseInt(templateId);
    if (isNaN(numericId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // 从认证中获取用户 ID
    const userId = getUserIdFromRequest(request);
    console.log('[API Template] 认证用户ID:', userId);

    // 查询模板
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, numericId),
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // 检查权限：只有模板所有者或公开模板可以访问
    if (template.isPublic !== true && template.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    console.log('[API Template] 模板查询成功');

    return NextResponse.json({
      success: true,
      data: {
        id: template.id.toString(),
        name: template.name,
        description: template.description,
        thumbnail: template.thumbnail,
        data: template.data,
        isPublic: template.isPublic,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[API Template] GET 错误:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

// 更新模板
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    console.log('[API Template] PUT 请求, 模板ID:', templateId);

    const numericId = parseInt(templateId);
    if (isNaN(numericId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, thumbnail, data, isPublic } = body;
    console.log('[API Template] 更新数据:', { name, description, isPublic });

    // 从认证中获取用户 ID
    const userId = getUserIdFromRequest(request);
    console.log('[API Template] 认证用户ID:', userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    // 检查模板是否存在且属于当前用户
    const existingTemplate = await db.query.templates.findFirst({
      where: and(eq(templates.id, numericId), eq(templates.userId, userId)),
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found or access denied' },
        { status: 404 }
      );
    }

    // 构建更新数据
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail || null;
    if (data !== undefined) updateData.data = data;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // 更新模板
    await db.update(templates)
      .set(updateData)
      .where(eq(templates.id, numericId));

    console.log('[API Template] 模板更新成功');

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('[API Template] PUT 错误:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// 删除模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    console.log('[API Template] DELETE 请求, 模板ID:', templateId);

    const numericId = parseInt(templateId);
    if (isNaN(numericId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // 从认证中获取用户 ID
    const userId = getUserIdFromRequest(request);
    console.log('[API Template] 认证用户ID:', userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    // 检查模板是否存在且属于当前用户
    const existingTemplate = await db.query.templates.findFirst({
      where: and(eq(templates.id, numericId), eq(templates.userId, userId)),
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found or access denied' },
        { status: 404 }
      );
    }

    // 删除模板
    await db.delete(templates).where(eq(templates.id, numericId));

    console.log('[API Template] 模板删除成功');

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('[API Template] DELETE 错误:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
