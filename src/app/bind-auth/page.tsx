'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/store/userStore';

export default function BindAuthPage() {
  const router = useRouter();
  const { user, token, setHasAuthorizations } = useUserStore();
  const [tableId, setTableId] = useState('');
  const [tableName, setTableName] = useState('');
  const [appToken, setAppToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 如果用户未登录，跳转到登录页
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/authorizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tableId,
          tableName: tableName || '未命名表格',
          appToken,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // 更新状态为已绑定
        setHasAuthorizations(true);
        // 跳转到主页
        router.push('/');
      } else {
        alert('绑定失败: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('绑定授权码失败:', error);
      alert('绑定失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null; // 或者显示加载中
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>绑定飞书多维表格</CardTitle>
          <CardDescription>
            请输入您的飞书多维表格信息以继续使用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tableId">表格 ID</Label>
              <Input
                id="tableId"
                placeholder="请输入表格 ID"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tableName">表格名称（可选）</Label>
              <Input
                id="tableName"
                placeholder="请输入表格名称"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="appToken">授权码 (App Token)</Label>
              <Input
                id="appToken"
                placeholder="请输入授权码"
                value={appToken}
                onChange={(e) => setAppToken(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '绑定中...' : '绑定并继续'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
