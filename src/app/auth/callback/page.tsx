'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStore } from '@/store/userStore';
import { useTemplateStore } from '@/store/templateStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken, setHasAuthorizations } = useUserStore();
  const { fetchTemplates } = useTemplateStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] 开始处理回调');

        const token = searchParams.get('token');
        const userId = searchParams.get('userId');
        const name = searchParams.get('name');
        const hasAuthorizations = searchParams.get('hasAuthorizations') === 'true';
        const errorParam = searchParams.get('error');

        if (errorParam) {
          console.error('[Auth Callback] 收到错误:', errorParam);
          throw new Error(errorParam);
        }

        if (!token || !userId) {
          console.error('[Auth Callback] 缺少必要参数');
          throw new Error('缺少必要的登录信息');
        }

        console.log('[Auth Callback] 参数验证成功');

        // 保存 token 和用户信息
        setToken(token);
        setUser({
          id: userId,
          name: name || '',
        });
        setHasAuthorizations(hasAuthorizations);

        console.log('[Auth Callback] 用户信息已保存');

        // 加载模板
        await fetchTemplates();

        console.log('[Auth Callback] 模板已加载');

        setStatus('success');

        // 延迟跳转，让用户看到成功状态
        setTimeout(() => {
          if (hasAuthorizations) {
            router.push('/');
          } else {
            router.push('/bind-auth');
          }
        }, 1000);
      } catch (err) {
        console.error('[Auth Callback] 处理回调失败:', err);
        setError(err instanceof Error ? err.message : '登录失败');
        setStatus('error');

        // 延迟跳转到登录页
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, router, setToken, setUser, setHasAuthorizations, fetchTemplates]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {status === 'loading' && '登录中...'}
            {status === 'success' && '登录成功！'}
            {status === 'error' && '登录失败'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">正在处理登录...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="py-8">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <p className="text-gray-600">正在跳转...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="py-8">
              <div className="text-red-600 text-4xl mb-4">✗</div>
              <p className="text-red-600">{error}</p>
              <p className="text-gray-500 mt-2">正在返回登录页...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
