'use client';

import React from 'react';
import { VariableChip } from './VariableChip';
import { 
  parseVariables, 
  getFieldValue,
  containsVariables,
  isAttachmentField,
  getAttachmentImageUrls,
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
 * 从记录中获取原始字段值（用于检测附件类型）
 */
function getRawFieldValue(fieldName: string, records: any[], fields: Field[]): unknown {
  if (!records || records.length === 0) return null;
  
  const firstRecord = records[0] as any;
  
  // 构建字段名到字段ID的映射
  const fieldNameToIdMap: Record<string, string> = {};
  fields.forEach(field => {
    fieldNameToIdMap[field.name] = field.id;
  });
  
  const fieldId = fieldNameToIdMap[fieldName];
  
  // 尝试获取字段值
  if (fieldId && firstRecord[fieldId] !== undefined) {
    return firstRecord[fieldId];
  }
  if (firstRecord[fieldName] !== undefined) {
    return firstRecord[fieldName];
  }
  if (firstRecord.fields) {
    if (fieldId && firstRecord.fields[fieldId] !== undefined) {
      return firstRecord.fields[fieldId];
    }
    if (firstRecord.fields[fieldName] !== undefined) {
      return firstRecord.fields[fieldName];
    }
  }
  
  return null;
}

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
    
    // 获取原始字段值以检测类型
    const rawValue = getRawFieldValue(variable.fieldName, records, fields);
    
    // 【关键调试】打印原始值的类型和内容（验尸日志）
    console.log('🔍 [DEBUG-RENDER] ===============================');
    console.log('🔍 [DEBUG-RENDER] 字段:', variable.fieldName);
    console.log('🔍 [DEBUG-RENDER] 原始值类型:', typeof rawValue);
    console.log('🔍 [DEBUG-RENDER] 原始值内容:', rawValue);
    console.log('🔍 [DEBUG-RENDER] 是否是数组?', Array.isArray(rawValue));
    console.log('🔍 [DEBUG-RENDER] 字符串长度:', typeof rawValue === 'string' ? rawValue.length : 'N/A');
    console.log('🔍 [DEBUG-RENDER] 是否包含<img?', typeof rawValue === 'string' ? rawValue.includes('<img') : false);
    
    // 如果是数组，打印第一项
    if (Array.isArray(rawValue) && rawValue.length > 0) {
      console.log('🔍 [DEBUG-RENDER] 数组第一项:', rawValue[0]);
      console.log('🔍 [DEBUG-RENDER] 数组第一项类型:', typeof rawValue[0]);
    }
    
    // 【关键修复】检测是否为 HTML 字符串（附件字段已转换为 HTML）
    if (typeof rawValue === 'string' && (rawValue.includes('<img') || rawValue.includes('<div') || rawValue.includes('<a href'))) {
      console.log(`✅ [RENDER-VAR] 确认为 HTML 字符串，长度:`, rawValue.length);
      console.log(`✅ [RENDER-VAR] HTML 前100字符:`, rawValue.substring(0, 100));
      parts.push(
        <span 
          key={`var-${index}`} 
          className="inline-block"
          dangerouslySetInnerHTML={{ __html: rawValue }}
        />
      );
    }
    // 检测到的是数组！这就是问题所在！
    else if (Array.isArray(rawValue)) {
      console.log('❌ [RENDER-VAR] 检测到的是数组！这就是问题所在！');
      console.log('❌ [RENDER-VAR] 数组内容:', JSON.stringify(rawValue).substring(0, 200));
      // 降级显示为字符串
      parts.push(
        <VariableChip
          key={`var-${index}`}
          fieldName={variable.fieldName}
          value={rawValue.map((item: any) => item.name || String(item)).join(', ')}
          textStyle={textStyle}
        />
      );
    }
    // 普通文本或其他类型
    else {
      console.log('⚠️ [RENDER-VAR] 普通文本或其他类型:', typeof rawValue);
      // 检测是否为附件字段（图片对象数组）
      if (isAttachmentField(rawValue)) {
        // 获取图片URL列表
        const imageUrls = getAttachmentImageUrls(rawValue);
        
        console.log(`🖼️ [RENDER-VAR] 字段 "${variable.fieldName}" 是附件对象字段，提取到 ${imageUrls.length} 个图片URL`);
        
        if (imageUrls.length > 0) {
          // 渲染图片网格
          parts.push(
            <span key={`var-${index}`} className="inline-flex flex-wrap gap-1 align-middle">
              {imageUrls.map((url, imgIdx) => (
                <img
                  key={imgIdx}
                  src={url}
                  alt={`图片${imgIdx + 1}`}
                  className="rounded border object-contain"
                  style={{
                    maxWidth: '80px',
                    maxHeight: '80px',
                    width: 'auto',
                    height: 'auto',
                  }}
                  referrerPolicy="no-referrer"
                />
              ))}
            </span>
          );
        } else {
          // 附件中没有图片，显示普通芯片
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
      } else {
        // 普通字段，显示文本芯片
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
