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

// 判断是否为附件字段（使用预存的 fieldKind 优先）
function isAttachmentField(fieldName: string, records: any[], fields: Field[]): boolean {
  // 🔥 【核心修复】优先使用预存的 fieldKind（在字段获取时确定）
  const field = fields.find(f => f.name === fieldName || f.id === fieldName);
  
  if (field?.fieldKind) {
    // 如果预存了 fieldKind，直接使用（最可靠）
    if (field.fieldKind === 'attachment') {
      return true;
    }
    if (field.fieldKind === 'person' || field.fieldKind === 'text' || field.fieldKind === 'number') {
      return false;
    }
  }
  
  // 其次使用字段元数据中的 type 判断
  if (field) {
    const fieldType = field.type;
    
    // 飞书附件字段类型为 'attachment' 或 '17'
    if (fieldType === 'attachment' || String(fieldType) === '17') {
      return true;
    }
    
    // 明确排除非附件字段类型（支持字符串和数字编码）
    const nonAttachmentTypes = [
      // 字符串类型
      'text', 'number', 'singleSelect', 'multiSelect', 'date', 'phone', 'email', 'url', 'user', 'person',
      // 数字类型字符串（飞书字段类型编码）
      '1', '2', '3', '4', '5', '11', '13', '15',
    ];
    
    if (nonAttachmentTypes.includes(fieldType) || nonAttachmentTypes.includes(String(fieldType))) {
      return false;
    }
  }
  
  // 如果没有字段元数据，回退到值判断（兜底逻辑）
  if (!records || records.length === 0) return false;
  
  const record = records[0];
  const value = record[fieldName] || record.fields?.[fieldName];
  
  if (!Array.isArray(value) || value.length === 0) return false;
  
  const firstItem = value[0];
  
  // 🔥 【修复】排除人员字段：有 id+name，无 fileToken/previewUrl
  // 人员字段特征：id 以 'ou_' 开头（飞书用户ID），有 name，可能有 enName/en_name
  // 附件字段特征：有 token 或 fileToken，有 name（文件名）
  if (firstItem && ('id' in firstItem) && ('name' in firstItem)) {
    const id = String(firstItem.id || '');
    const hasEnName = 'enName' in firstItem || 'en_name' in firstItem;
    const hasFileToken = 'fileToken' in firstItem || ('token' in firstItem && firstItem.permission);
    
    // 如果有 enName/en_name，说明是人员字段
    if (hasEnName) {
      return false;
    }
    
    // 如果有 fileToken 或 permission（附件特有），说明是附件
    if (hasFileToken) {
      return true;
    }
    
    // id 以 'ou_' 开头是飞书用户ID，说明是人员字段
    if (id.startsWith('ou_')) {
      return false;
    }
  }
  
  // 附件判断：必须有文件相关属性
  return firstItem && (
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
  // 🔥 调试日志
  console.log('[VariableTextRenderer] Render:', {
    textPreview: text?.substring(0, 30),
    recordsCount: records?.length,
    fieldsCount: fields?.length,
    isEditing,
    hasVariables: containsVariables(text),
    variables: containsVariables(text) ? parseVariables(text).map(v => v.fieldName) : [],
  });
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
