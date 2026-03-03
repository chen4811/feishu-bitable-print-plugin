'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Printer, ChevronLeft, ChevronRight, Eye, RefreshCw, FileText, Pencil, Download, ScanSearch, X, Plus, LayoutGrid, List, Tag, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { toast } from 'sonner';
import { useTemplateStore, type Template } from '@/store/templateStore';
import { useSelectedDataStore } from '@/store/selectedDataStore';
import { useEditorStore } from '@/store/editorStore';
import { PageSettingsDialog } from '@/components/editor/dialogs/PageSettingsDialog';
import { PAGE_SIZES, PageConfig } from '@/types/editor';
import { feishuEnv } from '@/lib/feishu-env';
import { onSelectionChange } from '@/lib/feishu-env';
import { formatProcessForTemplate, type ProcessInstance } from '@/lib/feishu-corehr';

interface TemplatePreviewProps {
  baseId?: string;
  tableId?: string;
  onEditTemplate?: (template: Template) => void;
}

// 排版方式类型
type LayoutMode = 'default' | 'continuous' | 'label';

// 数据源类型
type DataSourceType = 'bitable' | 'corehr';

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
    // 优先级：text (文本) > name (选项名) > value (数值/布尔) > enumValue (枚举值) > label (标签) > title (标题) > status (状态) > url (附件) > id
    if (cellData.text !== undefined && cellData.text !== '') return cellData.text;
    if (cellData.name !== undefined && cellData.name !== '') return cellData.name;
    if (cellData.title !== undefined && cellData.title !== '') return cellData.title;
    if (cellData.label !== undefined && cellData.label !== '') return cellData.label;
    if (cellData.status !== undefined && cellData.status !== '') return cellData.status;
    if (cellData.value !== undefined && cellData.value !== '') return String(cellData.value);
    if (cellData.enumValue !== undefined && cellData.enumValue !== '') return cellData.enumValue;
    if (cellData.url !== undefined) return cellData.url;
    if (cellData.id !== undefined) return String(cellData.id);
    
    // 如果都找不到，返回 JSON 字符串以便调试
    try {
      return JSON.stringify(cellData).slice(0, 25);
    } catch (e) {
      return '[对象]';
    }
  }

  // 4. 基础类型 (字符串、数字、布尔)，直接返回
  return String(cellData);
};

