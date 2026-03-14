'use client';

import React, { useState, useEffect } from 'react';
import { FileImage, FileText, AlertCircle } from 'lucide-react';

// 附件变量配置类型
export interface AttachmentVariableConfig {
  fieldName: string;        // 字段名称
  displayMode: 'image_only' | 'basic_info' | 'advanced';  // 显示模式
  sizeMode: 'auto' | 'fixed_width' | 'fixed_height' | 'fixed_size';  // 尺寸模式
  width?: number;           // 固定宽度
  height?: number;          // 固定高度
  onePerLine: boolean;      // 一图一行
  align: 'left' | 'center' | 'right';  // 对齐方式
  emptyDisplay: 'default' | 'custom';  // 无数据显示
  emptyCustomText?: string; // 自定义空数据文案
}

// 附件数据项
interface AttachmentItem {
  name: string;
  url?: string;
  token?: string;
  type?: string;
  size?: number;
}

interface AttachmentVariableProps {
  config: AttachmentVariableConfig;
  data: AttachmentItem[] | null | undefined;
  isEditing?: boolean;  // 是否处于编辑模式
}

export function AttachmentVariable({ 
  config, 
  data, 
  isEditing = false 
}: AttachmentVariableProps) {
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, boolean>>({});

  const {
    displayMode = 'image_only',
    sizeMode = 'auto',
    width,
    height,
    onePerLine = false,
    align = 'left',
    emptyDisplay = 'default',
    emptyCustomText = ''
  } = config;

  // 获取附件URL（带缓存）
  useEffect(() => {
    if (!data || data.length === 0) return;

    const fetchUrls = async () => {
      const newUrls: Record<number, string> = {};
      const newLoading: Record<number, boolean> = {};

      data.forEach((item, index) => {
        // 【关键修复】支持多种 URL 字段名（飞书可能返回 url、fileUrl 或 tmpUrl）
        const url = item.url || (item as any).fileUrl || (item as any).tmpUrl;
        if (url) {
          newUrls[index] = url;
        } else if (item.token && !imageUrls[index]) {
          // 需要异步获取URL
          newLoading[index] = true;
        }
      });

      if (Object.keys(newLoading).length > 0) {
        setLoading(prev => ({ ...prev, ...newLoading }));
        
        // 批量获取URL
        try {
          const { bitable } = await import('@lark-base-open/js-sdk');
          const base = await bitable.base;
          const table = await base.getActiveTable();
          
          // 这里简化处理，实际应该根据字段ID获取
          // 暂时使用已有URL或占位
          data.forEach((item, index) => {
            if (item.token && !item.url) {
              // 标记为需要加载，实际项目中调用 getAttachmentUrls
              setTimeout(() => {
                setLoading(prev => ({ ...prev, [index]: false }));
                setErrors(prev => ({ ...prev, [index]: true }));
              }, 100);
            }
          });
        } catch (err) {
          console.error('获取附件URL失败:', err);
        }
      }

      setImageUrls(prev => ({ ...prev, ...newUrls }));
    };

    fetchUrls();
  }, [data]);

  // 处理图片加载错误
  const handleImageError = (index: number) => {
    setErrors(prev => ({ ...prev, [index]: true }));
    setLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoad = (index: number) => {
    setLoading(prev => ({ ...prev, [index]: false }));
  };

  // 空数据渲染
  if (!data || data.length === 0) {
    const emptyText = emptyDisplay === 'custom' && emptyCustomText 
      ? emptyCustomText 
      : `[${config.fieldName}]`;
    
    return (
      <span className="text-gray-400 italic text-sm">
        {emptyText}
      </span>
    );
  }

  // 基础信息模式 - 显示文件名列表
  if (displayMode === 'basic_info') {
    return (
      <div className="inline-flex flex-col gap-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="truncate max-w-[200px]">{item.name}</span>
          </div>
        ))}
      </div>
    );
  }

  // 计算图片样式
  const getImageStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      objectFit: 'cover',
    };

    switch (sizeMode) {
      case 'fixed_width':
        style.width = width ? `${width}px` : '120px';
        style.height = 'auto';
        break;
      case 'fixed_height':
        style.width = 'auto';
        style.height = height ? `${height}px` : '120px';
        break;
      case 'fixed_size':
        style.width = width ? `${width}px` : '120px';
        style.height = height ? `${height}px` : '120px';
        break;
      case 'auto':
      default:
        style.maxWidth = '120px';
        style.maxHeight = '120px';
        style.width = 'auto';
        style.height = 'auto';
        break;
    }

    return style;
  };

  // 容器样式
  const getContainerStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
    };

    if (onePerLine) {
      style.flexDirection = 'column';
      style.alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
    } else {
      style.justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
    }

    return style;
  };

  // 单图容器样式
  const getItemContainerStyle = (): React.CSSProperties => {
    return {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
    };
  };

  return (
    <div style={getContainerStyle()} className="attachment-variable-container">
      {data.map((item, index) => {
        // 【关键修复】支持多种 URL 字段名
        const itemUrl = item.url || (item as any).fileUrl || (item as any).tmpUrl;
        const url = imageUrls[index] || itemUrl;
        const isLoading = loading[index];
        const hasError = errors[index];

        return (
          <div key={index} style={getItemContainerStyle()} className="attachment-item">
            {isLoading ? (
              <div 
                className="bg-gray-100 rounded flex items-center justify-center"
                style={{ width: '80px', height: '80px' }}
              >
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : hasError || !url ? (
              <div 
                className="bg-gray-100 rounded flex flex-col items-center justify-center gap-1 text-gray-400"
                style={{ width: '80px', height: '80px', padding: '8px' }}
              >
                <AlertCircle className="w-6 h-6" />
                <span className="text-xs text-center truncate w-full">{item.name}</span>
              </div>
            ) : (
              <>
                <img
                  src={url}
                  alt={item.name}
                  style={getImageStyle()}
                  className="rounded border border-gray-200"
                  onError={() => handleImageError(index)}
                  onLoad={() => handleImageLoad(index)}
                />
                {displayMode === 'advanced' && (
                  <span className="text-xs text-gray-500 mt-1 max-w-[120px] truncate">
                    {item.name}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 预览组件（用于弹窗中的实时预览）
export function AttachmentVariablePreview({ 
  config 
}: { 
  config: AttachmentVariableConfig 
}) {
  // 模拟数据用于预览
  const mockData: AttachmentItem[] = [
    { name: '图片1.jpg', url: 'https://picsum.photos/100/100?random=1', type: 'image/jpeg' },
    { name: '图片2.jpg', url: 'https://picsum.photos/100/100?random=2', type: 'image/jpeg' },
    { name: '图片3.jpg', url: 'https://picsum.photos/100/100?random=3', type: 'image/jpeg' },
  ];

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <p className="text-xs text-gray-500 mb-2">预览效果：</p>
      <div className="bg-white rounded p-4">
        <AttachmentVariable config={config} data={mockData} />
      </div>
    </div>
  );
}

export default AttachmentVariable;
