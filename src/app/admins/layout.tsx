'use client';

import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Key,
  FileText,
  Settings,
  LogOut,
  Home,
} from 'lucide-react';

const navItems = [
  { href: '/admins/dashboard', label: '仪表板', icon: LayoutDashboard },
  { href: '/admins/authorizations', label: '授权码管理', icon: Key },
  { href: '/admins/templates', label: '模板管理', icon: FileText },
  { href: '/admins/settings', label: '系统设置', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoggedIn, logout } = useAdminStore();

  // 如果未登录，跳转到登录页
  if (!isLoggedIn) {
    router.push('/admins');
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex h-screen">
        {/* 侧边栏 */}
        <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Key className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">管理后台</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                typeof window !== 'undefined' &&
                window.location.pathname === item.href;

              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => router.push(item.href)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => router.push('/')}
            >
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
