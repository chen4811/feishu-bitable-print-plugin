import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { templates } from '@/lib/db/schema';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 获取模板列表
export async function GET(request: NextRequest) {
  try {
    console.log('[API Templates] GET 请求');
    
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const isPublic = searchParams.get('public') === 'true';

    // 从认证中获取用户 ID
    const authUserId = getUserIdFromRequest(request);
    console.log('[API Templates] 认证用户ID:', authUserId);
    console.log('[API Templates] 查询参数 userId:', userId);
    console.log('[API Templates] 查询参数 public:', isPublic);

    // 如果是查询自己的模板，使用认证的用户 ID
    const targetUserId = authUserId || (userId ? parseInt(userId) : null);

    if (!targetUserId && !isPublic) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    console.log('[API Templates] 目标用户ID:', targetUserId);

    // 构建查询条件
    let queryConditions: any[] = [];
    if (targetUserId) {
      queryConditions.push(eq(templates.userId, targetUserId));
    }
    if (isPublic) {
      queryConditions.push(eq(templates.isPublic, true));
    }

    // 从数据库查询模板
    const templateList = await db.query.templates.findMany({
      where: queryConditions.length > 0 ? and(...queryConditions) : undefined,
      orderBy: [desc(templates.updatedAt)],
    });

    console.log('[API Templates] 查询到模板数量:', templateList.length);

    // 转换数据格式，排除敏感信息
    const formattedTemplates = templateList.map((template) => ({
      id: template.id.toString(),
      name: template.name,
      description: template.description,
      thumbnail: template.thumbnail,
      isPublic: template.isPublic,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedTemplates,
      pagination: {
        page: 1,
        pageSize: 100,
        total: formattedTemplates.length,
      },
    });
  } catch (error) {
    console.error('[API Templates] GET 错误:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}

// 创建新模板
export async function POST(request: NextRequest) {
  try {
    console.log('[API Templates] POST 请求');
    
    const body = await request.json();
    const { name, description, thumbnail, data, isPublic } = body;

    console.log('[API Templates] 请求体:', { name, description, isPublic });

    if (!name || !data) {
      return NextResponse.json(
        { success: false, error: 'Name and data are required' },
        { status: 400 }
      );
    }

    // 从认证中获取用户 ID
    const userId = getUserIdFromRequest(request);
    console.log('[API Templates] 认证用户ID:', userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    // 保存模板到数据库
    const result = await db.insert(templates).values({
      userId,
      name,
      description: description || null,
      thumbnail: thumbnail || null,
      data,
      isPublic: isPublic || false,
    }).returning();

    const newTemplate = result[0];
    console.log('[API Templates] 模板创建成功:', newTemplate.id);

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      data: { 
        id: newTemplate.id.toString(),
        name: newTemplate.name,
        description: newTemplate.description,
        createdAt: newTemplate.createdAt.toISOString(),
        updatedAt: newTemplate.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[API Templates] POST 错误:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
