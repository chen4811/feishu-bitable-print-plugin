'use client';

import React from 'react';
import { VariableChip } from './VariableChip';
import { 
  parseVariables, 
  getFieldValue,
  containsVariables,
  type VariableMatch 
} from '@/utils/smartVariableRenderer';
import { Field } from '@/types/editor';

interface VariableTextRendererProps {
  text: string;
  records: any[];
  fields: Field[];
  className?: string;
  tagName?: 'p' | 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * 变量文本渲染组件
 * 将文本中的 {{字段名}} 替换为带样式的变量芯片
 */
export const VariableTextRenderer: React.FC<VariableTextRendererProps> = ({
  text,
  records,
  fields,
  className = '',
  tagName: Tag = 'span',
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
    
    // 获取变量值并添加芯片
    const value = getFieldValue(variable.fieldName, records, fields);
    parts.push(
      <VariableChip
        key={`var-${index}`}
        fieldName={variable.fieldName}
        value={value}
      />
    );
    
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