// 格式化字段值的通用函数
const formatFieldValue = (key: string, value: any): string => {
  // 调试日志：显示字段名和原始值
  if (key.includes('状态') || key.includes('当前')) {
    console.log(`[formatFieldValue] 字段: ${key}, 原始值:`, value, '类型:', typeof value, '是否数组:', Array.isArray(value));
  }
  
  // 处理日期相关字段
  if (key.includes('日期') || key.includes('date') || key.includes('Date') || key.includes('time') || key.includes('Time')) {
    return formatTimestamp(value);
  }
  
  // 处理所有其他字段（包括状态/流程、单选、多选等）
  // 使用统一的 extractFeishuCellValue 函数处理所有字段类型
  const extractedValue = extractFeishuCellValue(value);
  
  // 对空值做特殊处理
  if (extractedValue === null || extractedValue === undefined || extractedValue === '') {
    // 状态/流程字段显示"未设置"，其他显示"-"
    if (key.includes('状态') || key.includes('status') || key.includes('Status') || key.includes('流程') || key.includes('workflow') || key.includes('Workflow')) {
      if (key.includes('状态') || key.includes('当前')) {
        console.log(`[formatFieldValue] ${key} 为空，返回"未设置"`);
      }
      return '未设置';
    }
    return '-';
  }
  
  return extractedValue;
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

// 替换文本中的变量为实际值 - 支持 [字段名] 和 {{字段名}} 两种格式
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

  const { type, text, content, style = {} } = component;
  
  const processedText = text ? replaceVariables(text, data) : '';
  const processedContent = content ? replaceVariables(content, data) : '';
  
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
                      const processedContent = replaceVariables(content, data);
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
  
  // 数据源选择状态
  const [dataSource, setDataSource] = useState<DataSourceType>('bitable');
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [processInstances, setProcessInstances] = useState<ProcessInstance[]>([]);
  
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

  // 初始化：设置飞书环境状态并初始化 SDK，添加选中变化监听器
  useEffect(() => {
    const init = async () => {
      await feishuEnv.init();
      const isReady = feishuEnv.isFeishuEnvironment();
      setIsFromFeishu(isReady);
      
      if (isReady) {
        fetchSelectedRecordsFromEnv();
        
        // 注册选中变化监听器
        const unsubscribe = onSelectionChange((event) => {
          if (event?.data?.recordId) {
            console.log('[TP] 飞书选中变化:', event.data.recordId);
            setTimeout(() => fetchSelectedRecordsFromEnv(), 100);
          }
        });
        
        return () => unsubscribe();
      }
    };
    
    init();
  }, [setIsFromFeishu]);

  // 从 feishu-env 获取选中记录
  const fetchSelectedRecordsFromEnv = useCallback(async () => {
    try {
      const selRecords = await feishuEnv.getSelectedRecords();
      
      if (selRecords.length > 0) {
        // 转换格式 - 确保每条记录都有唯一 ID
        const formattedRecords = selRecords.map((record, index) => {
          // 生成唯一 ID：优先使用 record.id，其次是 recordId，最后使用索引
          const uniqueId = record.id || (record as any).recordId || `record_${Date.now()}_${index}`;
          return {
            ...record.fields,
            id: uniqueId,
            _rowIndex: index,
          };
        });
        
        // 只追加到可用记录列表，不自动设置为当前记录
        setAvailableRecords(prev => {
          const newRecords = [...prev];
          let addedCount = 0;
          formattedRecords.forEach(record => {
            if (!newRecords.some(r => r.id === record.id)) {
              newRecords.push(record);
              addedCount++;
            }
          });
          if (addedCount > 0) {
            console.log('[TP] 新增记录:', addedCount, '总记录:', newRecords.length);
          }
          return newRecords;
        });
      }
    } catch (err) {
      console.error('[TP] 获取记录失败:', err);
    }
  }, []);
  
  // 添加记录到选中列表（防重复）
  const addRecordToSelection = useCallback((record: Record<string, any>) => {
    setSelectedRecords(prev => {
      if (prev.some(r => r.id === record.id)) {
        console.log('[TP] 记录已在选中列表:', record.id);
        return prev;
      }
      const newList = [...prev, { id: record.id, data: record, addedAt: Date.now() }];
      console.log('[TP] 已添加到选中列表:', record.id, '总数:', newList.length);
      return newList;
    });
  }, []);
  
  // 从选中列表和可用列表移除记录
  const removeRecordFromSelection = useCallback((recordId: string) => {
    setSelectedRecords(prev => {
      const newList = prev.filter(r => r.id !== recordId);
      console.log('[TP] 从选中列表移除:', recordId, '剩余:', newList.length);
      return newList;
    });
    setAvailableRecords(prev => {
      const newList = prev.filter(r => r.id !== recordId);
      console.log('[TP] 从可用列表移除:', recordId, '剩余:', newList.length);
      return newList;
    });
  }, []);
  
  // 清空选中列表
  const clearSelectedRecords = useCallback(() => {
    setSelectedRecords([]);
    toast.success('已清空列表');
  }, []);

  // 处理模板选择
  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    // 清空之前选中的数据
    setSelectedRecords([]);
    
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
      // getCheckboxSelectedRecords 会自动处理：
      // 1. 尝试使用 table.getSelectedRecordIds() 获取选中行
      // 2. 如果不可用，降级到获取第一条记录
      const records = await feishuEnv.getCheckboxSelectedRecords();
      
      if (records.length > 0) {
        // 转换格式
        const formattedRecords = records.map((record, index) => ({
          ...record.fields,
          id: record.id,
          _rowIndex: index,
        }));

        setRecords(formattedRecords);
        setCurrentIndex(0);
        // 更新可用记录列表
        setAvailableRecords(formattedRecords);
        toast.success(`已加载 ${formattedRecords.length} 条记录`);
        
        if (showDebugInfo) {
          setDebugInfo(`刷新数据成功:\n${JSON.stringify(records.map(r => ({ id: r.id, fields: r.fields })), null, 2)}`);
        }
      } else {
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
  const handleScanCheckbox = useCallback(async () => {
    toast.info('Checkbox 扫描功能已移除，请使用"刷新数据"获取选中记录');
  }, []);

  // 从飞书 CoreHR 查询流程实例
  const handleFetchProcesses = useCallback(async () => {
    setIsLoadingProcesses(true);
    
    try {
      console.log('[TP] 从 CoreHR 查询流程实例...');
      
      const response = await fetch('/api/feishu/corehr/processes?mode=recent&limit=50&days=30');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '查询流程实例失败');
      }
      
      const processes = result.data as ProcessInstance[];
      console.log('[TP] 获取到流程实例:', processes.length, '条');
      
      // 格式化流程实例数据
      const formattedRecords = processes.map((process, index) => ({
        ...formatProcessForTemplate(process),
        id: process.process_id,
        _processId: process.process_id,
        _rowIndex: index,
      }));
      
      setProcessInstances(processes);
      setAvailableRecords(formattedRecords);
      toast.success(`已加载 ${formattedRecords.length} 条流程数据`);
      
    } catch (err) {
      console.error('[TP] 查询流程实例失败:', err);
      toast.error(err instanceof Error ? err.message : '查询流程数据失败');
    } finally {
      setIsLoadingProcesses(false);
    }
  }, []);

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

  return (
    <div className="print-wrapper h-full flex gap-3 p-3 overflow-hidden">
      {/* 左侧：模板列表 - 减小宽度 */}
      <Card className="sidebar-left no-print w-64 flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            模板列表 ({templates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-4 pt-0">
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
        </CardContent>
      </Card>

      {/* 中间：打印预览 - 确保最小宽度 */}
      <div className="print-content-area flex-1 min-w-[500px] flex flex-col overflow-hidden">
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
                {isFeishuEnvironment && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshData}
                          disabled={isLoading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                          刷新数据
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>从飞书表格获取最新数据</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                {showDebugInfo ? '隐藏调试' : '显示调试'}
              </Button>
            </div>

            {/* 调试信息 */}
            {showDebugInfo && debugInfo && (
              <div className="no-print mt-2 p-3 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">调试信息:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setDebugInfo('')}
                  >
                    清除
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap">{debugInfo}</pre>
              </div>
            )}
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
          
          <div className="min-w-max p-4">
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
                    <div className="flex justify-center">
                      <div
                        className="bg-white shadow-lg print:shadow-none print-area-page flex items-center justify-center"
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
                      <div className="flex justify-center">
                        <div
                          className="bg-white shadow-lg print:shadow-none print-area-page"
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
              <div className="flex justify-center">
                <div className="h-96 flex items-center justify-center text-gray-400 bg-white rounded-lg shadow-sm print-area-page" style={{ width: '210mm' }}>
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

      {/* 右侧：数据匹配 - 简化为点击选中模式 */}
      <Card className="sidebar-right no-print w-56 flex-shrink-0 flex flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>数据匹配</span>
            {selectedRecords.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedRecords.length}
              </Badge>
            )}
          </CardTitle>
          
          {/* 数据源选择 */}
          <div className="mt-3">
            <Label className="text-xs text-gray-500 mb-2 block">数据源</Label>
            <ToggleGroup 
              type="single" 
              value={dataSource}
              onValueChange={(v) => {
                if (v) {
                  setDataSource(v as DataSourceType);
                  // 切换数据源时清空记录
                  setAvailableRecords([]);
                  setSelectedRecords([]);
                }
              }}
              className="border rounded-lg p-1 w-full"
            >
              <ToggleGroupItem value="bitable" aria-label="多维表格" className="text-xs px-2 flex-1">
                多维表格
              </ToggleGroupItem>
              <ToggleGroupItem value="corehr" aria-label="审批流程" className="text-xs px-2 flex-1">
                审批流程
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          {/* 数据源刷新按钮 */}
          <div className="mt-3 flex gap-2">
            {dataSource === 'bitable' && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={handleRefreshData}
                disabled={isLoading || !isFeishuEnvironment}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                刷新数据
              </Button>
            )}
            {dataSource === 'corehr' && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={handleFetchProcesses}
                disabled={isLoadingProcesses}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingProcesses ? 'animate-spin' : ''}`} />
                查询流程
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-3 py-3 space-y-2">
              {/* 空状态提示 - 根据数据源显示不同提示 */}
              {selectedTemplate && availableRecords.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm mb-2">暂无数据</p>
                  <p className="text-xs">
                    {dataSource === 'bitable' 
                      ? '在多维表格中选中行\n或点击"刷新数据"'
                      : '点击"查询流程"获取审批数据'
                    }
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
                              {/* 流程数据显示流程名称，多维表格显示编号或ID */}
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
                              .filter(([key]) => key !== 'id' && key !== '_rowIndex')
                              .slice(0, 4)
                              .map(([key, value]) => (
                                <div key={key} className="flex gap-1">
                                  <span className="text-gray-400 shrink-0">{key}:</span>
                                  <span className={`truncate flex-1 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                                    {formatFieldValue(key, value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </button>
                      </div>
                    );
                  })
                ) : null
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  选择模板后可添加数据
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

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
