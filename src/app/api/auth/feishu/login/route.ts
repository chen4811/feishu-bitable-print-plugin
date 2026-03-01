import { NextResponse } from 'next/server';

// 获取飞书登录链接
export async function GET() {
  try {
    const appId = process.env.FEISHU_APP_ID;
    const redirectUri = process.env.FEISHU_REDIRECT_URI;
    
    if (!appId || !redirectUri) {
      return NextResponse.json(
        { success: false, error: 'Feishu app configuration missing' },
        { status: 500 }
      );
    }

    // 生成随机 state 用于防 CSRF
    const state = Math.random().toString(36).substring(7);
    
    // 构建飞书授权 URL
    const loginUrl = new URL('https://open.feishu.cn/open-apis/authen/v1/index');
    loginUrl.searchParams.set('app_id', appId);
    loginUrl.searchParams.set('redirect_uri', redirectUri);
    loginUrl.searchParams.set('state', state);

    return NextResponse.json({
      success: true,
      loginUrl: loginUrl.toString(),
      state,
    });
  } catch (error) {
    console.error('Get feishu login url error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate login URL' },
      { status: 500 }
    );
  }
}
