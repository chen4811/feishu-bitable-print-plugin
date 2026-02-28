'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEditorStore } from '@/store/editorStore';
import { ComponentType, PAGE_SIZES } from '@/types/editor';
import {
  Database,
  LayoutGrid,
  Settings,
  Printer,
  Trash2,
  Undo2,
  Redo2,
  FileText,
  Pencil,
  Save,
  Download,
  Eye,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { DataSourcePanel } from './panels/DataSourcePanel';
import { ComponentPanel } from './panels/ComponentPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { CanvasArea } from './canvas/CanvasArea';
import { PageSettingsDialog } from './dialogs/PageSettingsDialog';
import { PrintPreviewDialog } from './dialogs/PrintPreviewDialog';
import { usePrintSDK } from '@/hooks/usePrintSDK';

interface EditorPageProps {
  onExit: () => void;
}

// 左侧面板标签
type LeftPanelTab = 'data' | 'components' | 'settings';

export function EditorPage({ onExit }: EditorPageProps) {
  const [activeTab, setActiveTab] = useState<LeftPanelTab>('data');
  const [isPageSettingsOpen, setIsPageSettingsOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: string; data?: unknown } | null>(null);

  const {
    templateName,
    setTemplateName,
    pageConfig,
    styleConfig,
    components,
    addComponent,
    undo,
    redo,
    clearCanvas,
    history,
    historyIndex,
  } = useEditorStore();

  const { isLoading, isFeishuEnvironment, tableName, fields, records } = usePrintSDK();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.id as string;
    setDraggedItem({ type });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (over && over.id === 'canvas') {
      const type = active.id as ComponentType;
      addComponent(type);
    }
  };

  const handleAddComponent = useCallback((type: ComponentType) => {
    addComponent(type);
  }, [addComponent]);

  const handlePrint = () => {
    setIsPrintPreviewOpen(true);
  };

  const handleExport = async () => {
    // TODO: 实现 PDF 导出
    alert('PDF 导出功能开发中...');
  };

  // 纸张尺寸显示
  const pageSizeDisplay = `${pageConfig.size}/${pageConfig.orientation === 'portrait' ? '纵向' : '横向'}`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-background">
        {/* 顶部工具栏 */}
        <header className="border-b bg-background/95 backdrop-blur z-50">
          <div className="flex items-center justify-between px-4 py-3">
            {/* 左侧 */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onExit}>
                ← 退出
              </Button>
              
              {/* 模板名称 */}
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                    className="w-48 h-8"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="font-medium">{templateName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
              
              {/* 数据源状态 */}
              {isLoading ? (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  加载数据...
                </Badge>
              ) : isFeishuEnvironment ? (
                <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {tableName} · {records.length} 条
                </Badge>
              ) : null}
            </div>

            {/* 右侧 */}
            <div className="flex items-center gap-2">
              {/* 纸张设置 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPageSettingsOpen(true)}
              >
                {pageSizeDisplay}
              </Button>

              {/* 撤销/重做 */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none border-r"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>

              {/* 清空 */}
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                disabled={components.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                清空
              </Button>

              {/* 打印 */}
              <Button size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                打印
              </Button>
            </div>
          </div>
        </header>

        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧面板 */}
          <aside className="w-64 border-r flex flex-col bg-muted/30">
            {/* 标签切换 */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as LeftPanelTab)}
              className="w-full"
            >
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="data"
                  className="flex-col gap-1 py-2 px-4 rounded-none data-[state=active]:bg-background"
                >
                  <Database className="w-4 h-4" />
                  <span className="text-xs">数据源</span>
                </TabsTrigger>
                <TabsTrigger
                  value="components"
                  className="flex-col gap-1 py-2 px-4 rounded-none data-[state=active]:bg-background"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-xs">组件</span>
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex-col gap-1 py-2 px-4 rounded-none data-[state=active]:bg-background"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-xs">设置</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto">
                <TabsContent value="data" className="m-0">
                  <DataSourcePanel onAddField={(field) => {
                    // 添加文本组件并设置内容为字段变量
                    addComponent('text');
                  }} />
                </TabsContent>
                <TabsContent value="components" className="m-0">
                  <ComponentPanel onAddComponent={handleAddComponent} />
                </TabsContent>
                <TabsContent value="settings" className="m-0">
                  <SettingsPanel />
                </TabsContent>
              </div>
            </Tabs>

            {/* 快速指南 */}
            <div className="border-t p-3 bg-background">
              <p className="text-xs font-medium mb-2">快速指南</p>
              <div className="space-y-1">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground">
                  如何创建新模板
                </Button>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground block">
                  基本排版操作
                </Button>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground block">
                  在排版中引用明细表
                </Button>
              </div>
            </div>
          </aside>

          {/* 右侧画布区 */}
          <main className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-6">
            <CanvasArea />
          </main>
        </div>

        {/* 底部状态栏 */}
        <footer className="border-t px-4 py-2 bg-background text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>* 改动将自动保存</span>
          </div>
          <div className="flex items-center gap-4">
            <span>组件: {components.length}</span>
            <span>|</span>
            <span>纸张: {PAGE_SIZES[pageConfig.size]?.width}×{PAGE_SIZES[pageConfig.size]?.height}mm</span>
          </div>
        </footer>
      </div>

      {/* 弹窗 */}
      <PageSettingsDialog
        open={isPageSettingsOpen}
        onOpenChange={setIsPageSettingsOpen}
      />
      <PrintPreviewDialog
        open={isPrintPreviewOpen}
        onOpenChange={setIsPrintPreviewOpen}
      />

      {/* 拖拽预览 */}
      <DragOverlay>
        {draggedItem && (
          <div className="p-3 bg-background border rounded-lg shadow-lg">
            <span className="text-sm">{draggedItem.type}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
