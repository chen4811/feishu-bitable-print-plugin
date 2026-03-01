import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, userTableAuthorizations } from '@/lib/db/schema';
import { getFeishuUserAccessToken, getFeishuUserInfo } from '@/lib/feishu-auth';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 飞书登录回调处理
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const isMock = searchParams.get('mock') === 'true';

  console.log('[Feishu Callback] 收到回调请求');
  console.log('[Feishu Callback] code:', code ? '已获取' : '缺失');
  console.log('[Feishu Callback] state:', state);
  console.log('[Feishu Callback] isMock:', isMock);

  if (!code) {
    console.error('[Feishu Callback] 缺少 code 参数');
    return NextResponse.json(
      { success: false, error: 'Missing code parameter' },
      { status: 400 }
    );
  }

  try {
    let userInfo: any;
    let dbUser: any;

    if (isMock) {
      console.log('[Feishu Callback] 使用模拟登录流程');
      
      // 模拟用户信息
      userInfo = {
        user_id: 'mock_user_' + Date.now(),
        union_id: 'mock_union_' + Date.now(),
        name: '测试用户',
        avatar_url: '',
        email: 'test@example.com',
      };

      console.log('[Feishu Callback] 模拟用户信息:', userInfo);
    } else {
      console.log('[Feishu Callback] 开始真实飞书 OAuth 流程');

      // 1. 使用 code 换取用户 access_token
      console.log('[Feishu Callback] 步骤1: 使用 code 换取 access_token');
      const tokenData = await getFeishuUserAccessToken(code);
      console.log('[Feishu Callback] 获取 access_token 成功');

      // 2. 使用 access_token 获取用户信息
      console.log('[Feishu Callback] 步骤2: 获取用户信息');
      userInfo = await getFeishuUserInfo(tokenData.access_token);
      console.log('[Feishu Callback] 获取用户信息成功:', {
        name: userInfo.name,
        feishuUserId: userInfo.user_id,
      });
    }

    // 3. 在数据库中查找或创建用户
    console.log('[Feishu Callback] 步骤3: 查找或创建用户');
    dbUser = await db.query.users.findFirst({
      where: eq(users.feishuUserId, userInfo.user_id),
    });

    if (!dbUser) {
      console.log('[Feishu Callback] 用户不存在，创建新用户');
      const newUserResult = await db.insert(users).values({
        feishuUserId: userInfo.user_id,
        feishuUnionId: userInfo.union_id,
        name: userInfo.name,
        avatar: userInfo.avatar_url,
        email: userInfo.email,
      }).returning();
      
      dbUser = newUserResult[0];
      console.log('[Feishu Callback] 新用户创建成功，ID:', dbUser.id);
    } else {
      console.log('[Feishu Callback] 用户已存在，ID:', dbUser.id);
      // 更新用户信息
      await db.update(users).set({
        name: userInfo.name,
        avatar: userInfo.avatar_url,
        email: userInfo.email,
        updatedAt: new Date(),
      }).where(eq(users.id, dbUser.id));
    }

    // 4. 生成 JWT token
    console.log('[Feishu Callback] 步骤4: 生成 JWT token');
    const jwtToken = generateToken({
      userId: dbUser.id,
      feishuUserId: userInfo.user_id,
      name: userInfo.name,
    });
    console.log('[Feishu Callback] JWT token 生成成功');

    // 5. 检查用户是否已有保存的授权码
    console.log('[Feishu Callback] 步骤5: 检查授权码');
    const authorizations = await db.query.userTableAuthorizations.findMany({
      where: eq(userTableAuthorizations.userId, dbUser.id),
    });
    const hasAuthorizations = authorizations.length > 0;
    console.log('[Feishu Callback] 用户授权码数量:', authorizations.length);

    console.log('[Feishu Callback] 登录流程完成');

    // 返回结果给前端
    return NextResponse.json({
      success: true,
      message: 'Login successful',
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
    console.error('[Feishu Callback] 认证错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    );
  }
}
