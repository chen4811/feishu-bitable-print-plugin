'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { isBitablePlugin, loginWithClientAuth } from '@/lib/feishu-bitable-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, setToken } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlugin, setIsPlugin] = useState(false);

  // 检查是否在多维表格插件环境
  useEffect(() => {
    setIsPlugin(isBitablePlugin());
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
    setIsLoading(true);
    setError(null);

    try {
      // 判断是否在多维表格插件环境
      if (isBitablePlugin()) {
        console.log('[Login] 检测到多维表格插件环境，使用客户端授权');
        await handleClientAuth();
      } else {
        console.log('[Login] 非插件环境，使用跳转式 OAuth');
        // 企业自建应用 OAuth 授权流程
        window.location.href = '/api/auth/feishu/login';
      }
    } catch (err) {
      console.error('[Login] 登录失败:', err);
      setError(err instanceof Error ? err.message : '登录失败');
      setIsLoading(false);
    }
  };

  /**
   * 处理客户端授权（插件环境）
   */
  const handleClientAuth = async () => {
    try {
      // 1. 使用客户端授权获取用户信息
      const authResult = await loginWithClientAuth();

      if (!authResult.success || !authResult.userInfo) {
        setError(authResult.error || '授权失败');
        return;
      }

      const feishuUser = authResult.userInfo;
      console.log('[Login] 客户端授权成功:', feishuUser);

      // 2. 在数据库中查找或创建用户
      const client = getSupabaseClient();
      const { data: existingUsers } = await client
        .from('users')
        .select('*')
        .eq('feishu_union_id', feishuUser.unionId);

      let dbUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

      if (!dbUser) {
        // 创建新用户
        const { data: newUser } = await client
          .from('users')
          .insert({
            feishu_user_id: feishuUser.userId,
            feishu_union_id: feishuUser.unionId,
            name: feishuUser.name,
            avatar: feishuUser.avatar || '',
          })
          .select();

        dbUser = newUser?.[0];
      } else {
        // 更新用户信息
        await client
          .from('users')
          .update({
            feishu_user_id: feishuUser.userId,
            name: feishuUser.name,
            avatar: feishuUser.avatar || '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', dbUser.id);
      }

      if (!dbUser) {
        setError('用户数据处理失败');
        return;
      }

      // 3. 生成 JWT token
      const jwtToken = generateToken({
        userId: dbUser.id,
        feishuUserId: feishuUser.unionId,
        name: feishuUser.name,
      });

      // 4. 更新用户状态
      setUser({
        id: dbUser.id,
        name: feishuUser.name,
        avatar: feishuUser.avatar || '',
        feishuUserId: feishuUser.userId,
      });
      setToken(jwtToken);

      // 5. 跳转到主页
      router.push('/');
    } catch (err) {
      console.error('[Login] 客户端授权失败:', err);
      setError(err instanceof Error ? err.message : '登录失败');
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
        </CardContent>
      </Card>
    </div>
  );
}
