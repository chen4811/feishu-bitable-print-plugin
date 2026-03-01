import { NextRequest, NextResponse } from 'next/server';

// 飞书登录回调处理
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json(
      { success: false, error: 'Missing code parameter' },
      { status: 400 }
    );
  }

  try {
    // TODO: 实现飞书 OAuth 完整流程
    // 1. 使用 code 换取 access_token
    // POST https://open.feishu.cn/open-apis/authen/v1/access_token
    //
    // 2. 使用 access_token 获取用户信息
    // GET https://open.feishu.cn/open-apis/authen/v1/user_info
    //
    // 3. 在数据库中查找或创建用户
    // 4. 生成 JWT token
    // 5. 检查用户是否已有保存的授权码
    // 6. 返回结果

    // 临时响应（实际开发时替换为真实逻辑）
    return NextResponse.json({
      success: true,
      message: 'Feishu login callback received',
      // 实际会返回: token, user, hasAuthorizations
    });
  } catch (error) {
    console.error('Feishu auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
