import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 获取用户的所有授权码
export async function GET(request: NextRequest) {
  try {
    // TODO: 验证用户身份（从 JWT token 中获取 userId）
    // const userId = getUserIdFromToken(request);

    // TODO: 从数据库查询该用户的所有授权码
    // const authorizations = await db.query.userTableAuthorizations.findMany({...});

    return NextResponse.json({
      success: true,
      data: [], // authorizations
    });
  } catch (error) {
    console.error('Get authorizations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get authorizations' },
      { status: 500 }
    );
  }
}

// 保存新授权码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, tableName, appToken } = body;

    if (!tableId || !appToken) {
      return NextResponse.json(
        { success: false, error: 'tableId and appToken are required' },
        { status: 400 }
      );
    }

    // TODO: 验证用户身份
    // const userId = getUserIdFromToken(request);

    // TODO: 加密 appToken
    // const encryptedAppToken = encryptAppToken(appToken);

    // TODO: 保存到数据库
    // const authorization = await db.insert(userTableAuthorizations).values({...});

    return NextResponse.json({
      success: true,
      message: 'Authorization saved successfully',
      data: {
        id: 'placeholder',
        tableId,
        tableName,
        isActive: true,
        // 注意：不返回 appToken
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create authorization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save authorization' },
      { status: 500 }
    );
  }
}
