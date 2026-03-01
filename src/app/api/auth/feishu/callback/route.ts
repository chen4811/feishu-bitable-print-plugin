import { NextRequest, NextResponse } from 'next/server';

// 飞书登录回调处理
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json(
      { error: 'Missing code parameter' },
      { status: 400 }
    );
  }

  try {
    // TODO: 实现飞书 OAuth 流程
    // 1. 使用 code 换取 access_token
    // 2. 获取用户信息
    // 3. 创建或更新用户记录
    // 4. 设置会话 cookie

    return NextResponse.json({
      success: true,
      message: 'Feishu login callback received',
      code,
      state,
    });
  } catch (error) {
    console.error('Feishu auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
