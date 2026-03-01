import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 获取飞书登录链接
export async function GET() {
  try {
    const appId = process.env.FEISHU_APP_ID;
    const redirectUri = process.env.FEISHU_REDIRECT_URI;
    
    console.log('[Feishu Login API] 检查环境变量');
    console.log('[Feishu Login API] FEISHU_APP_ID:', appId ? '已配置' : '未配置');
    console.log('[Feishu Login API] FEISHU_REDIRECT_URI:', redirectUri ? '已配置' : '未配置');
    
    // 降级方案：如果没有配置飞书应用，返回模拟登录流程
    if (!appId || !redirectUri) {
      console.log('[Feishu Login API] 使用降级方案（模拟登录）');
      
      // 生成随机 state
      const state = Math.random().toString(36).substring(7);
      
      // 返回一个特殊的登录 URL，指向我们的模拟回调
      const mockLoginUrl = new URL('/auth/callback', typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
      mockLoginUrl.searchParams.set('code', 'mock_code_' + Date.now());
      mockLoginUrl.searchParams.set('state', state);
      mockLoginUrl.searchParams.set('mock', 'true');

      return NextResponse.json({
        success: true,
        loginUrl: mockLoginUrl.toString(),
        state,
        isMock: true,
      });
    }

    console.log('[Feishu Login API] 使用真实飞书登录');
    
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
      isMock: false,
    });
  } catch (error) {
    console.error('[Feishu Login API] 错误:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate login URL' },
      { status: 500 }
    );
  }
}
