'use client';

import React, { useState, useRef } from 'react';
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
} from '@dnd-kit/sortable';
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES, ComponentType, CanvasComponentNode } from '@/types/editor';
import { Plus } from 'lucide-react';
import { InsertionIndicator } from './InsertionIndicator';
import { SortableItem } from './SortableItem';
import { FloatingAddButton } from './FloatingAddButton';

// 插入位置类型
type InsertPosition = 'top' | 'bottom' | null;

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
    updateComponent,
  } = useEditorStore();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [insertPosition, setInsertPosition] = useState<InsertPosition>(null);
  const [isFromPanel, setIsFromPanel] = useState(false);
  const [dragType, setDragType] = useState<ComponentType | null>(null);

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
    const isNewComponent = active.data.current?.isFromPanel === true;
    setIsFromPanel(isNewComponent);
    
    if (isNewComponent && active.data.current?.type) {
      setDragType(active.data.current.type as ComponentType);
    } else {
      setDragType(null);
    }
    
    setOverId(null);
    setInsertPosition(null);
  };

  // 拖拽过程
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setOverId(null);
      setInsertPosition(null);
      return;
    }

    // 如果拖拽到画布本身
    if (over.id === 'canvas' || over.id === 'canvas-grid') {
      setOverId(null);
      setInsertPosition(null);
      return;
    }

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    if (activeIdStr === overIdStr) {
      setOverId(null);
      setInsertPosition(null);
      return;
    }

    setOverId(overIdStr);
    setInsertPosition('bottom'); // 默认插入到下方
  };

  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (isFromPanel && dragType) {
      // ========== 从侧边栏新增组件 ==========
      if (over && over.id !== 'canvas' && over.id !== 'canvas-grid') {
        const targetId = over.id as string;
        const targetIndex = components.findIndex(c => c.id === targetId);
        const targetComponent = components.find(c => c.id === targetId);
        
        if (targetIndex !== -1 && targetComponent) {
          // 1. 先添加新组件到末尾
          const tempId = addComponent(dragType);
          
          // 2. 延迟处理位置和宽度
          setTimeout(() => {
            const state = useEditorStore.getState();
            const newComponents = state.components;
            const newComponent = newComponents.find(c => c.id === tempId);
            
            if (newComponent) {
              const newComponentIndex = newComponents.findIndex(c => c.id === tempId);
              
              // 关键逻辑：判断目标组件宽度
              const isTargetFullWidth = targetComponent.layout?.width === '100%' || !targetComponent.layout;
              
              if (isTargetFullWidth) {
                // 并排模式：两个都变为50%
                state.updateComponent(tempId, { layout: { width: '50%' } });
                state.updateComponent(targetId, { layout: { width: '50%' } });
                state.reorderComponents(newComponentIndex, targetIndex + 1);
              } else {
                // 插入到下方
                state.reorderComponents(newComponentIndex, targetIndex + 1);
              }
            }
          }, 50);
        }
      } else {
        // 直接添加到末尾
        addComponent(dragType);
      }
    } else if (over && active.id !== over.id) {
      // ========== 重新排序现有组件 ==========
      const oldIndex = components.findIndex((c) => c.id === active.id);
      const newIndex = components.findIndex((c) => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderComponents(oldIndex, newIndex);
      }
    }

    setActiveId(null);
    setOverId(null);
    setInsertPosition(null);
    setIsFromPanel(false);
    setDragType(null);
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
          {/* 使用 flex-wrap 实现并排 */}
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
                      {/* 插入指示器 */}
                      {isTarget && !isActive && insertPosition && (
                        <div className="w-full flex-shrink-0">
                          <InsertionIndicator type="horizontal" />
                        </div>
                      )}

                      <div
                        className={getComponentWidthClass(layoutWidth)}
                        style={{
                          ...getComponentWidthStyle(layoutWidth),
                          flexShrink: 0,
                        }}
                      >
                        <div data-component-id={component.id}>
                          <SortableItem
                            id={component.id}
                            component={component}
                            isSelected={selectedComponentId === component.id}
                            onSelect={() => selectComponent(component.id)}
                            onDelete={() => handleDeleteComponent(component.id)}
                            opacity={isActive ? 0.4 : 1}
                          />
                        </div>
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
                  <p className="text-xs mt-2 text-primary">💡 拖新组件到100%宽度组件旁会自动并排为50%</p>
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
          ) : isFromPanel && dragType ? (
            <div className="opacity-80 bg-white shadow-2xl rounded-lg p-4 border-2 border-dashed border-primary">
              <p className="text-sm text-primary font-medium">新组件</p>
              <p className="text-xs text-muted-foreground mt-1">
                组件类型: {dragType}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                拖到100%宽度组件旁会自动并排为50%
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
