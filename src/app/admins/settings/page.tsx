'use client';

import { useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Lock,
  Bell,
  Shield,
  Database,
  Save,
} from 'lucide-react';

export default function SettingsPage() {
  const { adminUser } = useAdminStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('设置已保存！');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">
          管理系统配置和个人设置
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 个人信息 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>个人信息</CardTitle>
                <CardDescription>管理您的账户信息</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" value={adminUser?.username || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">显示名称</Label>
              <Input id="name" value={adminUser?.name || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" value={adminUser?.email || ''} />
            </div>
          </CardContent>
        </Card>

        {/* 密码修改 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>修改密码</CardTitle>
                <CardDescription>更新您的登录密码</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <Input id="currentPassword" type="password" placeholder="请输入当前密码" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input id="newPassword" type="password" placeholder="请输入新密码" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input id="confirmPassword" type="password" placeholder="请再次输入新密码" />
            </div>
          </CardContent>
        </Card>

        {/* 通知设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>通知设置</CardTitle>
                <CardDescription>配置系统通知</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">邮件通知</p>
                <p className="text-sm text-muted-foreground">接收系统邮件通知</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">安全提醒</p>
                <p className="text-sm text-muted-foreground">接收账户安全提醒</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">系统公告</p>
                <p className="text-sm text-muted-foreground">接收系统公告通知</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* 安全设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>安全设置</CardTitle>
                <CardDescription>管理账户安全</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">两步验证</p>
                <p className="text-sm text-muted-foreground">增强账户安全性</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">登录设备管理</p>
                <p className="text-sm text-muted-foreground">查看和管理登录设备</p>
              </div>
              <Button variant="ghost" size="sm">管理</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">登录历史</p>
                <p className="text-sm text-muted-foreground">查看账户登录记录</p>
              </div>
              <Button variant="ghost" size="sm">查看</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>系统信息</CardTitle>
              <CardDescription>查看系统状态和版本信息</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">系统版本</p>
              <p className="font-medium">v1.0.0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">构建时间</p>
              <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">运行环境</p>
              <p className="font-medium">Production</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Node.js 版本</p>
              <p className="font-medium">20.x</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存设置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
