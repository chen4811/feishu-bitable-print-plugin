'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Printer, ChevronLeft, ChevronRight, Eye, FileText, Pencil, Download, ScanSearch, X, Plus, LayoutGrid, List, Tag, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useTemplateStore, type Template } from '@/store/templateStore';
import { useSelectedDataStore } from '@/store/selectedDataStore';
import { useEditorStore } from '@/store/editorStore';
import { PageSettingsDialog } from '@/components/editor/dialogs/PageSettingsDialog';
import { PAGE_SIZES, PageConfig } from '@/types/editor';
import { feishuEnv } from '@/lib/feishu-env';
import { onSelectionChange } from '@/lib/feishu-env';


interface TemplatePreviewProps {
  baseId?: string;
  tableId?: string;
  onEditTemplate?: (template: Template) => void;
}

// 排版方式类型
type LayoutMode = 'default' | 'continuous' | 'label';

// 检测表格是否匹配模板（纯函数，不依赖 React 状态）
const checkTableMatch = (template: { data?: { tableId?: string } } | null, tableId: string | null): boolean => {
  if (!template) {
    return true;
  }
  
  if (!tableId) {
    return true;
  }
  
  // 获取模板关联的表格ID
  const templateTableId = template.data?.tableId;
  
  // 如果模板没有记录表格ID，说明是旧模板或通用模板，允许任何表格
  if (!templateTableId) {
    return true;
  }
  
  // 比较表格ID
  return templateTableId === tableId;
};

// 选中的数据记录类型
interface SelectedRecord {
  id: string;
  data: Record<string, any>;
  addedAt: number;
}

// 日期时间戳转换函数
const formatTimestamp = (value: any): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  
  // 处理数组格式的日期字段（飞书多维表格格式）
  if (Array.isArray(value) && value.length > 0) {
    return formatTimestamp(value[0]);
  }
  
  // 如果是对象格式，尝试提取时间值
  if (typeof value === 'object' && value !== null) {
    // 尝试从常见的时间字段中提取
    if (value.text !== undefined) return formatTimestamp(value.text);
    if (value.name !== undefined) return formatTimestamp(value.name);
    if (value.value !== undefined) return formatTimestamp(value.value);
    if (value.id !== undefined) return formatTimestamp(value.id);
  }
  
  // 如果是数字且是13位时间戳（毫秒）
  if (typeof value === 'number' && value.toString().length === 13) {
    try {
      const date = new Date(value);
      // 验证日期有效性
      if (!isNaN(date.getTime())) {
        // 格式化为 YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // 继续尝试其他格式
    }
  }
  
  // 如果是数字且是10位时间戳（秒）
  if (typeof value === 'number' && value.toString().length === 10) {
    try {
      const date = new Date(value * 1000);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // 继续尝试其他格式
    }
  }
  
  // 如果已经是日期字符串，直接返回
  if (typeof value === 'string') {
    // 已经是 YYYY-MM-DD 格式
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value;
    }
    // 尝试从字符串中解析时间戳
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return formatTimestamp(numValue);
    }
  }
  
  return String(value);
};

// 通用函数：从飞书 SDK 返回的复杂单元格数据中提取纯文本/值
const extractFeishuCellValue = (cellData: any): string => {
  // 1. 处理空值
  if (cellData === null || cellData === undefined) {
    return '';
  }

  // 2. 如果是数组 (飞书最常见的情况：文本、日期、人员、单选、多选等)
  if (Array.isArray(cellData)) {
    if (cellData.length === 0) return ''; // 空数组
    
    // 多选字段：遍历数组提取每个元素的文本并拼接
    const values = cellData.map(item => {
      if (typeof item === 'object' && item !== null) {
        // 优先级：text > name > value > url > id
        return item.text || item.name || item.value || item.url || String(item.id || '');
      }
      return String(item);
    });
    
    return values.filter(v => v !== '').join(', ');
  }

  // 3. 如果是对象 (数组里的元素，或者直接返回的对象)
  if (typeof cellData === 'object' && cellData !== null) {
    // 飞书某些字段格式为 {type: 'text', text: '实际内容'}
    // 优先处理这种格式
    if (cellData.text !== undefined) return String(cellData.text);
    if (cellData.name !== undefined && cellData.name !== '') return String(cellData.name);
    if (cellData.title !== undefined && cellData.title !== '') return String(cellData.title);
    if (cellData.label !== undefined && cellData.label !== '') return String(cellData.label);
    if (cellData.status !== undefined && cellData.status !== '') return String(cellData.status);
    if (cellData.value !== undefined && cellData.value !== '') return String(cellData.value);
    if (cellData.enumValue !== undefined && cellData.enumValue !== '') return String(cellData.enumValue);
    if (cellData.url !== undefined) return String(cellData.url);
    if (cellData.id !== undefined) return String(cellData.id);
    
    // 如果都找不到，返回 JSON 字符串以便调试
    try {
      return JSON.stringify(cellData).slice(0, 50);
    } catch (e) {
      return '[对象]';
    }
  }

  // 4. 基础类型 (字符串、数字、布尔)，直接返回
  return String(cellData);
};

// 格式化字段值的通用函数 - 仅用于纯文本场景
const formatFieldValue = (key: string, value: any): string => {
  // 处理日期相关字段
  if (key.includes('日期') || key.includes('date') || key.includes('Date') || key.includes('time') || key.includes('Time')) {
    return formatTimestamp(value);
  }
  
  // 处理所有其他字段（包括状态/流程、单选、多选等）
  // 使用统一的 extractFeishuCellValue 函数处理所有字段类型
  const extractedValue = extractFeishuCellValue(value);
  
  // 确保返回字符串，防止对象直接渲染导致错误
  // 注意：虽然 extractFeishuCellValue 声明返回 string，但运行时可能返回对象
  const valueAsAny = extractedValue as any;
  if (typeof valueAsAny === 'object' && valueAsAny !== null) {
    // 尝试从对象中提取可读的文本
    if (valueAsAny.text !== undefined) return String(valueAsAny.text);
    if (valueAsAny.name !== undefined) return String(valueAsAny.name);
    if (valueAsAny.value !== undefined) return String(valueAsAny.value);
    // 兜底：返回 JSON 字符串
    try {
      return JSON.stringify(valueAsAny).slice(0, 50);
    } catch {
      return '[对象]';
    }
  }
  
  // 对空值做特殊处理
  if (extractedValue === null || extractedValue === undefined || extractedValue === '') {
    // 状态/流程字段显示"未设置"，其他显示"-"
    if (key.includes('状态') || key.includes('status') || key.includes('Status') || key.includes('流程') || key.includes('workflow') || key.includes('Workflow')) {
      return '未设置';
    }
    return '-';
  }
  
  return String(extractedValue);
};

// 格式化字段值为带样式的HTML（用于打印预览）
const formatFieldValueToHTML = (key: string, value: any, textStyle?: any): string => {
  // 构建基础样式字符串
  let baseStyleStr = '';
  if (textStyle) {
    const styleParts: string[] = [];
    if (textStyle.fontSize) styleParts.push(`font-size: ${textStyle.fontSize}px`);
    if (textStyle.bold) styleParts.push('font-weight: bold');
    else if (textStyle.fontWeight) styleParts.push(`font-weight: ${textStyle.fontWeight}`);
    if (textStyle.italic) styleParts.push('font-style: italic');
    if (textStyle.color) styleParts.push(`color: ${textStyle.color}`);
    if (textStyle.backgroundColor) styleParts.push(`background-color: ${textStyle.backgroundColor}`);
    if (textStyle.align) styleParts.push(`text-align: ${textStyle.align}`);
    if (textStyle.lineHeight) styleParts.push(`line-height: ${textStyle.lineHeight}`);
    if (textStyle.underline) styleParts.push('text-decoration: underline');
    else if (textStyle.textDecoration) styleParts.push(`text-decoration: ${textStyle.textDecoration}`);
    if (textStyle.textTransform) styleParts.push(`text-transform: ${textStyle.textTransform}`);
    baseStyleStr = styleParts.join('; ');
  }
  
  // 对空值做特殊处理
  if (value === null || value === undefined) {
    // 状态/流程字段显示"未设置"，其他显示"-"
    const emptyStyle = baseStyleStr ? `style="${baseStyleStr}; color: #9ca3af;"` : 'style="color: #9ca3af;"';
    if (key.includes('状态') || key.includes('status') || key.includes('Status') || key.includes('流程') || key.includes('workflow') || key.includes('Workflow')) {
      return `<span ${emptyStyle}>未设置</span>`;
    }
    return `<span ${emptyStyle}>-</span>`;
  }
  
  // 处理日期相关字段
  if (key.includes('日期') || key.includes('date') || key.includes('Date') || key.includes('time') || key.includes('Time')) {
    const dateValue = formatTimestamp(value);
    if (baseStyleStr) {
      return `<span style="${baseStyleStr}">${dateValue}</span>`;
    }
    return dateValue;
  }
  
  // 检查是否是流程选项（有颜色信息）
  // 流程字段数据通常是数组，每个元素有 text, color, bgColor 等属性
  let isWorkflowOption = false;
  let optionText = '';
  let optionColor = '';
  let optionBgColor = '';
  
  if (Array.isArray(value) && value.length > 0) {
    const firstItem = value[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      // 检查是否有颜色相关字段
      if (firstItem.text && (firstItem.color || firstItem.bgColor || firstItem.textColor || firstItem.backgroundColor)) {
        isWorkflowOption = true;
        optionText = firstItem.text;
        optionColor = firstItem.textColor || firstItem.color || '#000000';
        optionBgColor = firstItem.backgroundColor || firstItem.bgColor || '#f3f4f6';
      }
    }
  }
  
  // 如果是单个对象（非数组）
  if (!isWorkflowOption && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    if (value.text && (value.color || value.bgColor || value.textColor || value.backgroundColor)) {
      isWorkflowOption = true;
      optionText = value.text;
      optionColor = value.textColor || value.color || '#000000';
      optionBgColor = value.backgroundColor || value.bgColor || '#f3f4f6';
    }
  }
  
  if (isWorkflowOption) {
    // 合并基础样式和流程选项样式
    const combinedStyle = [
      baseStyleStr,
      'display: inline-block',
      'padding: 2px 8px',
      'border-radius: 4px',
      'font-size: 0.85em',
      'font-weight: 500',
      `color: ${optionColor}`,
      `background-color: ${optionBgColor}`,
      '-webkit-print-color-adjust: exact',
      'print-color-adjust: exact'
    ].filter(Boolean).join('; ');
    
    // 生成带颜色样式的 HTML（类似 VariableTextRenderer）
    return `<span style="${combinedStyle}">${optionText}</span>`;
  }
  
  // 对于普通字段，使用纯文本，但应用样式
  const plainValue = formatFieldValue(key, value);
  if (baseStyleStr) {
    return `<span style="${baseStyleStr}">${plainValue}</span>`;
  }
  return plainValue;
};

