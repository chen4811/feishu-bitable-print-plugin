'use client';

import React, { useState, useRef } from 'react';
import { FileImage, Pencil, Trash2, GripVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ComponentTextStyle } from '@/types/editor';
import { AttachmentVariableConfig } from '@/components/editor/variables';

interface AttachmentVariableChipProps {
  fieldName: string;
  data: { htmlContent?: string; rawData?: any[] } | any[] | null | undefined;
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

  // 【修复】解析数据格式
  // data 可能是：{ htmlContent?: string; rawData?: any[] } 或 any[] 或 null
  let htmlContent: string | undefined;
  let rawData: any[] | undefined;
  
  if (data && typeof data === 'object') {
    if (Array.isArray(data)) {
      // 旧格式：直接是数组
      rawData = data;
    } else if ('htmlContent' in data || 'rawData' in data) {
      // 新格式：{ htmlContent, rawData }
      htmlContent = data.htmlContent;
      rawData = data.rawData;
    }
  }

  // 【调试日志】
  console.log('[AttachmentVariableChip] 接收数据:', {
    fieldName,
    hasConfig: !!config,
    displayMode: config?.displayMode,
    hasHtmlContent: !!htmlContent,
    hasRawData: !!rawData,
    rawDataLength: rawData?.length,
  });

  // 【关键逻辑】当有配置时，优先使用原始数据渲染（支持 displayMode）
  const hasConfig = config && Object.keys(config).length > 0;
  const shouldUseRawData = hasConfig && rawData && rawData.length > 0;
  
  // 【场景1】有配置且有原始数据 → 使用配置渲染（支持 displayMode）
  if (shouldUseRawData) {
    console.log('[AttachmentVariableChip] ✅ 使用配置渲染原始数据');
    // 继续往下渲染...
  }
  // 【场景2】没有配置但有 HTML → 使用 HTML 渲染
  else if (htmlContent && !shouldUseRawData) {
    console.log('[AttachmentVariableChip] ✅ 使用预处理HTML渲染');
    return (
      <span
        ref={containerRef}
        className={`
          inline-flex items-center gap-1 relative
          ${isSelected ? 'ring-2 ring-blue-400 rounded' : ''}
          ${className}
        `}
        style={{
          fontSize: textStyle?.fontSize ? `${textStyle.fontSize}px` : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        data-field-name={fieldName}
        data-variable-type="attachment"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }
  
  // 配置变量声明
  const displayMode = config?.displayMode || 'image_only';
  const sizeMode = config?.sizeMode || 'auto';
  const onePerLine = config?.onePerLine || false;
  const align = config?.align || 'left';
  const emptyDisplay = config?.emptyDisplay || 'default';
  const emptyCustomText = config?.emptyCustomText;

  // 判断是否有数据
  const hasData = rawData && rawData.length > 0;

  // 获取第一张图片预览 - 支持多种飞书云文档字段格式
  const firstImage = hasData ? rawData![0] : null;
  
  // 尝试从原始数据获取 URL
  let imageUrl = firstImage?.url 
    || firstImage?.fileUrl 
    || firstImage?.tmpUrl
    || firstImage?.link
    || firstImage?.downloadUrl
    || firstImage?.previewUrl
    || firstImage?.src;
  
  // 【关键修复】如果原始数据没有 URL，尝试从 HTML 内容中提取
  if (!imageUrl && htmlContent) {
    const imgMatch = htmlContent.match(/<img[^>]+src="([^"]+)"/);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
      console.log('[AttachmentVariableChip] 从 HTML 提取图片 URL:', imageUrl?.substring(0, 50));
    }
  }

  // 获取文件名
  const fileName = firstImage?.name 
    || firstImage?.fileName 
    || firstImage?.title 
    || fieldName;

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
        inline-flex items-center relative
        cursor-pointer
        transition-all duration-200
        ${displayMode === 'image_only' ? 'p-0' : 'px-1 py-0.5 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300'}
        ${isSelected ? 'ring-2 ring-blue-400' : ''}
        ${className}
      `}
      title={`附件字段：${fieldName}，共 ${rawData?.length || 0} 个附件。双击编辑配置`}
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
      data-attachment-count={rawData?.length}
    >
          {/* 显示模式：只显示图片 - 仅显示图片，无任何文字 */}
          {displayMode === 'image_only' && (
            <>
              {imageUrl ? (
                <div className="relative inline-block" style={{ margin: 0, padding: 0 }}>
                  <img
                    src={imageUrl}
                    alt={fileName}
                    style={getImageStyle()}
                    className="rounded"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      // 显示文件名作为降级
                      const fallback = img.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'block';
                      }
                    }}
                  />
                  {/* 图片加载失败时的降级显示 */}
                  <div 
                    className="hidden px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 max-w-[120px] break-words"
                  >
                    <FileImage className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    {fileName}
                  </div>
                </div>
              ) : (
                // 【关键修复】没有图片 URL 时显示占位符
                <div className="inline-flex items-center justify-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                  <FileImage className="w-4 h-4 mr-1" />
                  {fileName}
                </div>
              )}
            </>
          )}

          {/* 显示模式：基础信息 - 只显示文件名，无图片 */}
          {displayMode === 'basic_info' && (
            <span className="text-sm text-blue-700 truncate max-w-[150px]">
              {fileName}
              {rawData!.length > 1 && (
                <span className="text-xs text-blue-500 ml-1">+{rawData!.length - 1}</span>
              )}
            </span>
          )}

          {/* 显示模式：高级显示 - 显示图片 + 详细信息 */}
          {displayMode === 'advanced' && (
            <>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={fileName}
                  style={{ maxWidth: '60px', maxHeight: '60px', borderRadius: '4px' }}
                  className="rounded mr-2"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                />
              ) : (
                <FileImage className="w-6 h-6 text-blue-500 mr-2" />
              )}
              <div className="flex flex-col">
                <span className="text-xs text-gray-600">File: [{fileName}]</span>
                <span className="text-xs text-gray-600 truncate max-w-[120px]">URL: [{imageUrl || '无'}]</span>
                {rawData!.length > 1 && (
                  <span className="text-xs text-blue-500">共 {rawData!.length} 张</span>
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
