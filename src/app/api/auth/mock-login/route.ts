import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, userTableAuthorizations } from '@/lib/db/schema';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 模拟登录 - 直接返回登录结果，不需要跳转
export async function POST() {
  try {
    console.log('[Mock Login API] 模拟登录请求');

    // 模拟用户信息
    const mockUserInfo = {
      user_id: 'mock_user_' + Date.now(),
      union_id: 'mock_union_' + Date.now(),
      name: '测试用户',
      avatar_url: '',
      email: 'test@example.com',
    };

    console.log('[Mock Login API] 模拟用户信息:', mockUserInfo);

    // 在数据库中查找或创建用户
    console.log('[Mock Login API] 查找或创建用户');
    let dbUser = await db.query.users.findFirst({
      where: eq(users.feishuUserId, mockUserInfo.user_id),
    });

    if (!dbUser) {
      console.log('[Mock Login API] 用户不存在，创建新用户');
      const newUserResult = await db.insert(users).values({
        feishuUserId: mockUserInfo.user_id,
        feishuUnionId: mockUserInfo.union_id,
        name: mockUserInfo.name,
        avatar: mockUserInfo.avatar_url,
        email: mockUserInfo.email,
      }).returning();
      
      dbUser = newUserResult[0];
      console.log('[Mock Login API] 新用户创建成功，ID:', dbUser.id);
    } else {
      console.log('[Mock Login API] 用户已存在，ID:', dbUser.id);
      // 更新用户信息
      await db.update(users).set({
        name: mockUserInfo.name,
        avatar: mockUserInfo.avatar_url,
        email: mockUserInfo.email,
        updatedAt: new Date(),
      }).where(eq(users.id, dbUser.id));
    }

    // 生成 JWT token
    console.log('[Mock Login API] 生成 JWT token');
    const jwtToken = generateToken({
      userId: dbUser.id,
      feishuUserId: mockUserInfo.user_id,
      name: mockUserInfo.name,
    });
    console.log('[Mock Login API] JWT token 生成成功');

    // 检查用户是否已有保存的授权码
    console.log('[Mock Login API] 检查授权码');
    const authorizations = await db.query.userTableAuthorizations.findMany({
      where: eq(userTableAuthorizations.userId, dbUser.id),
    });
    const hasAuthorizations = authorizations.length > 0;
    console.log('[Mock Login API] 用户授权码数量:', authorizations.length);

    console.log('[Mock Login API] 模拟登录完成');

    // 返回结果给前端
    return NextResponse.json({
      success: true,
      message: 'Mock login successful',
      data: {
        token: jwtToken,
        user: {
          id: dbUser.id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          avatar: dbUser.avatar,
          feishuUserId: dbUser.feishuUserId,
        },
        hasAuthorizations,
      },
    });
  } catch (error) {
    console.error('[Mock Login API] 模拟登录错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Mock login failed' },
      { status: 500 }
    );
  }
}
