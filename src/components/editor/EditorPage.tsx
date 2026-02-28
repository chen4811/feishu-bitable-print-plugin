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
import { ComponentType, PAGE_SIZES, TextComponent } from '@/types/editor';
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
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Type,
  Link as LinkIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    selectedComponentId,
    addComponent,
    updateComponent,
    undo,
    redo,
    clearCanvas,
    history,
    historyIndex,
  } = useEditorStore();

  // 智能聚焦：选中组件时自动切换到数据源面板
  useEffect(() => {
    if (selectedComponentId) {
      const selectedComponent = components.find(c => c.id === selectedComponentId);
      if (selectedComponent && (selectedComponent.type === 'text' || selectedComponent.type === 'table')) {
        setActiveTab('data');
      }
    }
  }, [selectedComponentId, components, setActiveTab]);

  // 获取当前选中的文本组件
  const selectedTextComponent = components.find(
    (c) => c.id === selectedComponentId && c.type === 'text'
  ) as TextComponent | undefined;

  // 文字编辑操作
  const updateTextStyle = (updates: Partial<TextComponent>) => {
    if (selectedTextComponent) {
      updateComponent(selectedTextComponent.id, updates);
    }
  };

  // 字体大小选项
  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

  // 行高选项
  const lineHeights = [1, 1.15, 1.5, 2, 2.5, 3];

  // 颜色选项
  const textColors = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];

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

        {/* 文字编辑工具栏 - 仅在选中文本组件时显示 */}
        {selectedTextComponent && (
          <div className="border-b bg-background/95 backdrop-blur px-4 py-2">
            <div className="flex flex-wrap items-center gap-1">
              {/* 字体大小 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 min-w-[60px]">
                    {selectedTextComponent.fontSize || styleConfig.fontSize}pt
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {fontSizes.map((size) => (
                    <DropdownMenuItem
                      key={size}
                      onClick={() => updateTextStyle({ fontSize: size })}
                    >
                      {size}pt
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-6 bg-border mx-1" />

              {/* 粗体 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                data-state={selectedTextComponent.fontWeight === 'bold' ? 'active' : 'inactive'}
                onClick={() => updateTextStyle({ 
                  fontWeight: selectedTextComponent.fontWeight === 'bold' ? 'normal' : 'bold' 
                })}
              >
                <Bold className="w-4 h-4" />
              </Button>

              {/* 斜体 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                data-state={selectedTextComponent.fontStyle === 'italic' ? 'active' : 'inactive'}
                onClick={() => updateTextStyle({ 
                  fontStyle: selectedTextComponent.fontStyle === 'italic' ? 'normal' : 'italic' 
                })}
              >
                <Italic className="w-4 h-4" />
              </Button>

              {/* 下划线 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {}}
              >
                <Underline className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* 文字颜色 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#000000' }} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <div className="grid grid-cols-4 gap-1 p-2">
                    {textColors.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: color }}
                        onClick={() => {}}
                      />
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-6 bg-border mx-1" />

              {/* 标题 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateTextStyle({ fontSize: 24, fontWeight: 'bold' })}
              >
                <Heading1 className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateTextStyle({ fontSize: 18, fontWeight: 'bold' })}
              >
                <Heading2 className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* 对齐 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                data-state={selectedTextComponent.textAlign === 'left' ? 'active' : 'inactive'}
                onClick={() => updateTextStyle({ textAlign: 'left' })}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                data-state={selectedTextComponent.textAlign === 'center' ? 'active' : 'inactive'}
                onClick={() => updateTextStyle({ textAlign: 'center' })}
              >
                <AlignCenter className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                data-state={selectedTextComponent.textAlign === 'right' ? 'active' : 'inactive'}
                onClick={() => updateTextStyle({ textAlign: 'right' })}
              >
                <AlignRight className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* 列表 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <List className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* 行高 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    行高
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {lineHeights.map((lh) => (
                    <DropdownMenuItem
                      key={lh}
                      onClick={() => updateTextStyle({ lineHeight: lh })}
                    >
                      {lh}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-6 bg-border mx-1" />

              {/* 插入链接 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

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
