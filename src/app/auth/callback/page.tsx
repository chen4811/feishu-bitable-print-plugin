'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { feishuLogin, setAuthToken } = useUserStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[AuthCallback] 开始处理登录回调');

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const isMock = searchParams.get('mock') === 'true';

        console.log('[AuthCallback] URL 参数:', { 
          code: code ? '已获取' : '缺失', 
          state, 
          isMock 
        });

        if (isMock) {
          console.log('[AuthCallback] 检测到模拟登录，直接处理');
          
          // 模拟调用后端 API
          const mockResponse = await fetch('/api/auth/feishu/callback?code=' + code + '&mock=true');
          const result = await mockResponse.json();

          console.log('[AuthCallback] 模拟 API 响应:', result);

          if (!result.success) {
            throw new Error(result.error || '登录失败');
          }

          // 保存 token 和用户信息
          const { token, user, hasAuthorizations } = result.data;

          console.log('[AuthCallback] 模拟登录成功:', {
            userName: user.name,
            hasAuthorizations,
          });

          // 设置 authToken
          setAuthToken(token);

          // 调用 feishuLogin 保存用户信息
          feishuLogin({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            feishuUserId: user.feishuUserId,
          });

          setStatus('success');

          // 根据是否有授权码决定跳转目标
          setTimeout(() => {
            if (hasAuthorizations) {
              console.log('[AuthCallback] 用户已有授权码，跳转到首页');
              router.push('/');
            } else {
              console.log('[AuthCallback] 用户没有授权码，跳转到绑定页面');
              router.push('/bind-auth');
            }
          }, 1000);
          return;
        }

        if (!code) {
          throw new Error('缺少授权码参数');
        }

        // 调用后端 API 处理飞书回调
        console.log('[AuthCallback] 调用后端 API');
        const callbackUrl = new URL('/api/auth/feishu/callback', window.location.origin);
        callbackUrl.searchParams.set('code', code);
        if (state) {
          callbackUrl.searchParams.set('state', state);
        }

        const response = await fetch(callbackUrl.toString());
        const result = await response.json();

        console.log('[AuthCallback] 后端 API 响应:', { success: result.success, hasData: !!result.data });

        if (!result.success) {
          throw new Error(result.error || '登录失败');
        }

        // 保存 token 和用户信息
        const { token, user, hasAuthorizations } = result.data;

        console.log('[AuthCallback] 登录成功:', {
          userName: user.name,
          hasAuthorizations,
        });

        // 设置 authToken
        setAuthToken(token);

        // 调用 feishuLogin 保存用户信息
        feishuLogin({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          feishuUserId: user.feishuUserId,
        });

        setStatus('success');

        // 根据是否有授权码决定跳转目标
        setTimeout(() => {
          if (hasAuthorizations) {
            console.log('[AuthCallback] 用户已有授权码，跳转到首页');
            router.push('/');
          } else {
            console.log('[AuthCallback] 用户没有授权码，跳转到绑定页面');
            router.push('/bind-auth');
          }
        }, 1000);
      } catch (error) {
        console.error('[AuthCallback] 登录失败:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '登录过程中发生错误');
      }
    };

    handleCallback();
  }, [searchParams, feishuLogin, setAuthToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">正在登录...</h2>
            <p className="text-gray-600">请稍候，正在完成飞书登录</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">登录成功！</h2>
            <p className="text-gray-600">正在跳转...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">登录失败</h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              返回登录页
            </button>
          </>
        )}
      </div>
    </div>
  );
}