// 检测模板中的变量 - 支持 [字段名] 和 {{字段名}} 两种格式
const extractVariables = (components: any[]): string[] => {
  const variables: string[] = [];
  // 支持 [字段名]、[字段名:格式]、{{字段名}}、{{字段名:格式}}
  const variableRegex = /\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g;

  const traverse = (comp: any, depth: number = 0) => {
    if (!comp) return;

    // 检测文本中的变量
    const extractFromText = (text: string) => {
      if (!text) return;
      let match;
      // 必须重置 regex 的 lastIndex
      variableRegex.lastIndex = 0;
      while ((match = variableRegex.exec(text)) !== null) {
        // match[1] 是 [字段名] 的字段名, match[3] 是 {{字段名}} 的字段名
        const varName = (match[1] || match[3])?.trim();
        if (varName && !variables.includes(varName)) {
          variables.push(varName);
        }
      }
    };

    if (comp.text) extractFromText(comp.text);
    if (comp.content) extractFromText(comp.content);

    // 递归检查子组件
    if (comp.children && Array.isArray(comp.children)) {
      comp.children.forEach((child: any) => traverse(child, depth + 1));
    }
  };

  components.forEach((comp, idx) => traverse(comp, 0));
  return variables;
};

// 安全地构建样式对象，避免不合法的 CSS 属性
const buildSafeStyle = (baseStyle: any, additionalStyle: any): React.CSSProperties => {
  const safeStyle: React.CSSProperties = { ...baseStyle };
  
  // 只添加合法的 CSS 属性，避免索引属性
  if (additionalStyle && typeof additionalStyle === 'object') {
    Object.keys(additionalStyle).forEach(key => {
      // 跳过数字索引属性（如 [0], [1] 等）
      if (!/^\d+$/.test(key)) {
        const value = additionalStyle[key];
        // 只添加有意义的值
        if (value !== undefined && value !== null && value !== '') {
          (safeStyle as any)[key] = value;
        }
      }
    });
  }
  
  return safeStyle;
};

// 替换文本中的变量为实际值 - 支持 [字段名] 和 {{字段名}} 两种格式（纯文本版本）
const replaceVariables = (text: string, data: Record<string, any>): string => {
  if (!text || typeof text !== 'string') return text;

  // 支持 [字段名]、[字段名:格式]、{{字段名}}、{{字段名:格式}}
  return text.replace(/\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g, (match, bracketName, bracketFormat, braceName, braceFormat) => {
    const varName = (bracketName || braceName)?.trim();
    if (!varName) return match;
    
    const value = data[varName];
    if (value === undefined || value === null) {
      return match; // 保留原变量格式
    }
    
    // 使用 formatFieldValue 格式化字段值，特别是流程字段和日期字段
    return formatFieldValue(varName, value);
  });
};

// 替换文本中的变量为带样式的HTML - 用于打印预览（HTML版本）
const replaceVariablesToHTML = (text: string, data: Record<string, any>, textStyle?: any): string => {
  if (!text || typeof text !== 'string') return text;

  // 支持 [字段名]、[字段名:格式]、{{字段名}}、{{字段名:格式}}
  return text.replace(/\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g, (match, bracketName, bracketFormat, braceName, braceFormat) => {
    const varName = (bracketName || braceName)?.trim();
    if (!varName) return match;
    
    const value = data[varName];
    if (value === undefined || value === null) {
      return match; // 保留原变量格式
    }
    
    // 使用 formatFieldValueToHTML 格式化字段值，特别是流程字段的颜色样式
    return formatFieldValueToHTML(varName, value, textStyle);
  });
};

