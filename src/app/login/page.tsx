'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store/userStore';
import { useTemplateStore } from '@/store/templateStore';

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, setToken, setHasAuthorizations } = useUserStore();
  const { fetchTemplates } = useTemplateStore();

  // 如果用户已登录，直接跳转到主页
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleFeishuLogin = () => {
    // 直接跳转到飞书登录 API
    window.location.href = '/api/auth/feishu/login';
  };

  const handleMockLogin = async () => {
    try {
      const response = await fetch('/api/auth/mock-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 保存 token 和用户信息
        setToken(result.data.token);
        setUser(result.data.user);
        setHasAuthorizations(result.data.hasAuthorizations);

        // 加载模板
        await fetchTemplates();

        // 根据是否有授权码跳转到不同页面
        if (result.data.hasAuthorizations) {
          router.push('/');
        } else {
          router.push('/bind-auth');
        }
      } else {
        alert('登录失败: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Mock login error:', error);
      alert('登录失败，请重试');
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
          <CardDescription>登录以继续使用</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {/* 真实的飞书登录按钮 */}
            <Button 
              onClick={handleFeishuLogin}
              className="w-full"
              size="lg"
            >
              飞书登录
            </Button>
            
            {/* 模拟登录按钮 - 开发环境使用 */}
            <Button 
              onClick={handleMockLogin}
              className="w-full"
              size="lg"
              variant="secondary"
            >
              模拟登录（开发环境）
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
