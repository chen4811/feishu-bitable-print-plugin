'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, 
  FileText, 
  Table, 
  Upload, 
  FileSpreadsheet, 
  Presentation,
  Crown,
  ChevronRight,
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Bug,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { presetTemplates, templateCategories } from '@/data/presetTemplates';
import { PresetTemplate } from '@/types/editor';
import { usePrintSDK } from '@/hooks/usePrintSDK';
import { FeishuEnvStatus } from '@/lib/feishu-env';
import { TemplateSidebar } from './TemplateSidebar';
import { UserTemplate } from '@/store/templateStore';

interface HomePageProps {
  onCreateNew: () => void;
  onSelectTemplate: (template: PresetTemplate) => void;
  onSelectUserTemplate?: (template: UserTemplate) => void;
  onLogout?: () => void;
  onDeleteAccount?: () => Promise<void>;
}

// 创建方式卡片
const createOptions = [
  { icon: Plus, title: '创建排版', description: '空白自定义排版', action: 'create' },
  { icon: Table, title: '自动生成表格排版', description: '基于表格数据生成', action: 'auto-table' },
  { icon: Upload, title: '导入排版', description: '导入已有排版文件', action: 'import' },
  { icon: FileText, title: '创建文档模板', description: 'Word格式模板', action: 'docx' },
  { icon: FileSpreadsheet, title: '创建表格模板', description: 'Excel格式模板', action: 'excel' },
  { icon: Presentation, title: '创建幻灯片模板', description: 'PPT格式模板', action: 'ppt' },
];

// 环境状态显示组件
function EnvStatusBadge({ status, isFeishuEnvironment }: { status: FeishuEnvStatus; isFeishuEnvironment: boolean }) {
  switch (status) {
    case 'checking':
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          检测环境...
        </Badge>
      );
    case 'ready':
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          飞书环境已连接
        </Badge>
      );
    case 'not_feishu':
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-700">
          <AlertCircle className="w-3 h-3 mr-1" />
          非飞书环境（模拟数据）
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          环境错误
        </Badge>
      );
    default:
      return null;
  }
}

