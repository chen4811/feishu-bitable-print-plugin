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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // 添加调试信息
  const addDebugInfo = (info: string) => {
    console.log('[Login Debug]', info);
    setDebugInfo(prev => [...prev, info]);
  };

  // 如果用户已登录，直接跳转到主页
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // 检测飞书环境
  const detectFeishuEnvironment = (): { getUserTicket: () => Promise<string> } | null => {
    addDebugInfo('开始检测飞书环境...');
    
    // 打印 window 对象的所有属性，用于调试
    if (typeof window !== 'undefined') {
      addDebugInfo(`window 对象存在`);
      addDebugInfo(`window.feishu: ${!!window.feishu}`);
      addDebugInfo(`window.h5sdk: ${!!(window as any).h5sdk}`);
      addDebugInfo(`window.ysf: ${!!(window as any).ysf}`);
      
      // 打印所有全局属性
      const globalProps = Object.keys(window).filter(key => 
        key.toLowerCase().includes('feishu') || 
        key.toLowerCase().includes('h5sdk') ||
        key.toLowerCase().includes('ysf')
      );
      addDebugInfo(`找到的相关全局属性: ${globalProps.join(', ')}`);
    }

    // 尝试多种可能的挂载位置
    const feishuObj = 
      window.feishu || 
      (window as any).h5sdk?.feishu || 
      (window as any).ysf?.feishu ||
      (window as any).h5sdk ||
      (window as any).ysf;

    if (feishuObj) {
      addDebugInfo(`找到飞书 SDK 对象: ${!!feishuObj}`);
      addDebugInfo(`feishuObj.auth: ${!!feishuObj.auth}`);
      addDebugInfo(`feishuObj.auth.getUserTicket: ${typeof feishuObj.auth?.getUserTicket}`);
      
      // 检查 getUserTicket 方法
      if (feishuObj.auth?.getUserTicket) {
        addDebugInfo('找到 getUserTicket 方法');
        return { getUserTicket: feishuObj.auth.getUserTicket.bind(feishuObj.auth) };
      }
      
      // 尝试其他可能的方法名
      if ((feishuObj as any).getUserTicket) {
        addDebugInfo('找到 getUserTicket 方法（直接挂载）');
        return { getUserTicket: (feishuObj as any).getUserTicket.bind(feishuObj) };
      }
      
      if ((feishuObj as any).getTicket) {
        addDebugInfo('找到 getTicket 方法');
        return { getUserTicket: (feishuObj as any).getTicket.bind(feishuObj) };
      }
    }

    addDebugInfo('未找到飞书 SDK');
    return null;
  };

  const handleFeishuLogin = async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo([]);

    try {
      addDebugInfo('开始飞书登录流程');

      // 1. 检测飞书环境
      const feishu = detectFeishuEnvironment();
      
      if (!feishu) {
        throw new Error('未检测到飞书环境，请确保在飞书应用中打开此页面');
      }

      // 2. 从飞书客户端获取 user_ticket
      addDebugInfo('尝试获取 user_ticket...');
      let userTicket: string;
      try {
        userTicket = await feishu.getUserTicket();
        addDebugInfo(`获取 user_ticket 成功: ${userTicket ? '***' : '空'}`);
      } catch (ticketError) {
        addDebugInfo(`获取 user_ticket 失败: ${ticketError}`);
        console.error('[Login] 获取 user_ticket 失败:', ticketError);
        throw new Error(`获取飞书登录凭证失败: ${ticketError instanceof Error ? ticketError.message : '未知错误'}`);
      }

      // 3. 发送到后端登录
      addDebugInfo('发送到后端登录...');
      const response = await fetch('/api/auth/feishu/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ticket: userTicket }),
      });

      const result = await response.json();
      addDebugInfo(`后端响应: ${JSON.stringify(result)}`);
      console.log('[Login] 后端响应:', result);

      if (result.success && result.data) {
        addDebugInfo('登录成功，保存用户信息...');
        // 保存 token 和用户信息
        setToken(result.data.token);
        setUser(result.data.user);
        setHasAuthorizations(result.data.hasAuthorizations);

        // 加载模板
        addDebugInfo('加载模板...');
        await fetchTemplates();

        addDebugInfo('跳转页面...');
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
      const errorMessage = err instanceof Error ? err.message : '登录失败，请重试';
      addDebugInfo(`错误: ${errorMessage}`);
      console.error('[Login] 登录错误:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return null; // 或者显示加载中
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-lg mx-4">
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
            
            {/* 调试信息 */}
            {debugInfo.length > 0 && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono">
                <div className="font-bold mb-2">调试信息:</div>
                {debugInfo.map((info, i) => (
                  <div key={i} className="text-gray-600">{info}</div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