// 渲染表格组件
const renderTableComponent = (component: any, data: Record<string, any>): React.ReactNode => {
  const { id, tableConfig, style = {} } = component;
  
  if (!tableConfig) {
    return null;
  }

  const { cells = [], borderWidth = 1, borderColor = '#000000', showOuterBorder = true, showInnerBorder = true } = tableConfig;

  // 安全构建表格容器样式
  const tableContainerStyle = buildSafeStyle({
    position: 'relative',
    width: component.layout?.width || '100%',
    flex: `0 0 ${component.layout?.width || '100%'}`,
    maxWidth: component.layout?.width || '100%',
    boxSizing: 'border-box',
  }, style);

  return (
    <div 
      key={id}
      style={tableContainerStyle}
    >
      <table 
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          border: showOuterBorder ? `${borderWidth}px solid ${borderColor}` : 'none',
        }}
      >
        <tbody>
          {cells.map((row: any[], rowIndex: number) => {
            // 过滤掉 rowSpan 或 colSpan 为 0 的单元格（被合并的单元格）
            const visibleCells = row.filter((cell: any) => {
              const rowSpan = cell?.rowSpan ?? 1;
              const colSpan = cell?.colSpan ?? 1;
              return rowSpan > 0 && colSpan > 0;
            });
            
            if (visibleCells.length === 0) return null;

            return (
              <tr key={rowIndex}>
                {visibleCells.map((cell: any, colIndex: number) => {
                  if (!cell) return null;
                  
                  const rowSpan = cell.rowSpan ?? 1;
                  const colSpan = cell.colSpan ?? 1;
                  const content = cell.content || '';
                  const processedContent = replaceVariables(content, data);
                  
                  return (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      rowSpan={rowSpan > 1 ? rowSpan : undefined}
                      colSpan={colSpan > 1 ? colSpan : undefined}
                      style={buildSafeStyle({
                        border: showInnerBorder ? `${borderWidth}px solid ${borderColor}` : 'none',
                        padding: '8px',
                        verticalAlign: 'top',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                      }, cell.style)}
                    >
                      {processedContent}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// 将组件渲染为 HTML 字符串（用于打印）
const renderComponentToHTML = (component: any, data: Record<string, any>): string => {
  if (!component) return '';

  const { type, text, content, style = {}, textStyle = {} } = component;
  
  // 兼容处理：编辑器中使用 textStyle，模板预览中可能使用 style
  const actualTextStyle = Object.keys(textStyle).length > 0 ? textStyle : style;
  
  const processedText = text ? replaceVariablesToHTML(text, data, actualTextStyle) : '';
  const processedContent = content ? replaceVariablesToHTML(content, data, actualTextStyle) : '';
  
  const styleStr = `
    position: relative;
    width: ${component.layout?.width || '100%'};
    flex: 0 0 ${component.layout?.width || '100%'};
    max-width: ${component.layout?.width || '100%'};
    font-size: ${style.fontSize || '16px'};
    font-weight: ${style.fontWeight || 'normal'};
    color: ${style.color || '#000000'};
    background-color: ${style.backgroundColor || 'transparent'};
    padding: ${style.padding || '0'};
    text-align: ${style.textAlign || 'left'};
    white-space: pre-wrap;
    word-wrap: break-word;
    box-sizing: border-box;
  `;

  switch (type) {
    case 'text':
      return `<div style="${styleStr}">${processedContent || processedText}</div>`;
    case 'table':
      // 渲染表格为 HTML
      if (component.tableConfig) {
        const { cells = [], borderWidth = 1, borderColor = '#000000', showOuterBorder = true, showInnerBorder = true } = component.tableConfig;
        const tableHtml = `
          <table style="
            border-collapse: collapse;
            width: 100%;
            border: ${showOuterBorder ? `${borderWidth}px solid ${borderColor}` : 'none'};
          ">
            <tbody>
              ${cells.map((row: any[], rowIndex: number) => {
                const visibleCells = row.filter((cell: any) => {
                  const rowSpan = cell?.rowSpan ?? 1;
                  const colSpan = cell?.colSpan ?? 1;
                  return rowSpan > 0 && colSpan > 0;
                });
                if (visibleCells.length === 0) return '';
                return `
                  <tr>
                    ${visibleCells.map((cell: any, colIndex: number) => {
                      if (!cell) return '';
                      const rowSpan = cell.rowSpan ?? 1;
                      const colSpan = cell.colSpan ?? 1;
                      const content = cell.content || '';
                      const cellStyle = cell.style || {};
                      const processedContent = replaceVariablesToHTML(content, data, cellStyle);
                      return `
                        <td 
                          ${rowSpan > 1 ? `rowspan="${rowSpan}"` : ''}
                          ${colSpan > 1 ? `colspan="${colSpan}"` : ''}
                          style="
                            border: ${showInnerBorder ? `${borderWidth}px solid ${borderColor}` : 'none'};
                            padding: 8px;
                            vertical-align: top;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                            overflow-wrap: break-word;
                          "
                        >${processedContent}</td>
                      `;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
        return `<div style="${styleStr}">${tableHtml}</div>`;
      }
      return `<div style="${styleStr}">[表格]</div>`;
    case 'qrcode':
      return `<div style="${styleStr}">QR</div>`;
    case 'barcode':
      return `<div style="${styleStr}">||||||||||</div>`;
    default:
      return `<div style="${styleStr}">${processedContent || processedText}</div>`;
  }
};

// 渲染单个组件（带变量替换）
const renderComponent = (component: any, data: Record<string, any>): React.ReactNode => {
  if (!component) {
    return null;
  }

  const {
    id,
    type,
    text,
    content,
    style = {},
    textStyle = {},
    children = [],
  } = component;

  // 表格组件特殊处理
  if (type === 'table') {
    return renderTableComponent(component, data);
  }

  // 替换变量 - 优先使用 content，其次使用 text
  const sourceText = content || text;
  const processedContent = sourceText ? replaceVariables(sourceText, data) : undefined;

  // 兼容处理：编辑器中使用 textStyle，模板预览中可能使用 style
  const actualStyle = Object.keys(textStyle).length > 0 ? textStyle : style;

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    width: component.layout?.width || '100%',
    flex: `0 0 ${component.layout?.width || '100%'}`,
    maxWidth: component.layout?.width || '100%',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    overflow: 'visible',
    boxSizing: 'border-box',
    height: 'auto',
    minHeight: 'auto',
  };

  // 安全地添加样式属性 - 同时兼容 style 和 textStyle 的字段命名
  const commonStyle: React.CSSProperties = buildSafeStyle(baseStyle, {
    fontSize: actualStyle.fontSize,
    fontWeight: actualStyle.fontWeight || (actualStyle.bold ? 'bold' : 'normal'),
    color: actualStyle.color,
    backgroundColor: actualStyle.backgroundColor,
    borderWidth: actualStyle.borderWidth,
    borderColor: actualStyle.borderColor,
    borderStyle: actualStyle.borderWidth ? 'solid' : undefined,
    borderRadius: actualStyle.borderRadius,
    padding: actualStyle.padding,
    textAlign: actualStyle.textAlign || actualStyle.align,
  });

  switch (type) {
    case 'text':
    case 'paragraph':
    case 'heading':
      return (
        <div key={id} style={commonStyle}>
          {processedContent}
        </div>
      );
    case 'qrcode':
      return (
        <div
          key={id}
          style={{
            ...commonStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: actualStyle.backgroundColor || '#fff',
            border: '1px solid #e2e8f0',
            minHeight: '80px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            QR
          </div>
        </div>
      );
    case 'barcode':
      return (
        <div
          key={id}
          style={{
            ...commonStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: actualStyle.backgroundColor || '#fff',
            border: '1px solid #e2e8f0',
            minHeight: '50px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            ||||||||||
          </div>
        </div>
      );
    case 'container':
      return (
        <div key={id} style={commonStyle}>
          {children.map((child: any) => renderComponent(child, data))}
        </div>
      );
    case 'line':
      return (
        <div 
          key={id} 
          style={{
            ...commonStyle,
            height: `${component.thickness || 1}px`,
            backgroundColor: component.color || '#000000',
            margin: '8px 0',
          }} 
        />
      );
    case 'image':
      return (
        <div
          key={id}
          style={{
            ...commonStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            border: '1px dashed #d1d5db',
            minHeight: component.minHeight || '150px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#9ca3af',
            }}
          >
            图片
          </div>
        </div>
      );
    default:
      return (
        <div key={id} style={commonStyle}>
          {processedContent}
        </div>
      );
  }
};

export function TemplatePreview({ baseId, tableId, onEditTemplate }: TemplatePreviewProps) {
  const { templates, fetchTemplates, setCurrentTemplate } = useTemplateStore();
  const {
    records: storeRecords,
    currentIndex,
    setRecords,
    setCurrentIndex,
    nextRecord,
    prevRecord,
    isFromFeishu,
    setIsFromFeishu,
    getCurrentRecord,
  } = useSelectedDataStore();

  // 使用飞书SDK（使用 feishu-env）
  const isFeishuEnvironment = feishuEnv.isFeishuEnvironment();

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVariableMapping, setShowVariableMapping] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // 新增状态：排版方式和选中数据列表
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');
  const [selectedRecords, setSelectedRecords] = useState<SelectedRecord[]>([]);
  const [availableRecords, setAvailableRecords] = useState<Record<string, any>[]>([]);
  
  // 表格匹配状态
  const [currentTableInfo, setCurrentTableInfo] = useState<{
    tableId: string | null;
    tableName: string | null;
    baseId: string | null;
  }>({ tableId: null, tableName: null, baseId: null });
  const [isTableMatched, setIsTableMatched] = useState<boolean>(true);
  const [cachedRecords, setCachedRecords] = useState<Record<string, any>[]>([]);
  
  // 用于事件去重：缓存上一次处理的 recordId 和 tableId
  const lastProcessedEventRef = useRef<{ recordId: string | null; tableId: string | null }>({ 
    recordId: null, 
    tableId: null 
  });
  
  // 请求锁：防止重复点击导致的数据重复提取
  const requestLockRef = useRef<{
    isLocked: boolean;
    lastRequestTime: number;
    minInterval: number; // 最小请求间隔（毫秒）
  }>({
    isLocked: false,
    lastRequestTime: 0,
    minInterval: 500, // 500ms 内不允许重复请求
  });
  
  // 忽略列表：存储用户手动删除的记录 ID，避免被飞书事件恢复
  const [ignoredRecordIds, setIgnoredRecordIds] = useState<Set<string>>(new Set());

  // 左侧区域展开状态（默认收起）
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // 页面设置状态
  const [isPageSettingsOpen, setIsPageSettingsOpen] = useState(false);
  const [localPageConfig, setLocalPageConfig] = useState<PageConfig>({
    size: 'A4',
    orientation: 'portrait',
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    },
    continuous: false,
  });

  // 监听 selectedRecords 变化
  useEffect(() => {
    console.log('[TP] 选中记录变化:', selectedRecords.length, '条');
  }, [selectedRecords]);

  // 监听 availableRecords 变化
  useEffect(() => {
    console.log('[TP] 可用记录变化:', availableRecords.length, '条');
  }, [availableRecords]);

  // 加载模板列表
  useEffect(() => {
    console.log('[TemplatePreview] 开始加载模板列表...');
    fetchTemplates().then(() => {
      const loadedTemplates = useTemplateStore.getState().templates;
      console.log('[TemplatePreview] 模板列表加载完成:', loadedTemplates.map(t => ({ 
        id: t.id, 
        name: t.name, 
        userId: (t as any).user_id,
        hasComponents: !!t.data?.components?.length,
        componentCount: t.data?.components?.length || 0
      })));
    }).catch(err => {
      console.error('[TemplatePreview] 加载模板列表失败:', err);
    });
  }, [fetchTemplates]);





  // 获取单条记录（用于点击行时添加）
  const fetchSingleRecord = useCallback(async (recordId: string, tableId: string) => {
    // 请求锁检查：防止重复点击
    const now = Date.now();
    const lockInfo = requestLockRef.current;
    
    if (lockInfo.isLocked) {
      console.log('[TP] 请求被锁定，跳过重复调用');
      return;
    }
    
    if (now - lockInfo.lastRequestTime < lockInfo.minInterval) {
      console.log('[TP] 请求过于频繁，跳过');
      return;
    }
    
    // 获取锁
    lockInfo.isLocked = true;
    lockInfo.lastRequestTime = now;
    
    console.log('[TP] ========== 获取单条记录开始 ==========');
    console.log('[TP] recordId:', recordId, 'tableId:', tableId);
    
    // 实时检查表格匹配状态（避免依赖过期的 isTableMatched 状态）
    const isMatched = checkTableMatch(selectedTemplate, tableId);
    if (!isMatched && selectedTemplate) {
      console.log('[TP] 表格不匹配，跳过');
      toast.error('当前多维表格与模板不匹配，无法载入数据');
      lockInfo.isLocked = false;
      return;
    }
    
    try {
      // 检查是否在忽略列表中（用户手动删除过）
      if (ignoredRecordIds.has(recordId)) {
        console.log('[TP] 记录在忽略列表中，跳过:', recordId);
        return;
      }
      
      // 检查是否已存在
      const isAlreadyAdded = availableRecords.some(r => r.id === recordId);
      console.log('[TP] 是否已存在:', isAlreadyAdded, '当前记录数:', availableRecords.length);
      
      if (isAlreadyAdded) {
        console.log('[TP] 记录已存在，跳过:', recordId);
        toast.info('该记录已在列表中');
        return;
      }
      
      console.log('[TP] 开始调用 SDK...');
      
      // 获取单条记录和字段元数据
      const { base } = await import('@lark-base-open/js-sdk');
      console.log('[TP] SDK 导入成功');
      
      const table = await base.getTable(tableId);
      console.log('[TP] 获取表格成功');
      
      const record = await table.getRecordById(recordId);
      console.log('[TP] 获取记录结果:', record ? '成功' : '为空', '类型:', typeof record);
      
      if (!record) {
        console.warn('[TP] 未找到记录:', recordId);
        toast.error('未找到记录');
        return;
      }
      
      // 检查 record 的实际结构
      console.log('[TP] 记录完整内容:', JSON.stringify(record, null, 2));
      console.log('[TP] 记录对象 keys:', Object.keys(record));
      console.log('[TP] record.fields 是否存在:', 'fields' in record);
      console.log('[TP] record.fields:', record.fields);
      console.log('[TP] record.fields keys:', record.fields ? Object.keys(record.fields) : '无 fields');
      
      // 如果 record.fields 不存在，尝试直接使用 record 本身
      const actualFields = record.fields || record;
      console.log('[TP] 实际使用的字段对象:', actualFields);
      console.log('[TP] 实际字段数:', Object.keys(actualFields).length);
      
      // 获取字段列表以进行ID到名称的映射
      console.log('[TP] 开始获取字段元数据...');
      const fieldMetaList = await table.getFieldMetaList();
      console.log('[TP] 字段元数据数量:', fieldMetaList?.length || 0);
      
      // 创建字段 ID 到字段名称的映射
      const fieldMap: Record<string, string> = {};
      if (fieldMetaList && Array.isArray(fieldMetaList)) {
        fieldMetaList.forEach((field: any) => {
          if (field?.id) {
            fieldMap[field.id] = field.name;
          }
        });
      }
      
      console.log('[TP] 字段映射表:', Object.keys(fieldMap).length, '个字段');
      
      // 提取字段数据 - 处理 SDK 可能返回的不同数据结构
      let rawFields: Record<string, any> = {};
      
      // 方案1: record.fields 存在且是对象
      if (record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields)) {
        rawFields = record.fields;
        console.log('[TP] 从 record.fields 提取字段');
      } 
      // 方案2: record 本身包含字段数据（键是字段ID）
      else {
        // 排除元数据字段，剩下的就是字段数据
        const metaKeys = ['id', 'recordId', 'createdTime', 'lastModifiedTime', 'modifiedTime', 'fields'];
        Object.keys(record).forEach(key => {
          if (!metaKeys.includes(key)) {
            rawFields[key] = (record as any)[key];
          }
        });
        console.log('[TP] 从 record 对象本身提取字段');
      }
      
      console.log('[TP] 原始字段数量:', Object.keys(rawFields).length);
      console.log('[TP] 原始字段ID列表:', Object.keys(rawFields).slice(0, 10)); // 只显示前10个
      
      // 转换格式：将字段ID键转换为字段名键
      const formattedFields: Record<string, any> = {};
      
      for (const [fieldId, value] of Object.entries(rawFields)) {
        // 使用字段映射表，如果没有映射则保持原ID
        const fieldName = fieldMap[fieldId] || fieldId;
        formattedFields[fieldName] = value;
        console.log(`[TP] 字段映射: ${fieldId} -> ${fieldName}`);
      }
      
      console.log('[TP] 转换后字段数量:', Object.keys(formattedFields).length);
      console.log('[TP] 转换后字段名:', Object.keys(formattedFields).slice(0, 10));
      
      // 显示获取到的字段信息（调试用）
      const fieldNames = Object.keys(formattedFields);
      toast.info(`获取到 ${fieldNames.length} 个字段: ${fieldNames.slice(0, 3).join(', ')}${fieldNames.length > 3 ? '...' : ''}`);
      
      const formattedRecord = {
        ...formattedFields,
        id: recordId,
        _sourceRecordId: recordId,
        _rowIndex: availableRecords.length,
      };
      
      console.log('[TP] 最终格式化记录:', formattedRecord);
      
      // 添加到列表
      setAvailableRecords(prev => [...prev, formattedRecord]);
      console.log('[TP] 记录已添加到列表');
      toast.success('已添加记录');
      
    } catch (err) {
      console.error('[TP] 获取单条记录失败:', err);
      toast.error('获取记录失败');
    } finally {
      // 释放锁
      requestLockRef.current.isLocked = false;
    }
    console.log('[TP] ========== 获取单条记录结束 ==========');
  }, [selectedTemplate, availableRecords, ignoredRecordIds]);

  // 从 feishu-env 获取选中记录（多选时使用）
  const fetchSelectedRecordsFromEnv = useCallback(async () => {
    // 请求锁检查：防止重复点击
    const now = Date.now();
    const lockInfo = requestLockRef.current;
    
    if (lockInfo.isLocked) {
      console.log('[TP] 请求被锁定，跳过重复调用');
      return;
    }
    
    if (now - lockInfo.lastRequestTime < lockInfo.minInterval) {
      console.log('[TP] 请求过于频繁，跳过');
      return;
    }
    
    // 获取锁
    lockInfo.isLocked = true;
    lockInfo.lastRequestTime = now;
    
    // 检查表格匹配状态，如果不匹配则不获取记录
    if (!isTableMatched && selectedTemplate) {
      console.log('[TP] 表格不匹配，跳过获取飞书记录');
      toast.error('当前表格与模板不匹配，无法载入数据');
      lockInfo.isLocked = false;
      return;
    }
    
    try {
      console.log('[TP] ========== fetchSelectedRecordsFromEnv 开始 ==========');
      const selRecords = await feishuEnv.getSelectedRecords();
      console.log('[TP] getSelectedRecords 返回:', selRecords.length, '条记录');
      
      if (selRecords.length > 0) {
        // 打印第一条记录的结构
        console.log('[TP] 第一条记录结构:', JSON.stringify(selRecords[0], null, 2));
        console.log('[TP] 第一条记录 fields:', JSON.stringify(selRecords[0].fields, null, 2));
        
        // 转换格式 - 确保每条记录都有唯一 ID
        const formattedRecords = selRecords.map((record, index) => {
          // 生成唯一 ID：优先使用 record.id，其次是 recordId
          // 注意：不使用 Date.now()，确保同一记录多次点击生成相同 ID
          const uniqueId = record.id || (record as any).recordId || `record_${index}`;
          const formattedRecord = {
            ...record.fields,
            id: uniqueId,
            _sourceRecordId: record.id || (record as any).recordId, // 保存原始记录ID用于调试
            _rowIndex: index,
          };
          console.log(`[TP] 格式化记录 ${index}:`, { id: uniqueId, fields: Object.keys(record.fields || {}) });
          return formattedRecord;
        });
        
        console.log('[TP] 格式化后记录数:', formattedRecords.length);
        
        // 只追加到可用记录列表，不自动设置为当前记录
        setAvailableRecords(prev => {
          console.log('[TP] setAvailableRecords 回调，当前记录数:', prev.length);
          const newRecords = [...prev];
          let addedCount = 0;
          let skippedCount = 0;
          let ignoredCount = 0;
          
          formattedRecords.forEach(record => {
            // 获取所有可能的ID用于去重检查
            const recordId = record.id;
            const sourceRecordId = record._sourceRecordId;
            
            // 检查是否在忽略列表中（用户手动删除过）
            // 同时检查 id 和 _sourceRecordId
            if (ignoredRecordIds.has(recordId) || (sourceRecordId && ignoredRecordIds.has(sourceRecordId))) {
              ignoredCount++;
              console.log('[TP] 跳过已忽略记录:', { recordId, sourceRecordId });
              return;
            }
            
            // 严格去重：检查是否已存在相同 ID 或相同源记录 ID 的记录
            const isDuplicate = newRecords.some(r => {
              // 检查主ID是否相同
              if (r.id === recordId) return true;
              // 检查源记录ID是否相同（如果都有的话）
              if (sourceRecordId && r._sourceRecordId === sourceRecordId) return true;
              // 检查源记录ID是否匹配主ID（兼容旧数据）
              if (sourceRecordId && r.id === sourceRecordId) return true;
              if (r._sourceRecordId === recordId) return true;
              return false;
            });
            
            if (!isDuplicate) {
              newRecords.push(record);
              addedCount++;
              console.log('[TP] 添加记录:', { 
                id: recordId, 
                sourceRecordId,
                fields: Object.keys(record).filter(k => !k.startsWith('_') && k !== 'id').slice(0, 5)
              });
            } else {
              skippedCount++;
              console.log('[TP] 跳过重复记录:', { recordId, sourceRecordId });
            }
          });
          
          console.log(`[TP] 新增: ${addedCount}, 跳过: ${skippedCount}, 忽略: ${ignoredCount}, 总记录: ${newRecords.length}`);
          console.log('[TP] ========== fetchSelectedRecordsFromEnv 结束 ==========');
          return newRecords;
        });
      } else {
        console.log('[TP] getSelectedRecords 返回空数组');
      }
    } catch (err) {
      console.error('[TP] 获取记录失败:', err);
    } finally {
      // 释放锁
      requestLockRef.current.isLocked = false;
    }
  }, [isTableMatched, selectedTemplate, ignoredRecordIds]);
  
  // 获取当前表格信息
  const fetchCurrentTableInfo = useCallback(async () => {
    try {
      const { base } = await import('@lark-base-open/js-sdk');
      const selection = await base.getSelection();
      
      // 如果表格ID没有变化，跳过更新
      if (selection?.tableId && selection.tableId === currentTableInfo.tableId) {
        return;
      }
      
      console.log('[TP] base.getSelection() 返回:', selection);
      
      if (!selection?.tableId) {
        console.warn('[TP] 无法获取表格ID');
        setCurrentTableInfo({
          tableId: null,
          tableName: '未知表格',
          baseId: selection?.baseId || null,
        });
        return;
      }
      
      // 尝试获取表格名称
      let tableName = '多维表格';
      try {
        const table = await base.getTable(selection.tableId);
        tableName = (table as any).name || selection.tableId;
        console.log('[TP] 获取到表格:', { id: selection.tableId, name: tableName });
      } catch (tableErr) {
        console.warn('[TP] 获取表格名称失败，使用ID作为名称:', selection.tableId);
        tableName = selection.tableId; // 使用ID作为名称
      }
      
      setCurrentTableInfo({
        tableId: selection.tableId,
        tableName: tableName,
        baseId: selection.baseId || null,
      });
      
      console.log('[TP] 当前表格信息已更新:', {
        tableId: selection.tableId,
        tableName,
        baseId: selection.baseId,
      });
    } catch (err) {
      console.error('[TP] 获取表格信息失败:', err);
    }
  }, [currentTableInfo.tableId]);
  

  // 初始化：设置飞书环境状态并初始化 SDK，添加选中变化监听器，获取当前表格信息
  useEffect(() => {
    const init = async () => {
      await feishuEnv.init();
      const isReady = feishuEnv.isFeishuEnvironment();
      setIsFromFeishu(isReady);

      if (isReady) {
        // 获取当前表格信息
        await fetchCurrentTableInfo();
        // 注意：不在初始化时自动获取记录，等待用户点击多维表格行或点击模板

        // 注册选中变化监听器
        const unsubscribe = onSelectionChange((event) => {
          const { recordId, tableId } = event?.data || {};
          
          // 状态比对：如果记录和表格都没变，直接返回，不执行后续逻辑
          if (recordId && tableId && 
              recordId === lastProcessedEventRef.current.recordId && 
              tableId === lastProcessedEventRef.current.tableId) {
            return;
          }
          
          // 更新缓存
          if (recordId && tableId) {
            lastProcessedEventRef.current = { recordId, tableId };
          }
          
          console.log('[TP] 飞书选择变化事件（已去重）:', event.data);

          // 表格切换时重新获取表格信息
          if (tableId) {
            console.log('[TP] 检测到表格变化，重新获取表格信息:', tableId);
            fetchCurrentTableInfo();
          }

          // 记录选中变化时获取记录 - 使用 fetchSelectedRecordsFromEnv 复用完整的字段处理逻辑
          if (recordId) {
            console.log('[TP] 记录选中变化，调用 fetchSelectedRecordsFromEnv');
            fetchSelectedRecordsFromEnv();
          }
        });

        return () => unsubscribe();
      }
    };

    init();
  }, [setIsFromFeishu, fetchCurrentTableInfo, fetchSelectedRecordsFromEnv, fetchSingleRecord]);

  // 监听模板和表格信息变化，更新匹配状态并处理缓存
  const prevMatchedRef = useRef<boolean>(true);

  useEffect(() => {
    const matched = checkTableMatch(selectedTemplate, currentTableInfo.tableId);
    const wasMatched = prevMatchedRef.current;

    // 只有匹配状态真正变化时才更新
    if (matched !== isTableMatched) {
      setIsTableMatched(matched);
      prevMatchedRef.current = matched;
    }

    // 如果从不匹配变为匹配，恢复缓存的数据
    if (matched && !wasMatched && cachedRecords.length > 0) {
      console.log('[TP] 表格恢复匹配，恢复缓存记录:', cachedRecords.length);
      setAvailableRecords(cachedRecords);
      setCachedRecords([]);
      toast.success(`已恢复 ${cachedRecords.length} 条缓存记录`);
    }

    // 如果从匹配变为不匹配，清空可用记录并缓存
    if (!matched && wasMatched && availableRecords.length > 0) {
      console.log('[TP] 表格不匹配，缓存当前记录:', availableRecords.length);
      setCachedRecords(availableRecords);
      setAvailableRecords([]);
      // 清空已选记录，因为它们来自不匹配的表格
      setSelectedRecords([]);
    }

    console.log('[TP] 表格匹配检查:', {
      matched,
      templateTableId: selectedTemplate?.data?.tableId,
      currentTableId: currentTableInfo.tableId,
      currentTableName: currentTableInfo.tableName,
    });
  }, [selectedTemplate, currentTableInfo]);

  // 添加记录到选中列表（防重复，带表格匹配检查）
  const addRecordToSelection = useCallback((record: Record<string, any>) => {
    // 检查表格匹配状态
    if (!isTableMatched && selectedTemplate) {
      toast.error('当前多维表格与模板不匹配，无法添加数据');
      return;
    }
    
    setSelectedRecords(prev => {
      if (prev.some(r => r.id === record.id)) {
        console.log('[TP] 记录已在选中列表:', record.id);
        return prev;
      }
      const newList = [...prev, { id: record.id, data: record, addedAt: Date.now() }];
      console.log('[TP] 已添加到选中列表:', record.id, '总数:', newList.length);
      return newList;
    });
  }, [isTableMatched, selectedTemplate]);
  
  // 从选中列表和可用列表移除记录（同时加入忽略列表，防止被飞书事件恢复）
  const removeRecordFromSelection = useCallback((recordId: string) => {
    // 1. 将 ID 加入忽略集合
    setIgnoredRecordIds(prev => {
      const newSet = new Set(prev);
      newSet.add(recordId);
      console.log('[TP] 加入忽略列表:', recordId, '忽略总数:', newSet.size);
      return newSet;
    });
    
    // 2. 从选中列表移除
    setSelectedRecords(prev => {
      const newList = prev.filter(r => r.id !== recordId);
      console.log('[TP] 从选中列表移除:', recordId, '剩余:', newList.length);
      return newList;
    });
    
    // 3. 从可用列表移除（同时检查 id 和 _sourceRecordId）
    setAvailableRecords(prev => {
      const removedRecord = prev.find(r => r.id === recordId || r._sourceRecordId === recordId);
      const actualRecordId = removedRecord?.id || recordId;
      const actualSourceId = removedRecord?._sourceRecordId;
      
      const newList = prev.filter(r => r.id !== recordId && r._sourceRecordId !== recordId);
      console.log('[TP] 从可用列表移除:', { 
        searchId: recordId, 
        actualRecordId, 
        actualSourceId,
        removedCount: prev.length - newList.length,
        remaining: newList.length 
      });
      return newList;
    });
    
    toast.success('已删除记录');
  }, []);
  
  // 清空选中列表（同时清空忽略列表）
  const clearSelectedRecords = useCallback(() => {
    setSelectedRecords([]);
    setAvailableRecords([]);
    setIgnoredRecordIds(new Set());
    console.log('[TP] 已清空所有列表和忽略集合');
    toast.success('已清空列表');
  }, []);

  // 处理模板选择
  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    // 清空之前选中的数据和忽略列表（新模板上下文）
    setSelectedRecords([]);
    setIgnoredRecordIds(new Set());
    setAvailableRecords([]);
    
    console.log('[TemplatePreview] 选择模板:', {
      name: template.name,
      id: template.id,
      tableId: template.data?.tableId,
      tableName: template.data?.tableName,
      hasData: !!template.data,
    });
    
    // 从模板数据中读取页面配置
    if (template.data?.pageConfig) {
      setLocalPageConfig(template.data.pageConfig);
      console.log('[TemplatePreview] 从模板加载页面配置:', template.data.pageConfig);
    } else {
      // 使用默认配置
      setLocalPageConfig({
        size: 'A4',
        orientation: 'portrait',
        margins: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
        },
        continuous: false,
      });
    }
    
    // 详细的调试信息
    const components = template.data?.components || [];
    const dataStr = template.data ? JSON.stringify(template.data, null, 2).slice(0, 3000) : '(empty)';
    const componentsInfo = components.map((comp: any, idx: number) => 
      `[${idx}] type=${comp.type}, id=${comp.id}, content=${!!comp.content}, text=${!!comp.text}, textStyle=${!!comp.textStyle}, style=${!!comp.style}`
    ).join('\n');
    
    const pageConfigInfo = template.data?.pageConfig || { size: 'A4', orientation: 'portrait' };
    const pageSize = PAGE_SIZES[pageConfigInfo.size] || PAGE_SIZES.A4;
    const actualWidth = pageConfigInfo.orientation === 'portrait' ? pageSize.width : pageSize.height;
    const actualHeight = pageConfigInfo.orientation === 'portrait' ? pageSize.height : pageSize.width;
    
    const debugText = `选中模板: ${template.name}\n` +
      `模板ID: ${template.id}\n` +
      `有数据: ${!!template.data}\n` +
      `数据类型: ${typeof template.data}\n` +
      `组件数量: ${components.length}\n` +
      `页面尺寸: ${pageConfigInfo.size} ${pageConfigInfo.orientation === 'portrait' ? '纵向' : '横向'}\n` +
      `画布尺寸: ${actualWidth}mm × ${actualHeight}mm\n` +
      `页边距: 上${pageConfigInfo.margins?.top || 20}mm 下${pageConfigInfo.margins?.bottom || 20}mm 左${pageConfigInfo.margins?.left || 20}mm 右${pageConfigInfo.margins?.right || 20}mm\n` +
      `组件详情:\n${componentsInfo}\n\n` +
      `完整数据:\n${dataStr}`;
    setDebugInfo(debugText);
    
    console.log('[TemplatePreview] 选中模板详情:', {
      templateName: template.name,
      templateId: template.id,
      hasData: !!template.data,
      componentCount: components.length,
      pageConfig: pageConfigInfo,
      canvasSize: `${actualWidth}mm × ${actualHeight}mm`,
      components: components.map((c: any) => ({
        type: c.type,
        id: c.id,
        hasContent: !!c.content,
        hasText: !!c.text,
        hasTextStyle: !!c.textStyle,
        hasStyle: !!c.style,
      }))
    });
  }, []);

  // 处理编辑模板
  const handleEdit = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('请先选择一个模板');
      return;
    }
    setCurrentTemplate(selectedTemplate);
    onEditTemplate?.(selectedTemplate);
  }, [selectedTemplate, setCurrentTemplate, onEditTemplate]);

  // 刷新数据（使用飞书 SDK 获取记录）
  const handleRefreshData = useCallback(async () => {
    if (!isFeishuEnvironment) {
      toast.info('当前不在飞书环境中');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('[TP] ========== handleRefreshData 开始 ==========');
      // getCheckboxSelectedRecords 会自动处理：
      // 1. 尝试使用 table.getSelectedRecordIds() 获取选中行
      // 2. 如果不可用，降级到获取第一条记录
      const records = await feishuEnv.getCheckboxSelectedRecords();
      console.log('[TP] getCheckboxSelectedRecords 返回:', records.length, '条记录');
      
      if (records.length > 0) {
        console.log('[TP] 第一条记录:', JSON.stringify(records[0], null, 2));
        
        // 转换格式
        const formattedRecords = records.map((record, index) => {
          const formatted = {
            ...record.fields,
            id: record.id,
            _rowIndex: index,
          };
          console.log(`[TP] 格式化记录 ${index}:`, { id: record.id, fieldKeys: Object.keys(record.fields || {}) });
          return formatted;
        });

        console.log('[TP] 设置 records:', formattedRecords.length, '条');
        setRecords(formattedRecords);
        setCurrentIndex(0);
        // 更新可用记录列表
        setAvailableRecords(formattedRecords);
        console.log('[TP] ========== handleRefreshData 结束 ==========');
        toast.success(`已加载 ${formattedRecords.length} 条记录`);
        
        if (showDebugInfo) {
          setDebugInfo(`刷新数据成功:\n${JSON.stringify(records.map(r => ({ id: r.id, fields: r.fields })), null, 2)}`);
        }
      } else {
        console.log('[TP] 未获取到任何记录');
        toast.info('未获取到任何记录');
        setRecords([]);
        setCurrentIndex(0);
        setAvailableRecords([]);
      }
    } catch (err) {
      console.error('[TemplatePreview] 刷新数据失败:', err);
      toast.error('刷新数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [isFeishuEnvironment, setRecords, setCurrentIndex, showDebugInfo]);

  // 扫描 Checkbox（功能已移除，显示提示）
  // 获取当前选中的模板
  const currentRecord = getCurrentRecord();

  // 使用 storeRecords 作为主要的 records 变量
  const records = storeRecords;

  // 提取模板中的变量
  const templateVariables = useMemo(() => {
    if (!selectedTemplate || !selectedTemplate.data?.components) {
      return [];
    }
    return extractVariables(selectedTemplate.data.components);
  }, [selectedTemplate]);

  // 检查数据匹配情况
  const variableMapping = useMemo(() => {
    if (!currentRecord || templateVariables.length === 0) {
      return [];
    }

    return templateVariables.map((varName) => {
      const hasValue = currentRecord[varName] !== undefined;
      return {
        name: varName,
        hasValue,
        value: currentRecord[varName],
      };
    });
  }, [currentRecord, templateVariables]);

  // 处理打印
  const handlePrint = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('请先选择一个模板');
      return;
    }

    if (selectedRecords.length === 0) {
      toast.error('没有可打印的数据');
      return;
    }

    window.print();
  }, [selectedTemplate, selectedRecords.length]);

  // 处理批量打印（所有选中的记录）
  const handleBatchPrint = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('请先选择一个模板');
      return;
    }

    if (selectedRecords.length === 0) {
      toast.error('没有可打印的数据');
      return;
    }

    // 打开新窗口进行批量打印
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('请允许弹窗以进行批量打印');
      return;
    }

    // 根据排版方式生成打印内容
    let printContent = '';
    const components = selectedTemplate.data?.components || [];
    const pageConfig = selectedTemplate.data?.pageConfig;
    const padding = pageConfig?.margins
      ? `${pageConfig.margins.top || 20}mm ${pageConfig.margins.right || 20}mm ${pageConfig.margins.bottom || 20}mm ${pageConfig.margins.left || 20}mm`
      : '20mm';
    
    switch (layoutMode) {
      case 'default':
        // 默认：每条数据一页
        printContent = selectedRecords.map((record, index) => {
          const isLast = index === selectedRecords.length - 1;
          return `
          <div class="print-page" style="
            width: 210mm;
            min-height: 297mm;
            height: auto;
            padding: ${padding};
            margin: 0 auto;
            box-sizing: border-box;
            page-break-after: ${isLast ? 'auto' : 'always'};
            position: relative;
            background: white;
          ">
            <div style="
              display: flex;
              flex-wrap: wrap;
              align-content: flex-start;
              gap: 12px;
            ">
              ${components.map((comp: any) => {
                const html = renderComponentToHTML(comp, record.data);
                return html;
              }).join('')}
            </div>
          </div>
        `}).join('');
        break;
        
      case 'continuous':
        // 连续：所有数据在一页连续显示
        printContent = `
          <div class="print-page" style="
            width: 210mm;
            height: auto;
            padding: ${padding};
            margin: 0 auto;
            box-sizing: border-box;
            background: white;
          ">
            ${selectedRecords.map((record, index) => {
              const isLast = index === selectedRecords.length - 1;
              return `
                <div style="
                  margin-bottom: ${isLast ? '0' : '40px'};
                  padding-bottom: ${isLast ? '0' : '40px'};
                  border-bottom: ${isLast ? 'none' : '1px dashed #e5e7eb'};
                ">
                  <div style="
                    display: flex;
                    flex-wrap: wrap;
                    align-content: flex-start;
                    gap: 12px;
                  ">
                    ${components.map((comp: any) => renderComponentToHTML(comp, record.data)).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
        break;
        
      case 'label':
        // 标签：网格布局
        printContent = `
          <div class="print-page" style="
            width: 210mm;
            height: auto;
            padding: ${padding};
            margin: 0 auto;
            box-sizing: border-box;
            background: white;
          ">
            <div style="
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(90mm, 1fr));
              gap: 10mm;
            ">
              ${selectedRecords.map((record) => `
                <div style="
                  border: 1px solid #e5e7eb;
                  border-radius: 4px;
                  padding: 3mm;
                  break-inside: avoid;
                ">
                  <div style="
                    display: flex;
                    flex-wrap: wrap;
                    align-content: flex-start;
                    gap: 8px;
                  ">
                    ${components.map((comp: any) => renderComponentToHTML(comp, record.data)).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>批量打印 - ${selectedTemplate.name}</title>
        <style>
          /* =========================================
             批量打印专用样式 - 确保A4尺寸和内容完整
             ========================================= */
          
          /* 基础样式 */
          * {
            box-sizing: border-box !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: auto !important;
            background: #ffffff !important;
          }

          body {
            font-family: system-ui, -apple-system, sans-serif;
          }

          /* =========================================
             打印媒体查询
             ========================================= */
          @media print {
            /* 1. 强制显示背景图形和颜色 */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            /* 2. 强制A4纸张尺寸，无边距 */
            @page {
              size: A4;
              margin: 0;
              padding: 0;
            }

            /* 3. 完全重置html和body */
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: auto !important;
              overflow: visible !important;
              background: transparent !important;
            }

            /* 4. 打印页面 - 精确A4尺寸 */
            .print-page {
              position: relative !important;
              width: 210mm !important;
              min-height: 297mm !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              page-break-after: always;
              box-shadow: none !important;
              background: #ffffff !important;
              box-sizing: border-box !important;
            }

            /* 5. 最后一页不加分页符 */
            .print-page:last-of-type {
              page-break-after: auto !important;
            }

            /* 6. 确保所有子元素正确显示 */
            .print-page > *,
            .print-page > * > * {
              display: block !important;
            }

            /* 7. 保留Flex布局 */
            .print-page [style*="display: flex"],
            .print-page [style*="flex-wrap"] {
              display: flex !important;
              flex-wrap: wrap !important;
            }

            /* 8. 表格打印修复 */
            .print-page table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: avoid !important;
              table-layout: fixed !important;
            }

            .print-page th,
            .print-page td {
              border: 1px solid #000000 !important;
              padding: 8px !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: pre-wrap !important;
              color: #000000 !important;
              background: #ffffff !important;
              vertical-align: top !important;
            }

            /* 9. 确保文本正确换行和显示 */
            .print-page * {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              box-sizing: border-box !important;
              color: #000000 !important;
              background: transparent !important;
            }

            /* 10. 分页控制 - 避免组件内部分页 */
            .print-page > div,
            .print-page > div > div {
              page-break-inside: avoid !important;
            }

            /* 11. 图片打印修复 */
            .print-page img {
              max-width: 100% !important;
              height: auto !important;
              page-break-inside: avoid !important;
            }
          }

          /* =========================================
             屏幕预览样式
             ========================================= */
          @media screen {
            body {
              margin: 0;
              padding: 20px;
              background: #f0f0f0;
            }

            .print-page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto 20px;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              box-sizing: border-box;
              position: relative;
            }

            .print-page:last-child {
              margin-bottom: 0;
            }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast.success(`已打开批量打印窗口，共 ${selectedRecords.length} 条记录`);
  }, [selectedTemplate, selectedRecords, layoutMode]);

  // 左侧面板 ref，用于检测点击外部
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 点击外部区域收起面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // 检查是否点击了模板选择按钮（避免冲突）
        const target = event.target as HTMLElement;
        const isTemplateButton = target.closest('[data-template-selector]');
        if (!isTemplateButton && sidebarExpanded) {
          setSidebarExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarExpanded]);

  return (
    <div className="print-wrapper h-full flex gap-3 p-3 overflow-hidden">
      {/* 左侧：模板列表与数据匹配选择夹 - 条件渲染 */}
      {sidebarExpanded && (
        <Card ref={sidebarRef} className="sidebar-left no-print w-64 flex-shrink-0 flex flex-col animate-in slide-in-from-left-2 duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                打印预览
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => setSidebarExpanded(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <Tabs defaultValue="templates" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-4 mt-2 w-auto">
                <TabsTrigger value="templates" className="text-xs">
                  模板 ({templates.length})
                </TabsTrigger>
                <TabsTrigger value="data" className="text-xs">
                  数据 ({selectedRecords.length})
                </TabsTrigger>
              </TabsList>
              
              {/* 模板列表 Tab */}
              <TabsContent value="templates" className="flex-1 overflow-hidden mt-2">
                <ScrollArea className="h-full px-4">
                  <div className="space-y-3 pb-4">
                    {templates.map((template) => {
                      // 获取该模板的变量
                      const vars = template.data?.components 
                        ? extractVariables(template.data.components) 
                        : [];
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedTemplate?.id === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {template.description}
                            </div>
                          )}
                          {/* 模板变量显示 */}
                          {vars.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {vars.slice(0, 3).map((v) => (
                                <span key={v} className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {v}
                                </span>
                              ))}
                              {vars.length > 3 && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  +{vars.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {template.data?.components?.length || 0} 组件
                            </Badge>
                            {template.isPublic && (
                              <Badge variant="secondary" className="text-xs">
                                公开
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {templates.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">暂无模板</p>
                        <p className="text-xs mt-1">请在编辑器中创建模板</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              {/* 数据匹配 Tab */}
              <TabsContent value="data" className="flex-1 overflow-hidden mt-2">
                <ScrollArea className="h-full px-4">
                  <div className="space-y-3 pb-4">
                    {/* 表格匹配状态显示 */}
                    {selectedTemplate && (
                      <div className="p-3 rounded-lg bg-gray-50 border mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">表格匹配</span>
                          <Badge 
                            variant={isTableMatched ? "default" : "destructive"}
                            className={`text-[10px] ${isTableMatched ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                          >
                            {isTableMatched ? '匹配' : '不匹配'}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-gray-600 truncate" title={currentTableInfo.tableId || ''}>
                          表格ID: {currentTableInfo.tableId || '未知'}
                        </div>
                        {selectedTemplate.data?.tableId ? (
                          <div className="mt-1 text-[10px] text-gray-400 truncate" title={selectedTemplate.data.tableId as string}>
                            模板绑定: {(selectedTemplate.data.tableName as string) || (selectedTemplate.data.tableId as string)}
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-amber-600">
                            模板未绑定表格（旧模板）
                          </div>
                        )}
                        {!isTableMatched && (
                          <div className="mt-2 text-[10px] text-red-600 font-medium">
                            当前表格与模板不匹配，无法添加数据
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 空状态提示 */}
                    {selectedTemplate && availableRecords.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm mb-2">暂无数据</p>
                        <p className="text-xs">
                          请在多维表格中点击行以载入数据
                        </p>
                      </div>
                    )}
                    
                    {selectedTemplate ? (
                      availableRecords.length > 0 ? (
                        availableRecords.map((record, idx) => {
                          const isSelected = selectedRecords.some(r => r.id === record.id);
                          return (
                            <div
                              key={record.id || idx}
                              className={`relative w-full text-left p-3 rounded-lg border text-xs transition-all box-border ${
                                isSelected 
                                  ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 shadow-sm' 
                                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }`}
                            >
                              {/* 删除按钮 - 始终显示 */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('[TP] 点击删除:', record.id);
                                  removeRecordFromSelection(record.id);
                                }}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                              >
                                ×
                              </button>
                              
                              {/* 卡片内容 - 可点击选中/取消选中 */}
                              <button
                                onClick={() => {
                                  console.log('[TP] 点击卡片:', record.id, isSelected ? '取消选中' : '选中');
                                  if (isSelected) {
                                    removeRecordFromSelection(record.id);
                                  } else {
                                    addRecordToSelection(record);
                                  }
                                }}
                                className="w-full text-left"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`font-medium truncate flex-1 min-w-0 ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {record['流程名称'] || record.编号 || record.id || `记录 ${idx + 1}`}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded flex-shrink-0">
                                      已选
                                    </span>
                                  )}
                                </div>
                                
                                {/* 显示更多预览字段 */}
                                <div className="mt-2 space-y-1">
                                  {Object.entries(record)
                                    .filter(([key]) => key !== 'id' && key !== '_rowIndex' && !key.startsWith('_'))
                                    .slice(0, 4)
                                    .map(([key, value]) => {
                                      const displayValue = formatFieldValue(key, value);
                                      const rawType = typeof value;
                                      return (
                                        <div key={key} className="flex gap-1 text-[11px]">
                                          <span className="text-gray-400 shrink-0">{key}:</span>
                                          <span className={`truncate flex-1 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                                            {displayValue || `[${rawType}]`}
                                          </span>
                                        </div>
                                      );
                                    })}
                                </div>
                              </button>
                            </div>
                          );
                        })
                      ) : null
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">选择模板后可添加数据</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 中间：打印预览 - 支持横向滚动 */}
      <div className="print-content-area flex-1 min-w-0 flex flex-col overflow-auto">
        {/* 工具栏 */}
        <Card className="no-print mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* 左侧：排版方式切换 */}
              <div className="flex items-center gap-4">
                <ToggleGroup 
                  type="single" 
                  value={layoutMode}
                  onValueChange={(v) => v && setLayoutMode(v as LayoutMode)}
                  className="border rounded-lg p-1"
                >
                  <ToggleGroupItem value="default" aria-label="默认排版" className="text-xs px-3">
                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                    默认
                  </ToggleGroupItem>
                  <ToggleGroupItem value="continuous" aria-label="连续排版" className="text-xs px-3">
                    <List className="h-3.5 w-3.5 mr-1.5" />
                    连续
                  </ToggleGroupItem>
                  <ToggleGroupItem value="label" aria-label="标签排版" className="text-xs px-3">
                    <Tag className="h-3.5 w-3.5 mr-1.5" />
                    标签
                  </ToggleGroupItem>
                </ToggleGroup>

                {/* 页面设置按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPageSettingsOpen(true)}
                  disabled={!selectedTemplate}
                >
                  <Layout className="h-4 w-4 mr-2" />
                  页面设置
                </Button>
                
                {/* 编辑模板按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={!selectedTemplate}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  编辑模板
                </Button>
              </div>

              {/* 中间：已选数据计数 */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  已选 {selectedRecords.length} 条数据
                </Badge>
                {selectedRecords.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-red-500 hover:text-red-600"
                    onClick={clearSelectedRecords}
                  >
                    清空
                  </Button>
                )}
              </div>

              {/* 右侧：打印按钮 */}
              <div className="flex items-center gap-2">
                {/* 模板选择按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  data-template-selector
                  onClick={() => setSidebarExpanded(!sidebarExpanded)}
                  className={`font-medium ${sidebarExpanded ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {selectedTemplate ? selectedTemplate.name : '选择模板'}
                  <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${sidebarExpanded ? 'rotate-90' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchPrint}
                  disabled={!selectedTemplate || selectedRecords.length === 0}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  批量打印 ({selectedRecords.length})
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrint}
                  disabled={!selectedTemplate || selectedRecords.length === 0}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  打印
                </Button>
              </div>
            </div>

            {/* 调试信息开关 */}
            <div className="no-print mt-2 flex items-center gap-2">
            </div>
          </CardContent>
        </Card>

        {/* A4 预览区域 - 支持三种排版方式 */}
        <div className="flex-1 bg-gray-100 rounded-lg overflow-auto relative">
          {/* 页面尺寸信息显示 */}
          {selectedTemplate && (
            <div className="no-print bg-white border-b p-2 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">画布尺寸:</span>
                <Badge variant="outline">
                  {localPageConfig.size} {localPageConfig.orientation === 'portrait' ? '纵向' : '横向'}
                </Badge>
                <Badge variant="secondary">
                  {(localPageConfig.orientation === 'portrait' 
                    ? PAGE_SIZES[localPageConfig.size]?.width || 210 
                    : PAGE_SIZES[localPageConfig.size]?.height || 297
                  )}mm × {(localPageConfig.orientation === 'portrait' 
                    ? PAGE_SIZES[localPageConfig.size]?.height || 297 
                    : PAGE_SIZES[localPageConfig.size]?.width || 210
                  )}mm
                </Badge>
                <span className="text-muted-foreground">
                  边距: 上{localPageConfig.margins.top}mm 下{localPageConfig.margins.bottom}mm 
                  左{localPageConfig.margins.left}mm 右{localPageConfig.margins.right}mm
                </span>
              </div>
            </div>
          )}
          
          <div className="p-4 inline-block min-w-full">
            {selectedTemplate ? (
              (() => {
                // 使用本地页面配置
                const pageConfig = localPageConfig;
                const pageSize = PAGE_SIZES[pageConfig.size] || PAGE_SIZES.A4;
                const actualWidth = pageConfig.orientation === 'portrait' ? pageSize.width : pageSize.height;
                const actualHeight = pageConfig.orientation === 'portrait' ? pageSize.height : pageSize.width;
                const padding = `${pageConfig.margins.top}mm ${pageConfig.margins.right}mm ${pageConfig.margins.bottom}mm ${pageConfig.margins.left}mm`;
                
                // 如果没有选中数据，显示空状态
                if (selectedRecords.length === 0) {
                  return (
                    <div className="flex justify-start">
                      <div
                        className="bg-white shadow-lg print:shadow-none print-area-page flex items-center justify-center mx-auto"
                        style={{
                          width: `${actualWidth}mm`,
                          minHeight: `${actualHeight}mm`,
                          height: 'auto',
                          padding,
                          boxSizing: 'border-box',
                        }}
                      >
                        <div className="text-center text-gray-400">
                          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg">请从右侧选择数据</p>
                          <p className="text-sm mt-2">点击右侧数据卡片添加到预览</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                const components = selectedTemplate?.data?.components || [];

                // 渲染单个数据页面的函数
                const renderDataPage = (record: SelectedRecord, pageIndex: number, isLast: boolean) => {
                  return (
                    <div
                      key={record.id}
                      className="bg-white shadow-lg print:shadow-none print-area-page"
                      style={{
                        width: `${actualWidth}mm`,
                        minHeight: layoutMode === 'label' ? 'auto' : `${actualHeight}mm`,
                        height: 'auto',
                        padding,
                        boxSizing: 'border-box',
                        position: 'relative',
                        marginBottom: layoutMode === 'default' && !isLast ? '20px' : '0',
                        pageBreakAfter: layoutMode === 'default' && !isLast ? 'always' : 'auto',
                      }}
                    >
                      {/* 页码标记 */}
                      <div className="absolute top-2 right-2 text-xs text-gray-300 print:hidden">
                        #{pageIndex + 1}
                      </div>
                      {/* 流式布局容器 - 与编辑器一致 */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignContent: 'flex-start',
                        gap: '12px',
                      }}>
                        {components.map((component: any) => 
                          renderComponent(component, record.data)
                        )}
                      </div>
                    </div>
                  );
                };

                // 根据排版方式渲染
                switch (layoutMode) {
                  case 'default':
                    // 默认：每条数据一页
                    return (
                      <div className="flex flex-col items-center gap-5">
                        {selectedRecords.map((record, idx) => 
                          renderDataPage(record, idx, idx === selectedRecords.length - 1)
                        )}
                      </div>
                    );
                    
                  case 'continuous':
                    // 连续：不间断排版，可能需要分页
                    return (
                      <div className="flex flex-col items-center">
                        <div
                          className="bg-white shadow-lg print:shadow-none print-area-page"
                          style={{
                            width: `${actualWidth}mm`,
                            height: 'auto',
                            padding,
                            boxSizing: 'border-box',
                          }}
                        >
                          {selectedRecords.map((record, idx) => (
                            <div 
                              key={record.id}
                              style={{
                                marginBottom: idx < selectedRecords.length - 1 ? '40px' : '0',
                                borderBottom: idx < selectedRecords.length - 1 ? '1px dashed #e5e7eb' : 'none',
                                paddingBottom: idx < selectedRecords.length - 1 ? '40px' : '0',
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignContent: 'flex-start',
                                gap: '12px',
                              }}>
                                {components.map((component: any) => 
                                  renderComponent(component, record.data)
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                    
                  case 'label':
                    // 标签：所有数据在一页，紧凑排列
                    return (
                      <div className="flex justify-start">
                        <div
                          className="bg-white shadow-lg print:shadow-none print-area-page mx-auto"
                          style={{
                            width: `${actualWidth}mm`,
                            minHeight: `${actualHeight}mm`,
                            padding,
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(90mm, 1fr))',
                            gap: '10mm',
                          }}>
                            {selectedRecords.map((record) => (
                              <div
                                key={record.id}
                                className="border border-gray-200 rounded p-3"
                                style={{
                                  breakInside: 'avoid',
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignContent: 'flex-start',
                                  gap: '8px',
                                }}>
                                  {components.map((component: any) => 
                                    renderComponent(component, record.data)
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                    
                  default:
                    return null;
                }
              })()
            ) : (
              <div className="flex justify-start">
                <div className="h-96 flex items-center justify-center text-gray-400 bg-white rounded-lg shadow-sm print-area-page mx-auto" style={{ width: '210mm' }}>
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">请从左侧选择一个模板</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 打印样式 - 只打印画布内容 */}
      <style jsx global>{`
        @media print {
          /* =========================================
             精确打印控制 - 只打印中间画布内容
             ========================================= */
          
          /* 1. 强制A4纸张 */
          @page {
            size: A4;
            margin: 0;
          }

          /* 2. 强制显示背景图形 */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 3. 重置页面 */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* 4. 隐藏左右侧边栏 */
          .print-wrapper > :not(.print-content-area) {
            display: none !important;
          }

          /* 5. 隐藏打印内容区域内的no-print元素 */
          .print-content-area .no-print {
            display: none !important;
          }

          /* 6. 打印内容区域占据整个页面 */
          .print-content-area {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* 7. 确保打印页面尺寸正确 */
          .print-content-area .print-area-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            page-break-after: always;
            box-shadow: none !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }

          .print-content-area .print-area-page:last-of-type {
            page-break-after: auto !important;
          }

          /* 8. 表格打印 */
          .print-content-area .print-area-page table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid;
          }

          .print-content-area .print-area-page th,
          .print-content-area .print-area-page td {
            border: 1px solid #000 !important;
            padding: 8px !important;
          }

          /* 9. 确保Flex布局 */
          .print-content-area .print-area-page [style*="display: flex"],
          .print-content-area .print-area-page [style*="flex-wrap"] {
            display: flex !important;
            flex-wrap: wrap !important;
          }

          /* 10. 隐藏打印装饰 */
          .print-content-area .print-area-page .print\\:hidden,
          .print-content-area .print-area-page .absolute {
            display: none !important;
          }
        }
      `}</style>
      
      {/* 页面设置对话框 */}
      <PageSettingsDialog
        open={isPageSettingsOpen}
        onOpenChange={setIsPageSettingsOpen}
        pageConfig={localPageConfig}
        onPageConfigChange={(config) => {
          setLocalPageConfig(config);
          console.log('[TemplatePreview] 页面配置已更新:', config);
        }}
      />
    </div>
  );
}

export default TemplatePreview;
