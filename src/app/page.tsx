'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/store/editorStore';
import { useUserStore } from '@/store/userStore';
import { useTemplateStore } from '@/store/templateStore';
import { mockBitableData } from '@/data/mockData';
import { Field } from '@/types/editor';
import { HomePage } from '@/components/editor/HomePage';
import { EditorPage } from '@/components/editor/EditorPage';
import TemplatePreview from '@/components/editor/TemplatePreview';
import { PresetTemplate } from '@/types/editor';
import { Loader2 } from 'lucide-react';

type AppView = 'home' | 'editor' | 'preview';

export default function PrintPluginApp() {
  const router = useRouter();
  const [view, setView] = useState<AppView>('home');
  const { setFields, setSystemFields } = useEditorStore();
  const { user, token, hasAuthorizations, logout } = useUserStore();
  const { fetchTemplates } = useTemplateStore();

  // 计算登录状态
  const isLoggedIn = !!token && !!user;

  console.log('[PrintPluginApp] 渲染');
  console.log('[PrintPluginApp] isLoggedIn:', isLoggedIn);
  console.log('[PrintPluginApp] hasAuthorizations:', hasAuthorizations);
  console.log('[PrintPluginApp] user:', user);

  // 检查登录状态
  useEffect(() => {
    console.log('[PrintPluginApp] 检查登录状态 useEffect 触发');
    console.log('[PrintPluginApp] isLoggedIn:', isLoggedIn);
    console.log('[PrintPluginApp] hasAuthorizations:', hasAuthorizations);
    
    if (!isLoggedIn) {
      console.log('[PrintPluginApp] 未登录，跳转到登录页面');
      router.push('/login');
    } else if (!hasAuthorizations) {
      console.log('[PrintPluginApp] 已登录但未绑定授权码，跳转到绑定页面');
      router.push('/bind-auth');
    }
  }, [isLoggedIn, hasAuthorizations, router]);

  // 初始化字段数据并清理旧的 localStorage 数据
  useEffect(() => {
    if (!isLoggedIn || !hasAuthorizations) {
      return;
    }

    // 清理旧的 localStorage 模板数据（已改为数据库存储）
    try {
      localStorage.removeItem('template-storage');
      console.log('[PrintPluginApp] 已清理本地模板缓存');
    } catch {
      // 忽略清理错误
    }

    // 加载用户模板列表
    fetchTemplates().catch((error) => {
      console.error('[PrintPluginApp] 加载模板列表失败:', error);
    });

    // 从模拟数据或真实数据中获取字段
    const fields: Field[] = mockBitableData.fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      placeholder: `[${field.name}]`,
      isSystem: false,
    }));

    const systemFields: Field[] = [
      { id: 'sys_table_name', name: '表格名', type: 'text', placeholder: '[表格名]', isSystem: true },
      { id: 'sys_print_time', name: '打印时间', type: 'text', placeholder: '[打印时间]', isSystem: true },
      { id: 'sys_page_number', name: '页码', type: 'text', placeholder: '[页码]', isSystem: true },
      { id: 'sys_total_pages', name: '总页数', type: 'text', placeholder: '[总页数]', isSystem: true },
    ];

    setFields(fields);
    setSystemFields(systemFields);
  }, [setFields, setSystemFields, isLoggedIn, hasAuthorizations, fetchTemplates]);

  // 处理创建新排版
  const handleCreateNew = () => {
    setView('editor');
  };

  // 处理选择预设模板
  const handleSelectTemplate = (template: PresetTemplate) => {
    // TODO: 加载模板配置
    setView('editor');
  };

  // 处理选择用户模板（进入预览）
  const handleSelectUserTemplate = () => {
    console.log('[PrintPluginApp] 选择用户模板进入预览');
    setView('preview');
  };

  // 处理退出编辑器
  const handleExitEditor = () => {
    setView('home');
  };

  // 处理退出登录
  const handleLogout = () => {
    console.log('[PrintPluginApp] 退出登录');
    logout();
    router.push('/login');
  };

  // 处理删除账号
  const handleDeleteAccount = async () => {
    console.log('[PrintPluginApp] 删除账号');
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('[PrintPluginApp] 账号已删除');
        // 清除本地登录状态
        logout();
        // 跳转到登录页面
        router.push('/login');
      } else {
        console.error('[PrintPluginApp] 删除账号失败:', result.error);
        alert('删除账号失败: ' + result.error);
      }
    } catch (error) {
      console.error('[PrintPluginApp] 删除账号请求失败:', error);
      alert('删除账号失败，请稍后重试');
    }
  };

  // 如果未登录或未绑定授权码，显示加载状态
  if (!isLoggedIn || !hasAuthorizations) {
    console.log('[PrintPluginApp] 状态不满足，显示加载状态');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">正在跳转...</p>
        </div>
      </div>
    );
  }

  console.log('[PrintPluginApp] 显示主应用');
  console.log('[PrintPluginApp] 当前视图:', view);

  return (
    <div className="min-h-screen">
      {/* 主应用内容 */}
      {view === 'home' && (
        <HomePage
          onCreateNew={handleCreateNew}
          onSelectTemplate={handleSelectTemplate}
          onSelectUserTemplate={handleSelectUserTemplate}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
      {view === 'preview' && (
        <div className="h-screen flex flex-col">
          {/* 顶部返回按钮 */}
          <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
            <button
              onClick={() => setView('home')}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              ← 返回首页
            </button>
            <span className="text-sm text-gray-500">打印预览模式</span>
          </div>
          {/* 预览内容 */}
          <div className="flex-1 overflow-hidden">
            <TemplatePreview />
          </div>
        </div>
      )}
      {view === 'editor' && (
        <EditorPage onExit={handleExitEditor} />
      )}
    </div>
  );
}
