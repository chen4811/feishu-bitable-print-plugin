'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { isBitablePlugin, loginWithClientAuth } from '@/lib/feishu-bitable-auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, setToken } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlugin, setIsPlugin] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});

  // 检查是否在多维表格插件环境
  useEffect(() => {
    const checkPlugin = () => {
      const hasWindow = typeof window !== 'undefined';
      const isIframe = hasWindow && window.self !== window.top;
      const isLarkFeishu = hasWindow && /lark|feishu/i.test(navigator.userAgent);
      
      const info = {
        hasWindow,
        isIframe,
        isLarkFeishu,
        userAgent: hasWindow ? navigator.userAgent : 'N/A',
        parentSameOrigin: hasWindow ? window.parent === window : 'N/A',
      };
      
      console.log('[Login] 环境调试信息:', info);
      setDebugInfo(info);
      setIsPlugin(isBitablePlugin());
    };
    
    checkPlugin();
  }, []);

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
    console.log('[Login] ========== 点击登录按钮 ==========');
    setIsLoading(true);
    setError(null);

    try {
      // 判断是否在多维表格插件环境
      const pluginCheck = isBitablePlugin();
      console.log('[Login] 插件环境检测结果:', pluginCheck);
      
      if (pluginCheck) {
        console.log('[Login] 检测到多维表格插件环境，使用客户端授权');
        await handleClientAuth();
      } else {
        console.log('[Login] 非插件环境，使用跳转式 OAuth');
        // 企业自建应用 OAuth 授权流程
        window.location.href = '/api/auth/feishu/login';
      }
    } catch (err) {
      console.error('[Login] ========== 登录流程异常 ==========');
      console.error('[Login] 错误类型:', err?.constructor?.name);
      console.error('[Login] 错误对象:', err);
      setError(err instanceof Error ? err.message : '登录失败');
      setIsLoading(false);
    }
  };

  /**
   * 处理客户端授权（插件环境）
   */
  const handleClientAuth = async () => {
    console.log('[Login] ========== 开始客户端授权处理 ==========');
    try {
      // 使用客户端授权获取用户信息和 JWT token
      console.log('[Login] 调用 loginWithClientAuth...');
      const authResult = await loginWithClientAuth();
      
      console.log('[Login] 授权结果:', {
        success: authResult.success,
        hasUserInfo: !!authResult.userInfo,
        hasToken: !!authResult.token,
        error: authResult.error,
      });

      if (!authResult.success || !authResult.userInfo || !authResult.token) {
        console.error('[Login] 授权失败:', authResult.error);
        setError(authResult.error || '授权失败');
        setIsLoading(false);
        return;
      }

      const { userInfo, token } = authResult;
      console.log('[Login] 客户端授权成功，用户信息:', {
        id: userInfo.id,
        name: userInfo.name,
        hasAvatar: !!userInfo.avatar,
      });

      // 更新用户状态
      console.log('[Login] 更新用户状态...');
      setUser({
        id: userInfo.id,
        name: userInfo.name,
        avatar: userInfo.avatar || '',
        feishuUserId: userInfo.feishuUserId,
      });
      setToken(token);
      console.log('[Login] 用户状态已更新');

      // 跳转到主页
      console.log('[Login] 跳转到主页...');
      router.push('/');
    } catch (err) {
      console.error('[Login] ========== 客户端授权异常 ==========');
      console.error('[Login] 错误类型:', err?.constructor?.name);
      console.error('[Login] 错误对象:', err);
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
          <CardDescription>
            {isPlugin ? '多维表格插件模式' : '请使用飞书账号登录'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">登录失败</p>
                  <p className="mt-1">{error}</p>
                  {!isPlugin && error.includes('redirect_uri') && (
                    <p className="mt-2 text-xs">
                      提示：请联系管理员检查飞书应用后台的「安全设置→重定向URL」配置
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {isPlugin && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <p className="font-medium">🚀 插件模式</p>
              <p className="mt-1">检测到多维表格插件环境，将使用免跳转授权</p>
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
                {isPlugin ? '授权中...' : '跳转中...'}
              </>
            ) : (
              '飞书登录'
            )}
          </Button>
          
          {/* 调试信息面板 */}
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
            <details>
              <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                调试信息（点击展开）
              </summary>
              <div className="mt-2 space-y-1 text-gray-500 font-mono">
                <p>isPlugin: {isPlugin ? 'true' : 'false'}</p>
                <p>hasWindow: {debugInfo.hasWindow ? 'true' : 'false'}</p>
                <p>isIframe: {debugInfo.isIframe ? 'true' : 'false'}</p>
                <p>isLarkFeishu: {debugInfo.isLarkFeishu ? 'true' : 'false'}</p>
                <p className="break-all">UserAgent: {debugInfo.userAgent}</p>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
