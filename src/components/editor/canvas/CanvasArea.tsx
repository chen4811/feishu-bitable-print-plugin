'use client';

import { useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
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
  } = useEditorStore();
  
  const activeId = useRef<string | null>(null);

  // 设置传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 需要移动 8px 才触发拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖拽开始
  const handleDragStart = useCallback((event: any) => {
    activeId.current = event.active.id;
  }, []);

  // 拖拽结束
  const handleDragEnd = useCallback(
    (event: any) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = components.findIndex((c) => c.id === active.id);
        const newIndex = components.findIndex((c) => c.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderComponents(oldIndex, newIndex);
        }
      }

      activeId.current = null;
    },
    [components, reorderComponents]
  );

  // 计算画布尺寸
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size];
  const isLandscape = pageConfig.orientation === 'landscape';
  
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;
  
  const contentWidth = canvasWidth - (pageConfig.margins.left + pageConfig.margins.right) * mmToPx;
  const contentHeight = canvasHeight - (pageConfig.margins.top + pageConfig.margins.bottom) * mmToPx;

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

  // 获取当前拖拽中的组件
  const activeComponent = components.find((c) => c.id === activeId.current);

  return (
    <div className="flex items-start justify-center">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
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
          <SortableContext
            items={components.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* 垂直流式布局容器 */}
            <div
              className="flex flex-col gap-3"
              style={{ minHeight: `${contentHeight}px` }}
            >
              {components.length > 0 ? (
                components.map((component) => (
                  <ComponentWrapper
                    key={component.id}
                    id={component.id}
                    component={component}
                    isSelected={selectedComponentId === component.id}
                    onSelect={() => selectComponent(component.id)}
                    onDelete={() => handleDeleteComponent(component.id)}
                  >
                    <CanvasComponent
                      component={component}
                      isSelected={selectedComponentId === component.id}
                      onSelect={() => selectComponent(component.id)}
                    />
                  </ComponentWrapper>
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
                  <p className="text-sm">点击上方 + 添加组件开始排版</p>
                  <p className="text-xs mt-1">或使用右侧浮动按钮</p>
                </div>
              )}
            </div>
          </SortableContext>

          {/* 页面信息 */}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50">
            {pageConfig.size} {isLandscape ? '横向' : '纵向'}
          </div>
          
          {/* 浮动添加按钮 - 始终显示在画布右下角 */}
          <FloatingAddButton onAddComponent={handleAddComponent} />
        </div>

        {/* 拖拽覆盖层 */}
        <DragOverlay>
          {activeComponent ? (
            <div className="opacity-80 bg-white shadow-2xl rounded-lg">
              <CanvasComponent
                component={activeComponent}
                isSelected={false}
                onSelect={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
