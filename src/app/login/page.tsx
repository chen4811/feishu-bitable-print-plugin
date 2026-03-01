'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/store/userStore';
import { Loader2, LogIn, User } from 'lucide-react';

export default function FeishuLoginPage() {
  const router = useRouter();
  const { isLoggedIn, isAuthCodeBound, feishuLogin } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      // 模拟飞书登录流程
      console.log('[FeishuLoginPage] 模拟飞书登录...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 模拟从飞书获取用户信息
      const mockUserInfo = {
        id: 'feishu_user_' + Date.now(),
        name: '飞书用户',
        email: 'user@feishu.com',
        avatar: '',
        feishuUserId: 'ou_1234567890abcdef',
      };

      console.log('[FeishuLoginPage] 获取到飞书用户信息:', mockUserInfo);
      feishuLogin(mockUserInfo);
      console.log('[FeishuLoginPage] 飞书登录成功');

    } catch (error) {
      console.error('[FeishuLoginPage] 飞书登录失败:', error);
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
          <Button
            className="w-full h-12 text-base"
            onClick={handleFeishuLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                登录中...
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
