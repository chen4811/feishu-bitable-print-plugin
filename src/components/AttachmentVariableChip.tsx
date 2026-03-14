'use client';

import React, { useState, useRef } from 'react';
import { FileImage, Pencil, Trash2, GripVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ComponentTextStyle } from '@/types/editor';
import { AttachmentVariableConfig } from '@/components/editor/variables';

interface AttachmentVariableChipProps {
  fieldName: string;
  data: any[] | null | undefined;
  config?: AttachmentVariableConfig;
  className?: string;
  textStyle?: Partial<ComponentTextStyle>;
  isSelected?: boolean;
  isEditing?: boolean;  // 是否处于编辑状态，只有编辑状态才显示悬停按钮
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * 附件变量芯片组件
 * 作为独立组件存在于文本中，支持悬停浮窗编辑/删除
 */
export const AttachmentVariableChip: React.FC<AttachmentVariableChipProps> = ({
  fieldName,
  data,
  config,
  className = '',
  textStyle,
  isSelected = false,
  isEditing = false,  // 默认为 false
  onEdit,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // 默认配置
  const displayMode = config?.displayMode || 'image_only';
  const sizeMode = config?.sizeMode || 'auto';
  const onePerLine = config?.onePerLine || false;
  const align = config?.align || 'left';
  const emptyDisplay = config?.emptyDisplay || 'default';
  const emptyCustomText = config?.emptyCustomText;

  // 判断是否有数据
  const hasData = data && Array.isArray(data) && data.length > 0;

  // 获取第一张图片预览
  const firstImage = hasData ? data![0] : null;
  const imageUrl = firstImage?.url || firstImage?.fileUrl || firstImage?.tmpUrl;

  // 空数据渲染
  if (!hasData) {
    const emptyText = emptyDisplay === 'custom' && emptyCustomText 
      ? emptyCustomText 
      : `[${fieldName}]`;
    
    return (
      <span
        ref={containerRef}
        className={`
          inline-flex items-center gap-1 relative
          px-2 py-1 rounded
          bg-amber-50 border border-amber-200
          text-amber-600 text-sm
          cursor-pointer
          transition-all duration-200
          ${isSelected ? 'ring-2 ring-blue-400' : ''}
          ${className}
        `}
        style={{
          fontSize: textStyle?.fontSize ? `${textStyle.fontSize}px` : undefined,
        }}
        title={`附件字段：${fieldName}（无数据）。双击编辑配置`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        data-field-name={fieldName}
        data-variable-type="attachment"
      >
        <FileImage className="w-4 h-4" />
        <span className="truncate max-w-[120px]">{emptyText}</span>
        
        {/* 悬停浮窗按钮 - 仅在编辑状态下显示 */}
        {isEditing && isHovered && (
          <span 
            className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800 rounded-md px-2 py-1 shadow-lg z-[60]"
            onMouseEnter={() => setIsHovered(true)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-1 hover:bg-gray-700 rounded text-white"
              title="编辑"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-1 hover:bg-red-600 rounded text-white"
              title="删除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        )}
      </span>
    );
  }

  // 计算图片样式
  const getImageStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      objectFit: 'cover',
      borderRadius: '4px',
    };

    switch (sizeMode) {
      case 'fixed_width':
        style.width = config?.width ? `${config.width}px` : '80px';
        style.height = 'auto';
        break;
      case 'fixed_height':
        style.width = 'auto';
        style.height = config?.height ? `${config.height}px` : '80px';
        break;
      case 'fixed_size':
        style.width = config?.width ? `${config.width}px` : '80px';
        style.height = config?.height ? `${config.height}px` : '80px';
        break;
      case 'auto':
      default:
        style.maxWidth = '80px';
        style.maxHeight = '80px';
        style.width = 'auto';
        style.height = 'auto';
        break;
    }

    return style;
  };

  // 容器样式
  const getContainerStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      display: 'inline-flex',
      flexWrap: 'wrap',
      gap: '4px',
      verticalAlign: 'middle',
    };

    if (onePerLine) {
      style.flexDirection = 'column';
      style.alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
    }

    return style;
  };

  return (
    <span
      ref={containerRef}
      className={`
        inline-flex items-center gap-1 relative
        px-1 py-0.5 rounded
        bg-blue-50 border border-blue-200
        cursor-pointer
        transition-all duration-200
        hover:bg-blue-100 hover:border-blue-300
        ${isSelected ? 'ring-2 ring-blue-400' : ''}
        ${className}
      `}
      title={`附件字段：${fieldName}，共 ${data?.length || 0} 个附件。双击编辑配置`}
      style={getContainerStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit?.();
      }}
      data-field-name={fieldName}
      data-variable-type="attachment"
      data-attachment-count={data?.length}
    >
          {/* 显示模式：只显示图片 */}
          {displayMode === 'image_only' && imageUrl && (
            <img
              src={imageUrl}
              alt={firstImage?.name || fieldName}
              style={getImageStyle()}
              className="rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}

          {/* 显示模式：基础信息 */}
          {displayMode === 'basic_info' && (
            <>
              <FileImage className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-700 truncate max-w-[100px]">
                {firstImage?.name || fieldName}
              </span>
              {data!.length > 1 && (
                <span className="text-xs text-blue-500">+{data!.length - 1}</span>
              )}
            </>
          )}

          {/* 显示模式：高级显示 */}
          {displayMode === 'advanced' && (
            <>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={firstImage?.name || fieldName}
                  style={{ ...getImageStyle(), maxWidth: '60px', maxHeight: '60px' }}
                  className="rounded"
                />
              ) : (
                <FileImage className="w-6 h-6 text-blue-500" />
              )}
              <div className="flex flex-col">
                <span className="text-sm text-blue-700 truncate max-w-[100px]">
                  {firstImage?.name || fieldName}
                </span>
                {data!.length > 1 && (
                  <span className="text-xs text-blue-500">共 {data!.length} 张</span>
                )}
              </div>
            </>
          )}

          {/* 悬停浮窗按钮 - 仅在编辑状态下显示 */}
          {isEditing && isHovered && (
            <span 
              className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800 rounded-md px-2 py-1 shadow-lg z-[60]"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={(e) => {
                // 检查鼠标是否真的离开了整个组件区域
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                  const isOutside = 
                    e.clientX < rect.left || 
                    e.clientX > rect.right || 
                    e.clientY < rect.top || 
                    e.clientY > rect.bottom;
                  if (isOutside) {
                    setIsHovered(false);
                  }
                }
              }}
            >
              <GripVertical className="w-3 h-3 text-gray-400 cursor-grab" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                className="p-1 hover:bg-gray-700 rounded text-white"
                title="编辑附件变量"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="p-1 hover:bg-red-600 rounded text-white"
                title="删除附件变量"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          )}
    </span>
  );
};

export default AttachmentVariableChip;
