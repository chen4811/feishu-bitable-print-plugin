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
  console.log('[CanvasArea] ===== 组件渲染 =====');
  
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
  const [isFromPanel, setIsFromPanel] = useState(false);

  console.log('[CanvasArea] 状态:', { activeId, isFromPanel, components: components.length });

  // 传感器设置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
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
    console.log('[CanvasArea] ✅ 拖拽开始触发!', { 
      id: active.id, 
      data: active.data.current 
    });
    
    setActiveId(active.id as string);
    
    // 判断是否从侧边栏拖拽过来
    const isNew = active.data.current?.isFromPanel || active.id.toString().startsWith('panel-');
    console.log('[CanvasArea] 是否从侧边栏:', isNew);
    setIsFromPanel(isNew);
  }, [components]);

  // 拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    console.log('[CanvasArea] ✅ 拖拽结束!', { 
      activeId: active.id, 
      overId: over?.id,
      activeData: active.data.current 
    });
    
    const activeIdStr = active.id as string;
    
    if (isFromPanel && active.data.current?.type) {
      const type = active.data.current.type as ComponentType;
      console.log('[CanvasArea] 🎯 从侧边栏添加组件:', type);
      addComponent(type);
    } else if (over && active.id !== over.id) {
      const oldIndex = components.findIndex(c => c.id === activeIdStr);
      const newIndex = components.findIndex(c => c.id === over.id);
      
      console.log('[CanvasArea] 🔄 重排组件:', { oldIndex, newIndex });
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderComponents(oldIndex, newIndex);
      }
    }

    setActiveId(null);
    setIsFromPanel(false);
  }, [isFromPanel, components, addComponent, reorderComponents]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectComponent(null);
    }
  };

  const handleAddClick = () => {
    console.log('[CanvasArea] ➕ 点击添加文本');
    addComponent('text');
  };

  const handleAddComponent = (type: ComponentType) => {
    console.log('[CanvasArea] ➕ 添加组件:', type);
    addComponent(type);
  };

  const handleDeleteComponent = (id: string) => {
    console.log('[CanvasArea] 🗑️ 删除组件:', id);
    deleteComponent(id);
  };

  // 获取当前拖拽中的组件
  const activeComponent = isFromPanel ? null : components.find(c => c.id === activeId);

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
          {/* 垂直布局 */}
          <div
            className="flex flex-col gap-2"
            style={{ minHeight: `${contentHeight}px` }}
          >
            <SortableContext
              items={components.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {components.length > 0 ? (
                components.map(component => (
                  <div key={component.id} className="w-full">
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
