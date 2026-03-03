'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Printer, ChevronLeft, ChevronRight, Eye, RefreshCw, FileText, Pencil, Download, ScanSearch, X, Plus, LayoutGrid, List, Tag } from 'lucide-react';
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
import { feishuEnv } from '@/lib/feishu-env';
import { onSelectionChange } from '@/lib/feishu-env';

interface TemplatePreviewProps {
  baseId?: string;
  tableId?: string;
  onEditTemplate?: (template: Template) => void;
}

// 排版方式类型
type LayoutMode = 'default' | 'continuous' | 'label';

// 选中的数据记录类型
interface SelectedRecord {
  id: string;
  data: Record<string, any>;
  addedAt: number;
}

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
    return String(value);
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
    overflow: 'hidden',
    boxSizing: 'border-box',
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

        setRecords(formattedRecords);
        setCurrentIndex(0);
        
        // 追加到可用记录列表
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
  }, [setRecords, setCurrentIndex]);
  
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
  
  // 从选中列表移除记录
  const removeRecordFromSelection = useCallback((recordId: string) => {
    setSelectedRecords(prev => {
      const newList = prev.filter(r => r.id !== recordId);
      console.log('[TP] 从选中列表移除:', recordId, '剩余:', newList.length);
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
    
    // 详细的调试信息
    const components = template.data?.components || [];
    const dataStr = template.data ? JSON.stringify(template.data, null, 2).slice(0, 3000) : '(empty)';
    const componentsInfo = components.map((comp: any, idx: number) => 
      `[${idx}] type=${comp.type}, id=${comp.id}, content=${!!comp.content}, text=${!!comp.text}, textStyle=${!!comp.textStyle}, style=${!!comp.style}`
    ).join('\n');
    
    const debugText = `选中模板: ${template.name}\n` +
      `模板ID: ${template.id}\n` +
      `有数据: ${!!template.data}\n` +
      `数据类型: ${typeof template.data}\n` +
      `组件数量: ${components.length}\n` +
      `组件详情:\n${componentsInfo}\n\n` +
      `完整数据:\n${dataStr}`;
    setDebugInfo(debugText);
    
    console.log('[TemplatePreview] 选中模板详情:', {
      templateName: template.name,
      templateId: template.id,
      hasData: !!template.data,
      componentCount: components.length,
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
              min-height: 100%;
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
            min-height: 297mm;
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
            min-height: 297mm;
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
             打印专用样式修复
             ========================================= */
          @media print {
            /* 1. 强制显示背景图形 */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* 2. 重置页面边距 */
            @page {
              size: A4 portrait;
              margin: 0;
            }

            body {
              margin: 0;
              padding: 0;
              font-size: 12pt;
              color: #000;
              background: #fff;
            }

            /* 3. 打印页面容器 */
            .print-page {
              page-break-after: always;
              width: 210mm !important;
              min-height: 297mm !important;
              box-sizing: border-box !important;
              background: white !important;
              position: relative !important;
            }
            .print-page:last-child {
              page-break-after: auto;
            }

            /* 4. 【关键】修复表格样式 */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: avoid;
              table-layout: fixed !important;
            }

            th, td {
              border: 1px solid #000 !important;
              padding: 8px !important;
              word-wrap: break-word !important;
              white-space: pre-wrap !important;
              color: #000 !important;
              vertical-align: top !important;
            }

            /* 5. 修复 Flex 布局容器在打印时的表现 - 只针对直接子元素 */
            .print-page > div[style*="flex-wrap"] {
              display: flex !important;
              flex-wrap: wrap !important;
              align-content: flex-start !important;
              width: 100% !important;
              box-sizing: border-box !important;
            }

            /* 6. 组件宽度修复 - 只针对 Flex 容器的直接子元素 */
            .print-page > div[style*="flex-wrap"] > * {
              flex: 0 0 auto !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
            }

            /* 6.1 根据 layout.width 设置具体宽度 */
            .print-page > div[style*="flex-wrap"] > [style*="width:100%"],
            .print-page > div[style*="flex-wrap"] > [style*="width: 100%"] {
              flex: 0 0 100% !important;
              width: 100% !important;
            }
            .print-page > div[style*="flex-wrap"] > [style*="width:50%"],
            .print-page > div[style*="flex-wrap"] > [style*="width: 50%"] {
              flex: 0 0 50% !important;
              width: 50% !important;
            }
            .print-page > div[style*="flex-wrap"] > [style*="width:33%"],
            .print-page > div[style*="flex-wrap"] > [style*="width: 33%"] {
              flex: 0 0 33.333% !important;
              width: 33.333% !important;
            }
            .print-page > div[style*="flex-wrap"] > [style*="width:25%"],
            .print-page > div[style*="flex-wrap"] > [style*="width: 25%"] {
              flex: 0 0 25% !important;
              width: 25% !important;
            }

            /* 7. 确保文本正确换行 */
            .print-page * {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
            }
          }

          /* 屏幕预览样式 */
          body {
            margin: 0;
            padding: 20px;
            background: #f0f0f0;
            font-family: system-ui, -apple-system, sans-serif;
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
    <div className="h-full flex gap-3 p-3 overflow-hidden">
      {/* 左侧：模板列表 - 减小宽度 */}
      <Card className="w-64 flex-shrink-0 flex flex-col">
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
      <div className="flex-1 min-w-[500px] flex flex-col overflow-hidden">
        {/* 工具栏 */}
        <Card className="mb-4">
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
            <div className="mt-2 flex items-center gap-2">
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
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-auto">
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
          <div className="min-w-max p-4">
            {selectedTemplate ? (
              (() => {
                // 如果没有选中数据，显示空状态
                if (selectedRecords.length === 0) {
                  const pageConfig = selectedTemplate?.data?.pageConfig;
                  const padding = pageConfig?.margins
                    ? `${pageConfig.margins.top || 20}mm ${pageConfig.margins.right || 20}mm ${pageConfig.margins.bottom || 20}mm ${pageConfig.margins.left || 20}mm`
                    : '20mm';
                  return (
                    <div className="flex justify-center">
                      <div
                        className="bg-white shadow-lg print:shadow-none flex items-center justify-center"
                        style={{
                          width: '210mm',
                          minHeight: '297mm',
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
                const pageConfig = selectedTemplate?.data?.pageConfig;
                const padding = pageConfig?.margins
                  ? `${pageConfig.margins.top || 20}mm ${pageConfig.margins.right || 20}mm ${pageConfig.margins.bottom || 20}mm ${pageConfig.margins.left || 20}mm`
                  : '20mm';

                // 渲染单个数据页面的函数
                const renderDataPage = (record: SelectedRecord, pageIndex: number, isLast: boolean) => {
                  return (
                    <div
                      key={record.id}
                      className="bg-white shadow-lg print:shadow-none"
                      style={{
                        width: '210mm',
                        minHeight: layoutMode === 'label' ? 'auto' : '297mm',
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
                        minHeight: '100%',
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
                          className="bg-white shadow-lg print:shadow-none"
                          style={{
                            width: '210mm',
                            minHeight: '297mm',
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
                          className="bg-white shadow-lg print:shadow-none"
                          style={{
                            width: '210mm',
                            minHeight: '297mm',
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
                <div className="h-96 flex items-center justify-center text-gray-400 bg-white rounded-lg shadow-sm" style={{ width: '210mm' }}>
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
      <Card className="w-56 flex-shrink-0 flex flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>数据匹配</span>
            {selectedRecords.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedRecords.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-3 py-3 space-y-2">
              {selectedTemplate ? (
                availableRecords.length > 0 ? (
                  availableRecords.map((record, idx) => {
                    const isSelected = selectedRecords.some(r => r.id === record.id);
                    return (
                      <button
                        key={record.id || idx}
                        onClick={() => {
                          console.log('[TP] 点击卡片:', record.id, isSelected ? '取消选中' : '选中');
                          if (isSelected) {
                            removeRecordFromSelection(record.id);
                          } else {
                            addRecordToSelection(record);
                          }
                        }}
                        className={`block w-full text-left p-3 rounded-lg border text-xs transition-all box-border ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 shadow-sm' 
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-medium truncate flex-1 min-w-0 ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                            {record.编号 || record.id || `记录 ${idx + 1}`}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded flex-shrink-0">
                              已选
                            </span>
                          )}
                        </div>
                        {record.简述 && (
                          <p className={`truncate mt-1.5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                            {String(record.简述).slice(0, 35)}
                          </p>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm mb-2">暂无数据</p>
                    <p className="text-xs">在多维表格中选中行<br/>或点击"刷新数据"</p>
                  </div>
                )
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  选择模板后可添加数据
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          /* 1. 强制显示背景图形 */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 2. 隐藏非打印元素 */
          body * {
            visibility: hidden;
          }
          
          /* 3. 显示打印区域 */
          .bg-white,
          .bg-white * {
            visibility: visible;
          }
          
          /* 4. 打印区域定位 */
          .bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* 5. 修复表格打印样式 */
          .bg-white table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid;
          }

          .bg-white th,
          .bg-white td {
            border: 1px solid #000 !important;
            padding: 8px !important;
            word-wrap: break-word !important;
            white-space: pre-wrap !important;
          }

          /* 6. 修复 Flex 布局 */
          .bg-white > div > div[style*="flex-wrap"] {
            display: flex !important;
            flex-wrap: wrap !important;
          }

          /* 7. 确保文本换行 */
          .bg-white * {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }

          /* 8. 分页控制 */
          .bg-white > div {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default TemplatePreview;
