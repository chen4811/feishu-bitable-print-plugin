'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store/userStore';
import { useTemplateStore } from '@/store/templateStore';

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, setToken, setHasAuthorizations } = useUserStore();
  const { fetchTemplates } = useTemplateStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 如果用户已登录，直接跳转到主页
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleFeishuLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[Login] 开始飞书登录流程');

      // 1. 检查是否在飞书环境中
      if (typeof window === 'undefined' || !window.feishu) {
        throw new Error('请在飞书环境中打开此应用');
      }

      // 2. 从飞书客户端获取 user_ticket
      console.log('[Login] 获取 user_ticket');
      let userTicket: string;
      try {
        userTicket = await window.feishu.auth.getUserTicket();
        console.log('[Login] 获取 user_ticket 成功');
      } catch (ticketError) {
        console.error('[Login] 获取 user_ticket 失败:', ticketError);
        throw new Error('获取飞书登录凭证失败，请重试');
      }

      // 3. 发送到后端登录
      console.log('[Login] 发送到后端登录');
      const response = await fetch('/api/auth/feishu/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ticket: userTicket }),
      });

      const result = await response.json();
      console.log('[Login] 后端响应:', result);

      if (result.success && result.data) {
        // 保存 token 和用户信息
        setToken(result.data.token);
        setUser(result.data.user);
        setHasAuthorizations(result.data.hasAuthorizations);

        // 加载模板
        await fetchTemplates();

        console.log('[Login] 登录成功，跳转页面');
        // 根据是否有授权码跳转到不同页面
        if (result.data.hasAuthorizations) {
          router.push('/');
        } else {
          router.push('/bind-auth');
        }
      } else {
        throw new Error(result.error || '登录失败');
      }
    } catch (err) {
      console.error('[Login] 登录错误:', err);
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return null; // 或者显示加载中
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">打印插件</CardTitle>
          <CardDescription>请使用飞书账号登录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Button 
              onClick={handleFeishuLogin}
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? '登录中...' : '飞书登录'}
            </Button>
            
            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
