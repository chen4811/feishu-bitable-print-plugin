'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// 实际的回调处理组件
function FeishuCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[Feishu Callback] 开始处理回调');

        // 从 URL 读取参数
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        console.log('[Feishu Callback] code:', code ? '***' : 'missing');
        console.log('[Feishu Callback] state:', state);

        if (errorParam) {
          console.error('[Feishu Callback] 收到错误:', errorParam);
          throw new Error(errorParam);
        }

        if (!code) {
          console.error('[Feishu Callback] 缺少 code 参数');
          throw new Error('缺少授权码');
        }

        console.log('[Feishu Callback] 调用后端 API');

        // 调用后端 API 处理登录
        const apiUrl = `/api/auth/feishu/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`;
        const response = await fetch(apiUrl, {
          method: 'GET',
          redirect: 'manual', // 不自动跟随重定向
        });

        console.log('[Feishu Callback] API 响应状态:', response.status);

        // 如果是重定向响应，手动处理
        if (response.status === 307 || response.status === 302 || response.status === 301) {
          const redirectUrl = response.headers.get('location');
          console.log('[Feishu Callback] 重定向到:', redirectUrl);
          
          if (redirectUrl) {
            // 提取 cookie
            const setCookie = response.headers.get('set-cookie');
            console.log('[Feishu Callback] Set-Cookie:', setCookie ? '存在' : '不存在');
            
            // 直接跳转到目标页面
            window.location.href = redirectUrl;
            return;
          }
        }

        // 如果不是重定向，检查响应内容
        if (response.ok) {
          const result = await response.json();
          console.log('[Feishu Callback] API 响应:', result);
          
          if (result.success) {
            setStatus('success');
            setTimeout(() => {
              router.push('/');
            }, 1000);
          } else {
            throw new Error(result.error || '登录失败');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `请求失败: ${response.status}`);
        }
      } catch (err) {
        console.error('[Feishu Callback] 处理回调失败:', err);
        setError(err instanceof Error ? err.message : '登录失败');
        setStatus('error');

        // 延迟跳转到登录页
        setTimeout(() => {
          router.push('/login?error=' + encodeURIComponent(err instanceof Error ? err.message : '登录失败'));
        }, 2000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {status === 'loading' && '飞书登录中...'}
          {status === 'success' && '登录成功！'}
          {status === 'error' && '登录失败'}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        {status === 'loading' && (
          <div className="py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
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
  );
}

// 加载状态组件
function FeishuCallbackLoading() {
  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">飞书登录中...</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">正在处理登录...</p>
        </div>
      </CardContent>
    </Card>
  );
}

// 主页面组件 - 使用 Suspense 包裹
export default function FeishuCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={<FeishuCallbackLoading />}>
        <FeishuCallbackContent />
      </Suspense>
    </div>
  );
}