export function HomePage({ onCreateNew, onSelectTemplate, onSelectUserTemplate, onLogout, onDeleteAccount }: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  
  const { 
    isLoading, 
    error, 
    isFeishuEnvironment, 
    envStatus,
    tableName, 
    fields, 
    records, 
    refreshData, 
    debugInfo 
  } = usePrintSDK();

  // 过滤模板
  const filteredTemplates = presetTemplates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateAction = (action: string) => {
    if (action === 'create' || action === 'auto-table') {
      onCreateNew();
    } else {
      alert(`${action} 功能开发中...`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row h-screen overflow-hidden">
      {/* 左侧边栏 */}
      <TemplateSidebar
        onSelectTemplate={onSelectUserTemplate}
        onCreateNew={onCreateNew}
        onLogout={onLogout}
        onDeleteAccount={onDeleteAccount}
      />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 顶部导航栏 */}
        <header className="border-b bg-background/95 backdrop-blur flex-shrink-0">
          <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-base md:text-lg font-semibold truncate">欢迎使用排版打印</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-wrap">
              {/* 环境状态 */}
              <EnvStatusBadge status={envStatus} isFeishuEnvironment={isFeishuEnvironment} />
              
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-6 md:w-6" onClick={refreshData} title="刷新数据">
                <RefreshCw className="w-3.5 h-3.5 md:w-3 md:h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 md:h-6 md:w-6" 
                onClick={() => setShowDebug(!showDebug)} 
                title="显示调试信息"
              >
                <Bug className="w-3.5 h-3.5 md:w-3 md:h-3" />
              </Button>
              <Button size="sm" onClick={onCreateNew} className="text-xs sm:text-sm">
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-0.5 md:mr-1" />
                <span className="hidden sm:inline">创建排版</span>
              </Button>
            </div>
          </div>
          
          {/* 调试信息面板 */}
          {showDebug && (
            <div className="border-t px-6 py-3 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Bug className="w-4 h-4" />
                  调试信息
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowDebug(false)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs font-mono bg-background border rounded p-3 max-h-48 overflow-auto">
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
        {/* 欢迎区域 */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-2 px-2">
            把{tableName || '多维表格'}的数据快速转化为各类文档、单据、合同
          </h2>
          <p className="text-sm md:text-base text-muted-foreground px-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-center gap-1">
            <span>{fields.length} 个字段 · {records.length} 条记录</span>
            {isFeishuEnvironment && (
              <span className="text-green-600 dark:text-green-400">
                · 已连接飞书多维表格
              </span>
            )}
            {!isFeishuEnvironment && !isLoading && (
              <span className="text-amber-600 dark:text-amber-400">
                · 使用模拟数据
              </span>
            )}
            <Button variant="link" className="p-0 h-auto text-xs md:text-sm">查看最佳实践案例</Button>
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <Card className="mb-6 p-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div>
                <p className="font-medium">数据加载失败</p>
                <p className="text-sm mt-1">{error}</p>
                <Button variant="outline" size="sm" onClick={refreshData} className="mt-2">
                  重试
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 权限提示 */}
        {!isLoading && !error && isFeishuEnvironment && fields.length === 0 && (
          <Card className="mb-6 p-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
              <HelpCircle className="w-5 h-5 mt-0.5" />
              <div>
                <p className="font-medium">未能读取到字段数据</p>
                <p className="text-sm mt-1">可能的原因：</p>
                <ul className="text-sm list-disc list-inside mt-1">
                  <li>多维表格插件未获得数据访问权限</li>
                  <li>飞书开放平台应用权限配置不完整</li>
                  <li>当前表格为空或没有字段</li>
                </ul>
                <p className="text-sm mt-2">
                  <strong>解决方案：</strong>请在飞书开放平台检查应用权限，确保已开通「多维表格」相关权限（bitable:record:read, bitable:field:read）。
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 非飞书环境提示 */}
        {envStatus === 'not_feishu' && !isLoading && (
          <Card className="mb-6 p-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div>
                <p className="font-medium">当前不在飞书环境中</p>
                <p className="text-sm mt-1">
                  请在飞书多维表格的侧边栏中打开此插件，以使用真实数据。当前显示的是模拟数据。
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 创建方式卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8 md:mb-12">
          {createOptions.map((option) => (
            <Card
              key={option.action}
              className="p-3 md:p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group"
              onClick={() => handleCreateAction(option.action)}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <option.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-xs md:text-sm">{option.title}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2">{option.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 模板选择区域 */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
              <h3 className="text-base md:text-lg font-semibold">从模版开始</h3>
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-[10px] md:text-xs w-fit">
              还没有使用过排版打印？强烈建议从模版开始
            </Badge>
          </div>

          {/* 搜索和分类 */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 max-w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
              <Input
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 text-sm"
              />
            </div>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full md:w-auto">
              <TabsList className="h-8 md:h-9 w-full md:w-auto overflow-x-auto justify-start md:justify-center">
                {templateCategories.slice(0, 6).map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-[10px] md:text-xs px-2 md:px-3 flex-shrink-0">
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* 模板网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all group overflow-hidden"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-8 h-8 md:w-12 md:h-12 text-slate-300 dark:text-slate-600" />
                  </div>
                  <Badge className="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 text-[10px] md:text-xs" variant="secondary">
                    {template.format}
                  </Badge>
                  {template.isPremium && (
                    <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2">
                      <Crown className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button size="sm" variant="secondary" className="text-xs px-2 py-1">
                      使用模板
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
                <div className="p-2 md:p-3">
                  <h4 className="font-medium text-xs md:text-sm truncate">{template.name}</h4>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate">{template.description}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* 空状态 */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">没有找到匹配的模板</p>
            </div>
          )}
        </div>
        </main>

        {/* 底部信息 */}
        <footer className="border-t mt-12 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <Button variant="link" size="sm" className="text-muted-foreground">快速指南</Button>
              <Button variant="link" size="sm" className="text-muted-foreground">帮助中心</Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
