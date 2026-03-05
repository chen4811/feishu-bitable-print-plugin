'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store/userStore';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, setToken } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查URL中的错误参数
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

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
      // 企业自建应用 OAuth 授权流程
      // 跳转到后端 API，由后端生成飞书授权 URL
      window.location.href = '/api/auth/feishu/login';
    } catch (err) {
      console.error('[Login] 登录失败:', err);
      setError(err instanceof Error ? err.message : '登录失败');
      setIsLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">打印插件</CardTitle>
          <CardDescription>请使用飞书账号登录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">登录失败</p>
                  <p className="mt-1">{error}</p>
                  {error.includes('redirect_uri') && (
                    <p className="mt-2 text-xs">
                      提示：请联系管理员检查飞书应用后台的「安全设置→重定向URL」配置
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <Button 
            onClick={handleFeishuLogin}
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                跳转中...
              </>
            ) : (
              '飞书登录'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
