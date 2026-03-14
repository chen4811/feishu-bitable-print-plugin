'use client';

import React from 'react';
import { VariableChip } from './VariableChip';
import { AttachmentVariableChip } from './AttachmentVariableChip';
import { AttachmentVariableTag } from '@/components/editor/variables/AttachmentVariableTag';
import { TextVariableTag } from '@/components/editor/variables/TextVariableTag';
import { 
  parseVariables, 
  getFieldValue,
  containsVariables,
  type VariableMatch 
} from '@/utils/smartVariableRenderer';
import { Field, ComponentTextStyle } from '@/types/editor';
import { AttachmentVariableConfig } from '@/components/editor/variables';

// 判断是否为附件字段
function isAttachmentField(fieldName: string, records: any[], fields: Field[]): boolean {
  // 🔥 优先使用字段元数据中的类型判断（更可靠）
  const field = fields.find(f => f.name === fieldName || f.id === fieldName);
  if (field) {
    // 飞书附件字段类型为 'attachment'
    if (field.type === 'attachment') {
      return true;
    }
    // 明确排除文本类字段，避免误判
    if (['text', 'number', 'singleSelect', 'multiSelect', 'date', 'phone', 'email', 'url'].includes(field.type)) {
      return false;
    }
  }
  
  // 如果没有字段元数据或类型不明确，回退到值判断
  if (!records || records.length === 0) return false;
  
  const record = records[0];
  const value = record[fieldName] || record.fields?.[fieldName];
  
  if (!Array.isArray(value) || value.length === 0) return false;
  
  const firstItem = value[0];
  // 更严格的附件判断：必须包含 token 或特定的文件属性
  return firstItem && (
    ('token' in firstItem && typeof firstItem.token === 'string') || 
    ('fileToken' in firstItem && typeof firstItem.fileToken === 'string') ||
    ('previewUrl' in firstItem && typeof firstItem.previewUrl === 'string')
  );
}

// 获取附件数据
function getAttachmentData(fieldName: string, records: any[]): any[] | null {
  if (!records || records.length === 0) return null;
  
  const record = records[0];
  const value = record[fieldName] || record.fields?.[fieldName];
  
  if (!Array.isArray(value)) return null;
  return value;
}

interface VariableTextRendererProps {
  text: string;
  records: any[];
  fields: Field[];
  className?: string;
  tagName?: 'p' | 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  textStyle?: Partial<ComponentTextStyle>;
  // 附件变量配置
  attachmentConfigs?: Record<string, AttachmentVariableConfig>;
  // 事件处理
  onEditAttachment?: (fieldName: string) => void;
  onDeleteAttachment?: (fieldName: string) => void;
  // 选中的变量
  selectedVariable?: string | null;
  // 是否处于编辑状态
  isEditing?: boolean;
}

/**
 * 变量文本渲染组件（增强版）
 * 将文本中的 {{字段名}} 替换为带样式的变量芯片
 * 支持附件字段使用 AttachmentVariableChip 组件渲染
 * 支持继承父组件的文本样式（字体大小、颜色等）
 */
export const VariableTextRenderer: React.FC<VariableTextRendererProps> = ({
  text,
  records,
  fields,
  className = '',
  tagName: Tag = 'span',
  textStyle,
  attachmentConfigs = {},
  onEditAttachment,
  onDeleteAttachment,
  selectedVariable,
  isEditing = false,
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
    
    const fieldName = variable.fieldName;
    
    // 检查是否为附件字段
    if (isAttachmentField(fieldName, records, fields)) {
      if (isEditing) {
        // 编辑状态：显示简单的变量标签 [字段名]
        parts.push(
          <AttachmentVariableTag
            key={`var-${index}`}
            fieldName={fieldName}
            isEditing={true}
            onEdit={() => onEditAttachment?.(fieldName)}
            onDelete={() => onDeleteAttachment?.(fieldName)}
          />
        );
      } else {
        // 预览状态：显示实际的附件内容
        const attachmentData = getAttachmentData(fieldName, records);
        const config = attachmentConfigs[fieldName];
        
        parts.push(
          <AttachmentVariableChip
            key={`var-${index}`}
            fieldName={fieldName}
            data={attachmentData}
            config={config}
            textStyle={textStyle}
            isSelected={selectedVariable === fieldName}
            isEditing={false}
            onEdit={() => onEditAttachment?.(fieldName)}
            onDelete={() => onDeleteAttachment?.(fieldName)}
          />
        );
      }
    } else {
      // 普通文本字段
      if (isEditing) {
        // 编辑状态：显示变量标签 [字段名]
        parts.push(
          <TextVariableTag
            key={`var-${index}`}
            fieldName={fieldName}
            isEditing={true}
            onEdit={() => onEditAttachment?.(fieldName)}
            onDelete={() => onDeleteAttachment?.(fieldName)}
          />
        );
      } else {
        // 预览状态：显示字段值
        const value = getFieldValue(fieldName, records, fields);
        parts.push(
          <VariableChip
            key={`var-${index}`}
            fieldName={fieldName}
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
