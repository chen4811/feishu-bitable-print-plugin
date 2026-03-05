'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { isFeishuPluginEnvironment, authorizeInFeishuPlugin } from '@/lib/feishu-plugin-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, setToken } = useUserStore();
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
      // 检查是否在飞书插件环境
      if (isFeishuPluginEnvironment()) {
        console.log('[Login] 检测到飞书插件环境');
        
        // 使用插件环境授权
        const result = await authorizeInFeishuPlugin();
        
        if (!result.success || !result.userInfo) {
          setError(result.error || '授权失败');
          return;
        }

        // 在数据库中查找或创建用户
        const client = getSupabaseClient();
        const { data: existingUsers } = await client
          .from('users')
          .select('*')
          .eq('feishu_union_id', result.userInfo.unionId);

        let dbUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

        if (!dbUser) {
          // 创建新用户
          const { data: newUser } = await client
            .from('users')
            .insert({
              feishu_user_id: result.userInfo.userId,
              feishu_union_id: result.userInfo.unionId,
              name: result.userInfo.name,
              avatar: result.userInfo.avatar || '',
            })
            .select();
          
          dbUser = newUser?.[0];
        } else {
          // 更新用户信息
          await client
            .from('users')
            .update({
              feishu_user_id: result.userInfo.userId,
              name: result.userInfo.name,
              avatar: result.userInfo.avatar || '',
              updated_at: new Date().toISOString(),
            })
            .eq('id', dbUser.id);
        }

        if (!dbUser) {
          setError('用户数据处理失败');
          return;
        }

        // 生成 JWT token
        const jwtToken = generateToken({
          userId: dbUser.id,
          feishuUserId: result.userInfo.unionId,
          name: result.userInfo.name,
        });

        // 更新用户状态
        setUser({
          id: dbUser.id,
          name: result.userInfo.name,
          avatar: result.userInfo.avatar || '',
          feishuUserId: result.userInfo.userId,
        });
        setToken(jwtToken);

        // 跳转到主页
        router.push('/');
      } else {
        // 非插件环境，使用跳转式 OAuth
        console.log('[Login] 非插件环境，使用跳转式 OAuth');
        window.location.href = '/api/auth/feishu/login';
      }
    } catch (err) {
      console.error('[Login] 登录失败:', err);
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
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
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleFeishuLogin}
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '飞书登录'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
