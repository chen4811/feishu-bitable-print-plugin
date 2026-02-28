'use client';

import { useCallback, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES, EditorComponent, ComponentType } from '@/types/editor';
import { Plus, Move } from 'lucide-react';
import { CanvasComponent } from './CanvasComponent';
import { FloatingAddButton } from './FloatingAddButton';

export function CanvasArea() {
  const { components, pageConfig, styleConfig, selectComponent, selectedComponentId, addComponent } = useEditorStore();
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleAddComponent = (type: ComponentType) => {
    addComponent(type);
  };

  // 设置画布为可放置区域
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  });

  // 计算画布尺寸 (mm 转 px，假设 96 DPI，1mm ≈ 3.78px)
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size];
  const isLandscape = pageConfig.orientation === 'landscape';
  
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;
  
  const contentWidth = canvasWidth - (pageConfig.margins.left + pageConfig.margins.right) * mmToPx;
  const contentHeight = canvasHeight - (pageConfig.margins.top + pageConfig.margins.bottom) * mmToPx;

  const handleCanvasClick = (e: React.MouseEvent) => {
    // 点击空白处取消选中
    if (e.target === e.currentTarget) {
      selectComponent(null);
    }
  };

  const handleAddClick = () => {
    addComponent('text');
  };

  return (
    <div className="flex items-start justify-center">
      <div
        ref={(node) => {
          setNodeRef(node);
          (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className="bg-white shadow-lg relative transition-all"
        style={{
          width: `${canvasWidth}px`,
          minHeight: `${canvasHeight}px`,
          padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
          fontFamily: styleConfig.fontFamily,
        }}
        onClick={handleCanvasClick}
      >
        {/* 拖拽悬停指示 */}
        {isOver && (
          <div className="absolute inset-0 border-2 border-dashed border-primary bg-primary/5 z-50 pointer-events-none" />
        )}

        {/* 组件区域 */}
        {components.length > 0 ? (
          <div className="relative" style={{ minHeight: `${contentHeight}px` }}>
            {components.map((component) => (
              <CanvasComponent
                key={component.id}
                component={component}
                isSelected={selectedComponentId === component.id}
                onSelect={() => selectComponent(component.id)}
              />
            ))}
          </div>
        ) : (
          /* 空状态 */
          <div
            className="flex flex-col items-center justify-center text-muted-foreground"
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

        {/* 页面信息 */}
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50">
          {pageConfig.size} {isLandscape ? '横向' : '纵向'}
        </div>
        
        {/* 浮动添加按钮 - 始终显示在画布右下角 */}
        <FloatingAddButton onAddComponent={handleAddComponent} />
      </div>
    </div>
  );
}
