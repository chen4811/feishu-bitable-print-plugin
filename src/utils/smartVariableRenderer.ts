/**
 * 智能变量解析与渲染引擎
 * 支持 {{字段名}} 格式的自动识别、数据映射和样式渲染
 */

import { Field } from '@/types/editor';

// 变量匹配正则：{{字段名}} 或 {{字段名:格式}}
const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

// 变量芯片 CSS 类名
export const VARIABLE_CHIP_CLASS = 'dynamic-variable-chip';

/**
 * 变量解析结果接口
 */
export interface VariableMatch {
  original: string;      // 原始匹配文本，如 {{姓名}}
  fieldName: string;     // 字段名，如 "姓名"
  format?: string;       // 格式说明符（可选），如 "date"
}

/**
 * 解析文本中的所有变量
 * @param text 包含变量的文本
 * @returns 变量匹配列表
 */
export function parseVariables(text: string): VariableMatch[] {
  if (!text) return [];
  
  const matches: VariableMatch[] = [];
  let match;
  
  // 重置正则表达式的 lastIndex
  VARIABLE_REGEX.lastIndex = 0;
  
  while ((match = VARIABLE_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    const content = match[1];
    
    // 检查是否有格式说明符
    const [fieldName, format] = content.split(':');
    
    matches.push({
      original: fullMatch,
      fieldName: fieldName.trim(),
      format: format?.trim(),
    });
  }
  
  return matches;
}

/**
 * 检查文本是否包含变量格式
 * @param text 要检查的文本
 * @returns 是否包含变量
 */
export function containsVariables(text: string): boolean {
  if (!text) return false;
  return VARIABLE_REGEX.test(text);
}

/**
 * 从第一条记录获取字段值（处理字段名到字段ID的映射）
 * @param fieldName 字段名
 * @param records 记录列表
 * @param fields 字段定义列表
 * @returns 字段值或占位符
 */
export function getFieldValue(
  fieldName: string,
  records: any[],
  fields: Field[]
): string {
  // 无数据时返回占位符
  if (!records || records.length === 0) {
    return '[暂无数据]';
  }
  
  const firstRecord = records[0] as any;
  console.log('[SmartVariable] 查找字段值:', { fieldName, firstRecord, fields });
  
  // 构建字段名到字段ID的映射
  const fieldNameToIdMap: Record<string, string> = {};
  fields.forEach(field => {
    fieldNameToIdMap[field.name] = field.id;
  });
  
  console.log('[SmartVariable] 字段映射表:', fieldNameToIdMap);
  
  // 首先尝试通过字段名查找映射的字段ID
  const fieldId = fieldNameToIdMap[fieldName];
  
  let value: unknown;
  
  if (fieldId && firstRecord.fields) {
    // 优先使用字段ID从 fields 对象中获取
    value = firstRecord.fields[fieldId];
    console.log('[SmartVariable] 通过字段ID获取值:', { fieldId, value });
  } else if (firstRecord.fields) {
    // 尝试直接用字段名从 fields 对象中获取
    value = firstRecord.fields[fieldName];
    console.log('[SmartVariable] 直接通过字段名获取值:', { fieldName, value });
  } else {
    // 尝试直接从记录对象获取
    value = firstRecord[fieldName];
    console.log('[SmartVariable] 从记录根对象获取值:', { fieldName, value });
  }
  
  // 处理空值
  if (value === null || value === undefined) {
    return '[空]';
  }
  
  // 处理数组类型（多选、人员等）
  if (Array.isArray(value)) {
    if (value.length === 0) return '[空]';
    return value
      .map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return item.name || item.text || item.label || item.value || String(item);
        }
        return String(item);
      })
      .join(', ');
  }
  
  // 处理对象类型
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return String(obj.text || obj.name || obj.label || obj.value || JSON.stringify(value));
  }
  
  // 默认返回字符串
  return String(value);
}

/**
 * 生成变量芯片的 HTML
 * @param fieldName 字段名
 * @param value 字段值
 * @returns HTML 字符串
 */
export function generateVariableChipHTML(fieldName: string, value: string): string {
  return `<span 
    class="${VARIABLE_CHIP_CLASS}" 
    contenteditable="false" 
    data-field-name="${fieldName}"
    title="字段：${fieldName}"
  >${value}</span>`;
}

/**
 * 将文本中的变量替换为带样式的 HTML
 * @param text 原始文本
 * @param records 记录列表
 * @param fields 字段定义列表
 * @returns 处理后的 HTML 字符串
 */
export function replaceVariablesWithChips(
  text: string,
  records: any[],
  fields: Field[]
): string {
  if (!text) return '';
  
  const variables = parseVariables(text);
  
  if (variables.length === 0) {
    return text;
  }
  
  let result = text;
  
  variables.forEach(variable => {
    const value = getFieldValue(variable.fieldName, records, fields);
    const chipHTML = generateVariableChipHTML(variable.fieldName, value);
    result = result.split(variable.original).join(chipHTML);
  });
  
  return result;
}

/**
 * 处理粘贴内容，识别变量并返回处理后的内容
 * @param pastedText 粘贴的文本
 * @param records 记录列表
 * @param fields 字段定义列表
 * @returns 处理后的内容（纯文本或HTML）
 */
export function processPastedContent(
  pastedText: string,
  records: any[],
  fields: Field[]
): { hasVariables: boolean; content: string } {
  if (!pastedText) {
    return { hasVariables: false, content: pastedText };
  }
  
  const hasVariables = containsVariables(pastedText);
  
  if (!hasVariables) {
    return { hasVariables: false, content: pastedText };
  }
  
  const processedHTML = replaceVariablesWithChips(pastedText, records, fields);
  
  return { hasVariables: true, content: processedHTML };
}

/**
 * 变量芯片 CSS 样式
 */
export const VARIABLE_CHIP_STYLES = `
  .${VARIABLE_CHIP_CLASS} {
    background-color: #e6f7ff;
    border: 1px solid #91d5ff;
    color: #0050b3;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-weight: 500;
    cursor: default;
    display: inline-block;
    margin: 0 2px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    user-select: none;
  }
  
  .${VARIABLE_CHIP_CLASS}:hover {
    background-color: #bae7ff;
    border-color: #69c0ff;
  }
`;
