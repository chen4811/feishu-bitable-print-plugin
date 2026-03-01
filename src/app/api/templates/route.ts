import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 获取模板列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const isPublic = searchParams.get('public') === 'true';

    // TODO: 从数据库查询模板
    // const templates = await db.query.templates.findMany({...});

    return NextResponse.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
      },
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}

// 创建新模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, data, userId } = body;

    if (!name || !data) {
      return NextResponse.json(
        { error: 'Name and data are required' },
        { status: 400 }
      );
    }

    // TODO: 保存模板到数据库
    // const template = await db.insert(templates).values({...});

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      data: { id: 'placeholder' },
    }, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
