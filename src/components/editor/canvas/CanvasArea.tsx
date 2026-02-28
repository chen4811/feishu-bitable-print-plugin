'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES, ComponentType, CanvasComponentNode } from '@/types/editor';
import { Plus } from 'lucide-react';
import { InsertionIndicator } from './InsertionIndicator';
import { SortableItem } from './SortableItem';
import { FloatingAddButton } from './FloatingAddButton';

// 获取组件宽度类名
function getComponentWidthClass(width: string) {
  switch (width) {
    case '50%': return 'w-1/2';
    case '33%': return 'w-1/3';
    case '25%': return 'w-1/4';
    default: return 'w-full';
  }
}

// 获取组件宽度样式
function getComponentWidthStyle(width: string) {
  switch (width) {
    case '50%': return { flex: '0 0 50%', maxWidth: '50%' };
    case '33%': return { flex: '0 0 33.333%', maxWidth: '33.333%' };
    case '25%': return { flex: '0 0 25%', maxWidth: '25%' };
    default: return { flex: '0 0 100%', maxWidth: '100%' };
  }
}

export function CanvasArea() {
  const {
    components,
    pageConfig,
    styleConfig,
    selectComponent,
    selectedComponentId,
    addComponent,
    deleteComponent,
    reorderComponents,
  } = useEditorStore();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isFromPanel, setIsFromPanel] = useState(false);

  // 传感器设置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // 计算画布尺寸
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size];
  const isLandscape = pageConfig.orientation === 'landscape';
  
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;
  
  const contentWidth = canvasWidth - (pageConfig.margins.left + pageConfig.margins.right) * mmToPx;
  const contentHeight = canvasHeight - (pageConfig.margins.top + pageConfig.margins.bottom) * mmToPx;

  // 找到正在拖拽的组件数据
  const activeComponent = isFromPanel 
    ? null 
    : components.find((c) => c.id === activeId);

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // 判断是否从侧边栏拖拽过来
    const isNewComponent = !components.some(c => c.id === active.id);
    setIsFromPanel(isNewComponent);
  };

  // 拖拽过程 - 只更新overId，不做复杂计算
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  };

  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeIdStr = active.id as string;
    
    if (isFromPanel && active.data.current?.type) {
      // 从侧边栏新增组件
      const componentType = active.data.current.type as ComponentType;
      addComponent(componentType);
      
      // 如果有明确的overId，尝试移动到那个位置
      if (over && over.id !== 'canvas' && over.id !== 'canvas-grid') {
        setTimeout(() => {
          const newComponents = useEditorStore.getState().components;
          const newComponent = newComponents[newComponents.length - 1];
          const targetIndex = newComponents.findIndex(c => c.id === over.id);
          
          if (newComponent && targetIndex !== -1) {
            const newComponentIndex = newComponents.length - 1;
            useEditorStore.getState().reorderComponents(newComponentIndex, targetIndex);
          }
        }, 50);
      }
    } else if (over && active.id !== over.id) {
      // 重新排序现有组件
      const oldIndex = components.findIndex((c) => c.id === active.id);
      const newIndex = components.findIndex((c) => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderComponents(oldIndex, newIndex);
      }
    }

    setActiveId(null);
    setOverId(null);
    setIsFromPanel(false);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectComponent(null);
    }
  };

  const handleAddClick = () => {
    addComponent('text');
  };

  const handleAddComponent = (type: ComponentType) => {
    addComponent(type);
  };

  const handleDeleteComponent = (id: string) => {
    deleteComponent(id);
  };

  return (
    <div className="flex items-start justify-center">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          id="canvas"
          className="bg-white shadow-lg relative transition-all"
          style={{
            width: `${canvasWidth}px`,
            minHeight: `${canvasHeight}px`,
            padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
            fontFamily: styleConfig.fontFamily,
          }}
          onClick={handleCanvasClick}
        >
          {/* 关键：使用 flex-wrap 实现并排 */}
          <div
            id="canvas-grid"
            className="flex flex-wrap content-start gap-3"
            style={{ minHeight: `${contentHeight}px` }}
          >
            <SortableContext
              items={components.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {components.length > 0 ? (
                components.map((component) => {
                  const isTarget = overId === component.id;
                  const isActive = activeId === component.id;
                  const layoutWidth = component.layout?.width || '100%';

                  return (
                    <React.Fragment key={component.id}>
                      {/* 👇 核心：如果当前组件是悬停目标，且不是正在拖拽的那个，就在它前面显示蓝条 */}
                      {isTarget && !isActive && (
                        <div className="w-full flex-shrink-0">
                          <InsertionIndicator />
                        </div>
                      )}

                      <div
                        className={getComponentWidthClass(layoutWidth)}
                        style={{
                          ...getComponentWidthStyle(layoutWidth),
                          flexShrink: 0,
                        }}
                      >
                        <SortableItem
                          id={component.id}
                          component={component}
                          isSelected={selectedComponentId === component.id}
                          onSelect={() => selectComponent(component.id)}
                          onDelete={() => handleDeleteComponent(component.id)}
                          opacity={isActive ? 0.4 : 1}
                        />
                      </div>
                    </React.Fragment>
                  );
                })
              ) : (
                /* 空状态 */
                <div
                  className="flex flex-col items-center justify-center text-muted-foreground w-full"
                  style={{ minHeight: `${contentHeight}px` }}
                >
                  <div
                    className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                    onClick={handleAddClick}
                  >
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className="text-sm">从左侧拖拽组件开始排版</p>
                  <p className="text-xs mt-1">或点击上方 + 添加文本</p>
                </div>
              )}
            </SortableContext>
          </div>

          {/* 页面信息 */}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50">
            {pageConfig.size} {isLandscape ? '横向' : '纵向'}
          </div>
          
          {/* 浮动添加按钮 */}
          <FloatingAddButton onAddComponent={handleAddComponent} />
        </div>

        {/* 拖拽覆盖层 */}
        <DragOverlay dropAnimation={null}>
          {activeId && activeComponent ? (
            <div
              className="opacity-80 bg-white shadow-2xl rounded-lg p-1"
              style={{
                width: '300px',
              }}
            >
              <div className="text-sm text-muted-foreground p-2 border-b mb-2">
                拖拽中: {activeComponent.type}
              </div>
              <div className="p-4 bg-gray-50 rounded">
                {/* 简单预览 */}
                <div className="text-center text-gray-500">
                  {activeComponent.type === 'text' && '文本组件'}
                  {activeComponent.type === 'table' && '表格组件'}
                  {activeComponent.type === 'image' && '图片组件'}
                  {activeComponent.type === 'qrcode' && '二维码组件'}
                  {activeComponent.type === 'barcode' && '条形码组件'}
                  {activeComponent.type === 'line' && '分隔线组件'}
                </div>
              </div>
            </div>
          ) : isFromPanel ? (
            <div className="opacity-80 bg-white shadow-2xl rounded-lg p-4 border-2 border-dashed border-primary">
              <p className="text-sm text-primary font-medium">新组件</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
