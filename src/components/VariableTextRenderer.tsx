'use client';

import React from 'react';
import { VariableChip } from './VariableChip';
import { 
  parseVariables, 
  getFieldValue,
  containsVariables,
  type VariableMatch 
} from '@/utils/smartVariableRenderer';
import { Field, ComponentTextStyle } from '@/types/editor';

interface VariableTextRendererProps {
  text: string;
  records: any[];
  fields: Field[];
  className?: string;
  tagName?: 'p' | 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  textStyle?: Partial<ComponentTextStyle>;
}

/**
 * 判断是否为附件字段值
 * 附件字段值格式：[{name: 'xxx.jpg', url: '...'}, ...]
 */
const isAttachmentValue = (value: any): boolean => {
  if (!Array.isArray(value) || value.length === 0) return false;
  const firstItem = value[0];
  if (typeof firstItem !== 'object' || firstItem === null) return false;
  // 检查是否有附件字段的特征属性
  return (firstItem.name || firstItem.fileName) && (firstItem.url !== undefined || firstItem.fileUrl !== undefined);
};

/**
 * 判断是否为图片附件
 */
const isImageAttachment = (item: any): boolean => {
  if (typeof item !== 'object' || item === null) return false;
  const name = item.name || item.fileName || '';
  const type = item.type || item.mimeType || '';
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const isImageByName = imageExtensions.some(ext => name.toLowerCase().endsWith(ext));
  const isImageByType = type.startsWith('image/');
  return isImageByName || isImageByType;
};

/**
 * 渲染附件为图片
 */
const renderAttachments = (attachments: any[], fieldName: string): React.ReactNode => {
  const imageAttachments = attachments.filter(item => isImageAttachment(item));
  
  if (imageAttachments.length === 0) {
    // 没有图片，显示文件名列表
    return (
      <span className="text-blue-700 text-sm">
        {attachments.map(item => item.name || item.fileName).join(', ')}
      </span>
    );
  }
  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {imageAttachments.map((item, index) => {
        const url = item.url || item.fileUrl || '';
        const name = item.name || item.fileName || `图片${index + 1}`;
        
        if (!url) {
          console.warn(`[VariableTextRenderer] 附件 ${name} 没有URL`);
          return (
            <span key={index} className="text-sm text-gray-500">
              {name}
            </span>
          );
        }
        
        return (
          <div
            key={index}
            style={{
              display: 'inline-block',
              margin: '2px',
              textAlign: 'center',
            }}
            title={`字段：${fieldName}`}
          >
            <img
              src={url}
              alt={name}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              style={{
                maxWidth: '80px',
                maxHeight: '80px',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '2px',
                background: '#f9fafb',
              }}
              onLoad={() => console.log(`[VariableTextRenderer] ✅ 图片加载成功: ${name}`)}
              onError={(e) => {
                console.error(`[VariableTextRenderer] ❌ 图片加载失败: ${name}`, e);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/**
 * 获取原始字段值（未经 formatFieldValue 处理）
 */
const getRawFieldValue = (fieldName: string, records: any[], fields: Field[]): any => {
  if (!records || records.length === 0) {
    return null;
  }
  
  const firstRecord = records[0] as any;
  
  // 构建字段名到字段ID的映射
  const fieldNameToIdMap: Record<string, string> = {};
  fields.forEach(field => {
    fieldNameToIdMap[field.name] = field.id;
  });
  
  // 首先尝试通过字段名查找映射的字段ID
  const fieldId = fieldNameToIdMap[fieldName];
  
  let value: unknown;
  
  if (fieldId) {
    // 优先使用字段ID从记录对象直接获取
    if (firstRecord[fieldId] !== undefined) {
      value = firstRecord[fieldId];
    } 
    // 其次尝试从 fields 对象中获取
    else if (firstRecord.fields && firstRecord.fields[fieldId] !== undefined) {
      value = firstRecord.fields[fieldId];
    }
  }
  
  // 如果通过字段ID没找到，尝试直接用字段名
  if (value === undefined || value === null) {
    if (firstRecord[fieldName] !== undefined) {
      value = firstRecord[fieldName];
    }
    else if (firstRecord.fields && firstRecord.fields[fieldName] !== undefined) {
      value = firstRecord.fields[fieldName];
    }
  }
  
  return value;
};

/**
 * 变量文本渲染组件
 * 将文本中的 {{字段名}} 替换为带样式的变量芯片或图片
 * 支持继承父组件的文本样式（字体大小、颜色等）
 */
export const VariableTextRenderer: React.FC<VariableTextRendererProps> = ({
  text,
  records,
  fields,
  className = '',
  tagName: Tag = 'span',
  textStyle,
}) => {
  if (!text) {
    return <Tag className={className}>&nbsp;</Tag>;
  }

  // 检查是否包含变量
  if (!containsVariables(text)) {
    return <Tag className={className}>{text}</Tag>;
  }

  // 解析变量
  const variables = parseVariables(text);
  
  // 分割文本和变量
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  variables.forEach((variable, index) => {
    const startIndex = text.indexOf(variable.original, lastIndex);
    
    // 添加变量前的文本
    if (startIndex > lastIndex) {
      parts.push(
        <span key={`text-${index}`}>
          {text.slice(lastIndex, startIndex)}
        </span>
      );
    }
    
    // 获取原始字段值
    const rawValue = getRawFieldValue(variable.fieldName, records, fields);
    
    // 【关键】检查是否为附件字段
    if (isAttachmentValue(rawValue)) {
      // 渲染附件为图片
      parts.push(
        <span key={`var-${index}`} className="inline-flex items-center">
          {renderAttachments(rawValue as any[], variable.fieldName)}
        </span>
      );
    } else {
      // 普通字段，使用 VariableChip 显示文本
      const value = getFieldValue(variable.fieldName, records, fields);
      parts.push(
        <VariableChip
          key={`var-${index}`}
          fieldName={variable.fieldName}
          value={value}
          textStyle={textStyle}
        />
      );
    }
    
    lastIndex = startIndex + variable.original.length;
  });
  
  // 添加最后的文本
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-final">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <Tag className={className}>{parts}</Tag>;
};

export default VariableTextRenderer;
