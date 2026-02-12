'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useFeishuSDK } from '@/hooks/useFeishuSDK';
import { mockBitableData } from '@/data/mockData';
import { BitableView } from '@/types/bitable';
import { GridView } from '@/components/views/GridView';
import { KanbanView } from '@/components/views/KanbanView';
import { GalleryView } from '@/components/views/GalleryView';
import { TimelineView } from '@/components/views/TimelineView';
import { Search, LayoutGrid, KanbanSquare, Image as ImageIcon, Calendar, Printer, AlertCircle } from 'lucide-react';

export default function BitableViewer() {
  const { isLoading, error, isFeishuEnvironment, records } = useFeishuSDK();
  const [selectedViewType, setSelectedViewType] = useState('kanban');
  const [searchQuery, setSearchQuery] = useState('');

  // 根据搜索过滤记录
  const filteredRecords = records.filter(record => {
    const title = record.fields.field_1?.toLowerCase() || '';
    const description = record.fields.field_9?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return title.includes(query) || description.includes(query);
  });

  // 获取当前视图配置
  const currentView = mockBitableData.views.find(
    view => view.type === selectedViewType
  ) || mockBitableData.views[0];

  // 获取视图图标
  const getViewIcon = (type: string) => {
    switch (type) {
      case 'grid':
        return <LayoutGrid className="w-4 h-4" />;
      case 'kanban':
        return <KanbanSquare className="w-4 h-4" />;
      case 'gallery':
        return <ImageIcon className="w-4 h-4" />;
      case 'timeline':
        return <Calendar className="w-4 h-4" />;
      default:
        return <LayoutGrid className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部标题栏 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{mockBitableData.name}</h1>
              <p className="text-xs text-muted-foreground">飞书多维表格自定义排版插件</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.hash = '/print'}>
              <Printer className="w-4 h-4 mr-2" />
              排版打印
            </Button>
            <Button variant="outline" size="sm">
              导出数据
            </Button>
            <Button size="sm">
              新建视图
            </Button>
          </div>
        </div>
      </header>

      {/* 工具栏 */}
      <div className="border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <Tabs
            value={selectedViewType}
            onValueChange={setSelectedViewType}
            className="w-full"
          >
            <TabsList className="bg-muted/50">
              {mockBitableData.views.map((view) => (
                <TabsTrigger key={view.id} value={view.type} className="gap-2">
                  {getViewIcon(view.type)}
                  {view.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 ml-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索任务..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-8 h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 视图内容区域 */}
      <main className="flex-1 overflow-hidden">
        {/* 加载状态 */}
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <Card className="max-w-md p-6 border-destructive">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h3 className="font-medium text-destructive">加载失败</h3>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 非飞书环境提示 */}
        {!isFeishuEnvironment && !isLoading && !error && (
          <div className="px-6 py-2 bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <AlertCircle className="w-4 h-4" />
              <span>当前使用模拟数据，在飞书环境中将显示真实数据</span>
            </div>
          </div>
        )}

        {/* 视图内容 */}
        {!isLoading && !error && (
          <>
        {selectedViewType === 'grid' && (
          <div className="h-full p-6">
            <Card className="h-full p-4">
              <GridView
                records={filteredRecords}
                fields={mockBitableData.fields}
                view={currentView}
              />
            </Card>
          </div>
        )}

        {selectedViewType === 'kanban' && (
          <div className="h-full p-6">
            <KanbanView
              records={filteredRecords}
              fields={mockBitableData.fields}
              view={currentView}
            />
          </div>
        )}

        {selectedViewType === 'gallery' && (
          <div className="h-full p-6">
            <GalleryView
              records={filteredRecords}
              fields={mockBitableData.fields}
              view={currentView}
            />
          </div>
        )}

        {selectedViewType === 'timeline' && (
          <div className="h-full p-6">
            <TimelineView
              records={filteredRecords}
              fields={mockBitableData.fields}
              view={currentView}
            />
          </div>
        )}
          </>
        )}
      </main>

      {/* 底部状态栏 */}
      <footer className="border-t px-6 py-2 bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>共 {filteredRecords.length} 条记录</span>
            <span>最后更新: {new Date().toLocaleString('zh-CN')}</span>
            {!isFeishuEnvironment && (
              <span className="text-blue-600 dark:text-blue-400">模拟数据模式</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>视图类型: {currentView.name}</span>
            <span>插件版本: v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
