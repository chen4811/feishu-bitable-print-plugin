/**
 * 变量解析和自动渲染工具函数
 */

import { FeishuContext } from '@/types/editor';

// 变量匹配正则表达式: {{字段名}}
const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * 解析变量值
 * @param fieldName 字段名
 * @param context 飞书上下文
 * @returns 解析后的值
 */
export function resolveVariableValue(
  fieldName: string,
  context: FeishuContext | null
): string {
  if (!context) {
    return `[加载中...]`;
  }

  // 查找字段 ID
  const fieldId = context.fieldNameToIdMap[fieldName];
  if (!fieldId) {
    return `[未知字段:${fieldName}]`;
  }

  // 检查是否有首条记录数据
  if (!context.firstRecordData) {
    return `[暂无数据]`;
  }

  // 获取原始值
  const rawValue = context.firstRecordData[fieldId];

  if (rawValue === undefined || rawValue === null) {
    return `[空]`;
  }

  // 格式化复杂类型
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return item.name || item.text || String(item);
        }
        return String(item);
      })
      .join(', ');
  }

  if (typeof rawValue === 'object') {
    // 处理对象类型
    const obj = rawValue as any;
    return obj.name || obj.text || obj.value || JSON.stringify(rawValue);
  }

  return String(rawValue);
}

/**
 * 检查文本是否包含变量
 * @param text 要检查的文本
 * @returns 是否包含变量
 */
export function containsVariables(text: string): boolean {
  return VARIABLE_REGEX.test(text);
}

/**
 * 提取文本中的所有变量名
 * @param text 要提取的文本
 * @returns 变量名数组
 */
export function extractVariableNames(text: string): string[] {
  const variables: string[] = [];
  let match: RegExpExecArray | null;
  
  // 重置正则表达式的 lastIndex
  VARIABLE_REGEX.lastIndex = 0;
  
  while ((match = VARIABLE_REGEX.exec(text)) !== null) {
    variables.push(match[1]);
  }
  
  return variables;
}

/**
 * 替换文本中的变量为真实值
 * @param text 包含变量的文本
 * @param context 飞书上下文
 * @returns 替换后的文本
 */
export function replaceVariablesInText(
  text: string,
  context: FeishuContext | null
): string {
  return text.replace(VARIABLE_REGEX, (_, fieldName) => {
    return resolveVariableValue(fieldName, context);
  });
}

/**
 * 生成变量芯片的 HTML
 * @param fieldName 字段名
 * @param value 真实值
 * @returns HTML 字符串
 */
export function generateVariableChipHtml(fieldName: string, value: string): string {
  const escapedValue = escapeHtml(value);
  const escapedFieldName = escapeHtml(fieldName);
  
  return `<span 
    class="var-chip" 
    contenteditable="false" 
    data-field-name="${escapedFieldName}"
    title="字段：${escapedFieldName}"
  >${escapedValue}</span>`;
}

/**
 * 替换文本中的变量为变量芯片 HTML
 * @param text 包含变量的文本
 * @param context 飞书上下文
 * @returns 替换后的 HTML 字符串
 */
export function replaceVariablesWithChips(
  text: string,
  context: FeishuContext | null
): string {
  return text.replace(VARIABLE_REGEX, (_, fieldName) => {
    const value = resolveVariableValue(fieldName, context);
    return generateVariableChipHtml(fieldName, value);
  });
}

/**
 * HTML 转义
 * @param text 要转义的文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 从变量芯片中提取字段名
 * @param element 变量芯片元素
 * @returns 字段名
 */
export function getFieldNameFromChip(element: Element): string | null {
  return element.getAttribute('data-field-name');
}

/**
 * 检查元素是否是变量芯片
 * @param element 要检查的元素
 * @returns 是否是变量芯片
 */
export function isVariableChip(element: Element): boolean {
  return element.classList.contains('var-chip');
}
