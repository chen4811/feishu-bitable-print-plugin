'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/store/userStore';
import { Loader2, Key, CheckCircle, ArrowLeft } from 'lucide-react';

export default function BindAuthPage() {
  const router = useRouter();
  const { user, isLoggedIn, isAuthCodeBound, authCode, bindAuthCode } = useUserStore();
  const [inputAuthCode, setInputAuthCode] = useState('');
  const [isBinding, setIsBinding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  console.log('[BindAuthPage] 渲染');
  console.log('[BindAuthPage] isLoggedIn:', isLoggedIn);
  console.log('[BindAuthPage] isAuthCodeBound:', isAuthCodeBound);
  console.log('[BindAuthPage] user:', user);

  useEffect(() => {
    console.log('[BindAuthPage] useEffect 触发');
    console.log('[BindAuthPage] isLoggedIn:', isLoggedIn);
    console.log('[BindAuthPage] isAuthCodeBound:', isAuthCodeBound);
    
    if (!isLoggedIn) {
      console.log('[BindAuthPage] 未登录，跳转到登录页面');
      router.push('/login');
    } else if (isAuthCodeBound) {
      console.log('[BindAuthPage] 已绑定授权码，跳转到首页');
      router.push('/');
    }
  }, [isLoggedIn, isAuthCodeBound, router]);

  const handleBind = async () => {
    console.log('[BindAuthPage] handleBind 被调用');
    console.log('[BindAuthPage] 输入的授权码:', inputAuthCode);
    
    if (!inputAuthCode.trim()) {
      console.log('[BindAuthPage] 授权码为空');
      return;
    }

    setIsBinding(true);

    try {
      // 模拟绑定授权码
      console.log('[BindAuthPage] 正在绑定授权码...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      bindAuthCode(inputAuthCode.trim());
      console.log('[BindAuthPage] 授权码绑定成功');

      setShowSuccess(true);
      
      // 延迟2秒后跳转到首页
      setTimeout(() => {
        console.log('[BindAuthPage] 跳转到首页');
        router.push('/');
      }, 2000);

    } catch (error) {
      console.error('[BindAuthPage] 绑定授权码失败:', error);
    } finally {
      setIsBinding(false);
    }
  };

  if (!isLoggedIn || isAuthCodeBound) {
    console.log('[BindAuthPage] 状态不满足，显示加载状态');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">正在跳转...</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    console.log('[BindAuthPage] 显示成功提示');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">绑定成功！</h2>
              <p className="text-gray-600 mb-4">多维表格授权码已成功绑定</p>
              <p className="text-sm text-gray-500">即将跳转到首页...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('[BindAuthPage] 显示授权码绑定页面');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-8 w-8"
              onClick={() => router.push('/login')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Key className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>绑定授权码</CardTitle>
              <CardDescription>
                欢迎，{user?.name || '用户'}！请输入多维表格授权码
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                多维表格授权码
              </label>
              <Input
                type="text"
                placeholder="请输入授权码"
                value={inputAuthCode}
                onChange={(e) => setInputAuthCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBind()}
                disabled={isBinding}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleBind}
              disabled={isBinding || !inputAuthCode.trim()}
            >
              {isBinding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  绑定中...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  绑定授权码
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-500">
              <p>授权码可从管理后台获取</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
