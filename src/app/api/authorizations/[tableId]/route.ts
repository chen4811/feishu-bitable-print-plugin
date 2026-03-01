import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 获取单个授权码
export async function GET(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const tableId = params.tableId;

    // TODO: 验证用户身份
    // const userId = getUserIdFromToken(request);

    // TODO: 从数据库查询
    // const authorization = await db.query.userTableAuthorizations.findFirst({...});

    return NextResponse.json({
      success: true,
      data: null, // authorization
    });
  } catch (error) {
    console.error('Get authorization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get authorization' },
      { status: 500 }
    );
  }
}

// 更新授权码
export async function PUT(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const tableId = params.tableId;
    const body = await request.json();
    const { appToken, tableName, isActive } = body;

    // TODO: 验证用户身份
    // const userId = getUserIdFromToken(request);

    // TODO: 更新数据库
    // const updateData: any = { updatedAt: new Date() };
    // if (appToken) updateData.appToken = encryptAppToken(appToken);
    // if (tableName) updateData.tableName = tableName;
    // if (isActive !== undefined) updateData.isActive = isActive;

    return NextResponse.json({
      success: true,
      message: 'Authorization updated successfully',
    });
  } catch (error) {
    console.error('Update authorization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update authorization' },
      { status: 500 }
    );
  }
}

// 删除授权码
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const tableId = params.tableId;

    // TODO: 验证用户身份
    // const userId = getUserIdFromToken(request);

    // TODO: 从数据库删除
    // await db.delete(userTableAuthorizations).where(...);

    return NextResponse.json({
      success: true,
      message: 'Authorization deleted successfully',
    });
  } catch (error) {
    console.error('Delete authorization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete authorization' },
      { status: 500 }
    );
  }
}

// 激活授权码（设置为当前使用）
export async function POST(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const tableId = params.tableId;

    // TODO: 验证用户身份
    // const userId = getUserIdFromToken(request);

    // TODO: 更新 lastUsedAt
    // await db.update(userTableAuthorizations)
    //   .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    //   .where(...);

    return NextResponse.json({
      success: true,
      message: 'Authorization activated',
    });
  } catch (error) {
    console.error('Activate authorization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to activate authorization' },
      { status: 500 }
    );
  }
}
