'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { EditorComponent } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { isElement, isEventTarget, stopPropagationSafe, preventDefaultSafe } from '@/utils/domUtils';

interface ResizableWrapperProps {
  component: EditorComponent;
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

// 调整大小的手柄位置
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function ResizableWrapper({
  component,
  children,
  isSelected,
  onSelect,
  onDoubleClick,
}: ResizableWrapperProps) {
  const { updateComponent, moveComponent } = useEditorStore();
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  
  const startPosRef = useRef({ x: 0, y: 0 });
  const startSizeRef = useRef({ width: 0, height: 0, x: 0, y: 0 });

  // 开始拖拽移动
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 防御性检查：确保 target 和 currentTarget 都是有效的 Element
    const target = e.target;
    const currentTarget = e.currentTarget;
    
    if (!isElement(target) || !isElement(currentTarget)) {
      return;
    }
    
    // 检查是否点击了子元素（非拖拽区域）
    if (target !== currentTarget && !target.classList.contains('drag-handle')) {
      return;
    }
    
    preventDefaultSafe(e.nativeEvent);
    stopPropagationSafe(e.nativeEvent);
    
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startSizeRef.current = { 
      width: component.width, 
      height: component.height, 
      x: component.x, 
      y: component.y 
    };
    
    onSelect();
  }, [component, onSelect]);

  // 开始调整大小
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    // 防御性检查
    if (!isElement(e.target)) {
      return;
    }
    
    preventDefaultSafe(e.nativeEvent);
    stopPropagationSafe(e.nativeEvent);
    
    setIsResizing(true);
    setActiveHandle(handle);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startSizeRef.current = { 
      width: component.width, 
      height: component.height, 
      x: component.x, 
      y: component.y 
    };
    
    onSelect();
  }, [component, onSelect]);

  // 处理鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - startPosRef.current.x;
        const deltaY = e.clientY - startPosRef.current.y;
        
        const newX = Math.max(0, startSizeRef.current.x + deltaX);
        const newY = Math.max(0, startSizeRef.current.y + deltaY);
        
        moveComponent(component.id, newX, newY);
      }
      
      if (isResizing && activeHandle) {
        const deltaX = e.clientX - startPosRef.current.x;
        const deltaY = e.clientY - startPosRef.current.y;
        
        let newWidth = startSizeRef.current.width;
        let newHeight = startSizeRef.current.height;
        let newX = startSizeRef.current.x;
        let newY = startSizeRef.current.y;
        
        // 根据手柄位置计算新尺寸
        if (activeHandle.includes('e')) {
          newWidth = Math.max(40, startSizeRef.current.width + deltaX);
        }
        if (activeHandle.includes('w')) {
          const potentialWidth = startSizeRef.current.width - deltaX;
          if (potentialWidth >= 40) {
            newWidth = potentialWidth;
            newX = startSizeRef.current.x + deltaX;
          }
        }
        if (activeHandle.includes('s')) {
          newHeight = Math.max(20, startSizeRef.current.height + deltaY);
        }
        if (activeHandle.includes('n')) {
          const potentialHeight = startSizeRef.current.height - deltaY;
          if (potentialHeight >= 20) {
            newHeight = potentialHeight;
            newY = startSizeRef.current.y + deltaY;
          }
        }
        
        updateComponent(component.id, { 
          width: newWidth, 
          height: newHeight,
          ...(newX !== startSizeRef.current.x && { x: newX }),
          ...(newY !== startSizeRef.current.y && { y: newY }),
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        setIsDragging(false);
        setIsResizing(false);
        setActiveHandle(null);
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, activeHandle, component.id, moveComponent, updateComponent]);

  // 手柄样式
  const handleStyle = {
    position: 'absolute' as const,
    width: '8px',
    height: '8px',
    background: '#3b82f6',
    border: '1px solid white',
    borderRadius: '2px',
    zIndex: 1000,
  };

  // 渲染调整大小手柄
  const renderResizeHandles = () => {
    if (!isSelected) return null;

    const handles: { position: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
      { position: 'n', style: { top: -4, left: '50%', transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
      { position: 's', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
      { position: 'e', style: { right: -4, top: '50%', transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
      { position: 'w', style: { left: -4, top: '50%', transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
      { position: 'ne', style: { top: -4, right: -4 }, cursor: 'nesw-resize' },
      { position: 'nw', style: { top: -4, left: -4 }, cursor: 'nwse-resize' },
      { position: 'se', style: { bottom: -4, right: -4 }, cursor: 'nwse-resize' },
      { position: 'sw', style: { bottom: -4, left: -4 }, cursor: 'nesw-resize' },
    ];

    return handles.map(({ position, style, cursor }) => (
      <div
        key={position}
        style={{
          ...handleStyle,
          ...style,
          cursor,
        }}
        onMouseDown={(e) => handleResizeStart(e, position)}
      />
    ));
  };

  // 点击处理
  const handleClick = useCallback((e: React.MouseEvent) => {
    stopPropagationSafe(e.nativeEvent);
    onSelect();
  }, [onSelect]);

  // 双击处理
  const handleDoubleClickClick = useCallback((e: React.MouseEvent) => {
    if (onDoubleClick) {
      onDoubleClick(e);
    }
  }, [onDoubleClick]);

  return (
    <div
      className={`absolute ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''} ${
        isDragging || isResizing ? 'select-none' : ''
      }`}
      style={{
        left: `${component.x}px`,
        top: `${component.y}px`,
        width: `${component.width}px`,
        minHeight: `${component.height}px`,
        zIndex: component.zIndex,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClickClick}
      onMouseDown={handleMouseDown}
    >
      {children}
      {renderResizeHandles()}
    </div>
  );
}
