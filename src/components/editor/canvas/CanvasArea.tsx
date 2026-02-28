'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES, ComponentType, CanvasComponentNode } from '@/types/editor';
import { Plus } from 'lucide-react';
import { CanvasComponent } from './CanvasComponent';
import { ComponentWrapper } from './ComponentWrapper';
import { FloatingAddButton } from './FloatingAddButton';

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
  const [isFromPanel, setIsFromPanel] = useState(false);

  // 传感器设置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
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

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // 判断是否从侧边栏拖拽过来
    const isNewComponent = !components.some(c => c.id === active.id);
    setIsFromPanel(isNewComponent);
  }, [components]);

  // 拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    
    if (isFromPanel && active.data.current?.type) {
      // 从侧边栏新增组件
      addComponent(active.data.current.type as ComponentType);
    } else if (over && active.id !== over.id) {
      // 重新排序现有组件
      const oldIndex = components.findIndex((c) => c.id === active.id);
      const newIndex = components.findIndex((c) => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderComponents(oldIndex, newIndex);
      }
    }

    setActiveId(null);
    setIsFromPanel(false);
  }, [components, isFromPanel, addComponent, reorderComponents]);

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

  // 获取组件的宽度类名
  const getComponentWidthClass = (component: CanvasComponentNode) => {
    const layout = component.layout;
    if (!layout) return 'w-full';
    
    switch (layout.width) {
      case '50%': return 'w-1/2';
      case '33%': return 'w-1/3';
      case '25%': return 'w-1/4';
      default: return 'w-full';
    }
  };

  // 获取当前拖拽中的组件
  const activeComponent = isFromPanel 
    ? null 
    : components.find((c) => c.id === activeId);

  return (
    <div className="flex items-start justify-center">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="bg-white shadow-lg relative transition-all"
          style={{
            width: `${canvasWidth}px`,
            minHeight: `${canvasHeight}px`,
            padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
            fontFamily: styleConfig.fontFamily,
          }}
          onClick={handleCanvasClick}
        >
          {/* 使用 flex-wrap 布局，为未来功能预留 */}
          <div
            className="flex flex-col gap-2"
            style={{ minHeight: `${contentHeight}px` }}
          >
            <SortableContext
              items={components.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {components.length > 0 ? (
                components.map((component) => (
                  <div key={component.id} className={getComponentWidthClass(component)}>
                    <ComponentWrapper
                      id={component.id}
                      component={component}
                      isSelected={selectedComponentId === component.id}
                      onSelect={() => selectComponent(component.id)}
                      onDelete={() => handleDeleteComponent(component.id)}
                    >
                      <div data-component-id={component.id}>
                        <CanvasComponent
                          component={component}
                          isSelected={selectedComponentId === component.id}
                          onSelect={() => selectComponent(component.id)}
                        />
                      </div>
                    </ComponentWrapper>
                  </div>
                ))
              ) : (
                /* 空状态 */
                <div
                  className="flex flex-col items-center justify-center text-muted-foreground flex-1"
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
        <DragOverlay>
          {activeComponent ? (
            <div className="opacity-80 bg-white shadow-2xl rounded-lg p-1">
              <CanvasComponent
                component={activeComponent}
                isSelected={false}
                onSelect={() => {}}
              />
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
