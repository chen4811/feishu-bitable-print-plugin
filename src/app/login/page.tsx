'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/store/userStore';
import { Loader2, LogIn, User, AlertCircle } from 'lucide-react';

export default function FeishuLoginPage() {
  const router = useRouter();
  const { isLoggedIn, isAuthCodeBound } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  console.log('[FeishuLoginPage] 渲染，isLoggedIn:', isLoggedIn);
  console.log('[FeishuLoginPage] isAuthCodeBound:', isAuthCodeBound);

  useEffect(() => {
    console.log('[FeishuLoginPage] useEffect 触发');
    console.log('[FeishuLoginPage] isLoggedIn:', isLoggedIn);
    console.log('[FeishuLoginPage] isAuthCodeBound:', isAuthCodeBound);
    
    if (isLoggedIn) {
      if (isAuthCodeBound) {
        console.log('[FeishuLoginPage] 已登录且已绑定授权码，跳转到首页');
        router.push('/');
      } else {
        console.log('[FeishuLoginPage] 已登录但未绑定授权码，跳转到绑定页面');
        router.push('/bind-auth');
      }
    }
  }, [isLoggedIn, isAuthCodeBound, router]);

  const handleFeishuLogin = async () => {
    console.log('[FeishuLoginPage] handleFeishuLogin 被调用');
    setIsLoading(true);
    setError('');

    try {
      // 调用后端 API 获取飞书登录 URL
      console.log('[FeishuLoginPage] 获取飞书登录 URL...');
      const response = await fetch('/api/auth/feishu/login');
      const result = await response.json();

      console.log('[FeishuLoginPage] 获取登录 URL 响应:', result);

      if (!result.success) {
        throw new Error(result.error || '获取登录链接失败');
      }

      // 保存 state 到 localStorage 用于验证
      if (result.state) {
        localStorage.setItem('feishu_login_state', result.state);
      }

      console.log('[FeishuLoginPage] 跳转到飞书登录页面:', result.loginUrl);
      
      // 跳转到飞书登录页面
      window.location.href = result.loginUrl;

    } catch (error) {
      console.error('[FeishuLoginPage] 飞书登录失败:', error);
      setError(error instanceof Error ? error.message : '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoggedIn) {
    console.log('[FeishuLoginPage] 已登录，显示加载状态');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">正在跳转...</p>
        </div>
      </div>
    );
  }

  console.log('[FeishuLoginPage] 显示飞书登录页面');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">飞书登录</CardTitle>
          <CardDescription>
            使用飞书账号登录打印插件
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600"
            onClick={handleFeishuLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                准备登录...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                飞书登录
              </>
            )}
          </Button>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>登录成功后需要绑定多维表格授权码</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
