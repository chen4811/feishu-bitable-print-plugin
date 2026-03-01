import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userTableAuthorizations } from '@/lib/db/schema';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 获取用户的所有授权码
export async function GET(request: NextRequest) {
  try {
    console.log('[API Authorizations] GET 请求');

    // 验证用户身份
    const userId = getUserIdFromRequest(request);
    console.log('[API Authorizations] 用户ID:', userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    // 从数据库查询该用户的所有授权码
    const authorizations = await db.query.userTableAuthorizations.findMany({
      where: eq(userTableAuthorizations.userId, userId),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });

    console.log('[API Authorizations] 查询到授权码数量:', authorizations.length);

    // 转换数据格式，不返回敏感的 appToken
    const formattedAuthorizations = authorizations.map((auth) => ({
      id: auth.id.toString(),
      tableId: auth.tableId,
      tableName: auth.tableName,
      isActive: auth.isActive,
      lastUsedAt: auth.lastUsedAt?.toISOString() || null,
      createdAt: auth.createdAt.toISOString(),
      updatedAt: auth.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedAuthorizations,
    });
  } catch (error) {
    console.error('[API Authorizations] GET 错误:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get authorizations' },
      { status: 500 }
    );
  }
}

// 保存新授权码
export async function POST(request: NextRequest) {
  try {
    console.log('[API Authorizations] POST 请求');

    const body = await request.json();
    const { tableId, tableName, appToken } = body;

    console.log('[API Authorizations] 请求参数:', { tableId, tableName });

    if (!tableId || !appToken) {
      return NextResponse.json(
        { success: false, error: 'tableId and appToken are required' },
        { status: 400 }
      );
    }

    // 验证用户身份
    const userId = getUserIdFromRequest(request);
    console.log('[API Authorizations] 用户ID:', userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }

    // 检查是否已存在相同的授权
    const existingAuth = await db.query.userTableAuthorizations.findFirst({
      where: and(
        eq(userTableAuthorizations.userId, userId),
        eq(userTableAuthorizations.tableId, tableId)
      ),
    });

    if (existingAuth) {
      console.log('[API Authorizations] 更新现有授权码');
      // 更新现有授权
      await db.update(userTableAuthorizations).set({
        tableName: tableName || existingAuth.tableName,
        appToken: appToken, // 注意：实际应用中应该加密存储
        isActive: true,
        updatedAt: new Date(),
      }).where(eq(userTableAuthorizations.id, existingAuth.id));

      return NextResponse.json({
        success: true,
        message: 'Authorization updated successfully',
        data: {
          id: existingAuth.id.toString(),
          tableId,
          tableName: tableName || existingAuth.tableName,
          isActive: true,
        },
      }, { status: 200 });
    }

    console.log('[API Authorizations] 创建新授权码');
    // 保存到数据库
    const result = await db.insert(userTableAuthorizations).values({
      userId,
      tableId,
      tableName: tableName || null,
      appToken: appToken, // 注意：实际应用中应该加密存储
      isActive: true,
    }).returning();

    const newAuthorization = result[0];
    console.log('[API Authorizations] 授权码保存成功，ID:', newAuthorization.id);

    return NextResponse.json({
      success: true,
      message: 'Authorization saved successfully',
      data: {
        id: newAuthorization.id.toString(),
        tableId,
        tableName,
        isActive: true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[API Authorizations] POST 错误:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save authorization' },
      { status: 500 }
    );
  }
}
