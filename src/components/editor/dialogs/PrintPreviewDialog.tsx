'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES, CanvasComponentNode, Field } from '@/types/editor';
import { 
  Printer, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  CheckSquare,
  Square,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Database,
  Layout,
  RefreshCw,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { VariableTextRenderer } from '@/components/VariableTextRenderer';

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 数据源类型
interface DataSource {
  id: string;
  name: string;
  type: 'template' | 'table';
  fields: Field[];
  records: Record<string, unknown>[];
}

// 统一的组件渲染器，与 CanvasComponent 保持一致
const PrintComponentRenderer = ({ 
  component, 
  record, 
  fields, 
  styleConfig,
  isEmptyPreview = false,
}: { 
  component: CanvasComponentNode;
  record: Record<string, unknown>;
  fields: Field[];
  styleConfig: any;
  isEmptyPreview?: boolean;
}) => {
  // 变量解析函数
  const resolveVariables = (text: string) => {
    if (!text) return '';
    // 空预览模式下，保留变量占位符格式
    if (isEmptyPreview) {
      return text.replace(/\[([^\]]+)\]/g, (match, varName) => {
        const hasValue = record[varName] !== undefined && record[varName] !== '';
        if (hasValue) {
          return String(record[varName]);
        }
        // 空预览模式下显示占位符
        return match;
      });
    }
    return text.replace(/\[([^\]]+)\]/g, (match, varName) => {
      return String(record[varName] || match);
    });
  };

  switch (component.type) {
    case 'text': {
      const textComp = component as any;
      const textStyle = textComp.textStyle || {};
      const content = textComp.content || textComp.text || '';
      const displayContent = resolveVariables(content);

      // 基础文本样式
      const baseStyles: React.CSSProperties = {
        fontFamily: styleConfig.fontFamily,
        fontSize: `${textStyle.fontSize || styleConfig.fontSize}px`,
        lineHeight: textStyle.lineHeight || styleConfig.lineHeight,
        color: textStyle.color || '#000000',
        textAlign: (textStyle.align as any) || 'left',
        fontWeight: textStyle.bold ? 'bold' : 'normal',
        fontStyle: textStyle.italic ? 'italic' : 'normal',
        textDecoration: textStyle.underline ? 'underline' : textStyle.lineThrough ? 'line-through' : 'none',
        minHeight: '1em',
        display: 'block',
        width: '100%',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',      // ✅ 更激进的换行策略
        maxWidth: '100%',              // ✅ 确保不超过父容器
      };

      // 标题样式
      if (textStyle.headingLevel) {
        const headingSizes: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 12 };
        const headingStyle = {
          ...baseStyles,
          fontSize: `${headingSizes[textStyle.headingLevel] || 18}px`,
          fontWeight: 'bold',
          marginBottom: '0.5em',
          marginTop: '0.5em',
        };
        
        const Tag = `h${textStyle.headingLevel}` as React.ElementType;
        return (
          <Tag style={headingStyle}>
            <VariableTextRenderer
              text={displayContent || '文本组件'}
              records={record ? [record] : []}
              fields={fields || []}
              tagName="span"
              textStyle={textStyle}
            />
          </Tag>
        );
      }

      // 列表样式
      if (textStyle.listType === 'unordered') {
        return (
          <ul style={{ ...baseStyles, marginLeft: '1.5rem', listStyleType: 'disc' }}>
            <li>
              <VariableTextRenderer
                text={displayContent || '文本组件'}
                records={record ? [record] : []}
                fields={fields || []}
                tagName="span"
                textStyle={textStyle}
              />
            </li>
          </ul>
        );
      }

      if (textStyle.listType === 'ordered') {
        return (
          <ol style={{ ...baseStyles, marginLeft: '1.5rem', listStyleType: 'decimal' }}>
            <li>
              <VariableTextRenderer
                text={displayContent || '文本组件'}
                records={record ? [record] : []}
                fields={fields || []}
                tagName="span"
                textStyle={textStyle}
              />
            </li>
          </ol>
        );
      }

      // 普通文本
      return (
        <div style={baseStyles}>
          <VariableTextRenderer
            text={displayContent || '文本组件'}
            records={record ? [record] : []}
            fields={fields || []}
            tagName="span"
            textStyle={textStyle}
          />
        </div>
      );
    }

    case 'heading': {
      const headingComp = component as any;
      const level = headingComp.level || 1;
      const headingSizes: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 12 };
      const textStyle = headingComp.textStyle || {};
      const content = headingComp.content || '';
      const displayContent = resolveVariables(content);

      const style: React.CSSProperties = {
        fontFamily: styleConfig.fontFamily,
        fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : `${headingSizes[level]}px`,
        fontWeight: textStyle.bold !== false ? 'bold' : 'normal',
        color: textStyle.color || '#000000',
        textAlign: (textStyle.align as any) || 'center',
        lineHeight: textStyle.lineHeight || 1.5,
        margin: '0 0 16px 0',
        padding: '8px 0',
        minHeight: '1em',
        width: '100%',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      };

      const Tag = `h${level}` as React.ElementType;
      return (
        <Tag style={style}>
          <VariableTextRenderer
            text={displayContent || '标题组件'}
            records={record ? [record] : []}
            fields={fields || []}
            tagName="span"
            textStyle={textStyle}
          />
        </Tag>
      );
    }

    case 'paragraph': {
      const paraComp = component as any;
      const textStyle = paraComp.textStyle || {};
      const content = paraComp.content || '';
      const displayContent = resolveVariables(content);
      const lines = displayContent.split('\n');

      const style: React.CSSProperties = {
        fontFamily: styleConfig.fontFamily,
        fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : `${styleConfig.fontSize}px`,
        fontWeight: textStyle.bold ? 'bold' : 'normal',
        color: textStyle.color || '#000000',
        textAlign: (textStyle.align as any) || 'justify',
        lineHeight: textStyle.lineHeight || 1.8,
        textIndent: `${(paraComp.indent || 2) * 2}em`,
        margin: '0 0 12px 0',
        padding: '4px 0',
        minHeight: '1em',
        width: '100%',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      };

      return (
        <p style={style}>
          {lines.length > 0 ? lines.map((line, index) => (
            <React.Fragment key={index}>
              <VariableTextRenderer
                text={line}
                records={record ? [record] : []}
                fields={fields || []}
                tagName="span"
                textStyle={textStyle}
              />
              {index < lines.length - 1 && <br />}
            </React.Fragment>
          )) : '段落组件'}
        </p>
      );
    }

    case 'list': {
      const listComp = component as any;
      const textStyle = listComp.textStyle || {};
      const items = listComp.items || [];
      const ListTag = listComp.listType === 'ordered' ? 'ol' : 'ul';

      const style: React.CSSProperties = {
        fontFamily: styleConfig.fontFamily,
        fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : `${styleConfig.fontSize}px`,
        fontWeight: textStyle.bold ? 'bold' : 'normal',
        color: textStyle.color || '#000000',
        lineHeight: textStyle.lineHeight || 1.8,
        margin: '0 0 12px 0',
        paddingLeft: '2em',
        minHeight: '1em',
        width: '100%',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      };

      return (
        <ListTag style={style}>
          {items.length > 0 ? items.map((item: string, index: number) => (
            <li key={index} style={{ marginBottom: '4px' }}>
              <VariableTextRenderer
                text={resolveVariables(item)}
                records={record ? [record] : []}
                fields={fields || []}
                tagName="span"
                textStyle={textStyle}
              />
            </li>
          )) : <li>列表组件</li>}
        </ListTag>
      );
    }

    case 'table': {
      const tableComp = component as any;
      const tableConfig = tableComp.tableConfig;
      
      if (!tableConfig?.cells || tableConfig.cells.length === 0) {
        return (
          <div className="w-full border border-gray-300 bg-gray-50 p-4 text-center text-gray-500">
            空表格
          </div>
        );
      }
      
      const colWidths = tableConfig.colWidths || [];
      
      return (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontFamily: styleConfig.fontFamily,
          fontSize: `${styleConfig.fontSize}px`,
        }}>
          <tbody>
            {tableConfig.cells.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex}>
                {row.map((cell: any, colIndex: number) => {
                  if (cell.rowSpan === 0 || cell.colSpan === 0) {
                    return null;
                  }
                  
                  const colWidth = colWidths[colIndex];
                  
                  return (
                    <td
                      key={colIndex}
                      rowSpan={cell.rowSpan || 1}
                      colSpan={cell.colSpan || 1}
                      style={{
                        border: '1px solid #000',
                        padding: '8px',
                        textAlign: cell.align || 'left',
                        verticalAlign: cell.verticalAlign || 'top',
                        fontWeight: cell.bold ? 'bold' : 'normal',
                        fontStyle: cell.italic ? 'italic' : 'normal',
                        textDecoration: cell.underline ? 'underline' : 'none',
                        backgroundColor: cell.backgroundColor || 'transparent',
                        color: cell.color || '#000000',
                        fontSize: cell.fontSize ? `${cell.fontSize}px` : undefined,
                        width: colWidth ? `${colWidth}px` : undefined,
                        minWidth: colWidth ? `${colWidth}px` : undefined,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {resolveVariables(cell.content || '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    case 'line': {
      const lineComp = component as any;
      return (
        <hr
          style={{
            border: 'none',
            height: `${lineComp.thickness || 1}px`,
            backgroundColor: lineComp.color || '#000000',
            margin: '16px 0',
          }}
        />
      );
    }

    case 'qrcode':
      return (
        <div className="flex items-center justify-center">
          <div className="w-24 h-24 bg-gray-100 border border-gray-300" />
        </div>
      );

    case 'barcode':
      return (
        <div className="flex items-center justify-center">
          <div className="w-32 h-12 bg-gray-100 border border-gray-300" />
        </div>
      );

    case 'image': {
      const imageComp = component as any;
      return (
        <div className="flex items-center justify-center">
          {imageComp.src ? (
            <img
              src={imageComp.src}
              alt={imageComp.alt || ''}
              className="max-w-full max-h-48 object-contain"
            />
          ) : (
            <div className="w-full h-32 bg-gray-100 border border-gray-300 flex items-center justify-center">
              <span className="text-gray-400">图片</span>
            </div>
          )}
        </div>
      );
    }

    default:
      return (
        <div className="text-gray-500 p-4">
          未知组件类型: {(component as any).type || 'unknown'}
        </div>
      );
  }
};

export function PrintPreviewDialog({ open, onOpenChange }: PrintPreviewDialogProps) {
  const {
    components,
    pageConfig,
    styleConfig,
    templateName,
    fields,
    records,
    selectedRecordIds,
    toggleRecordSelection,
    selectAllRecords,
    clearRecordSelection,
    setRecords,
    setFields,
  } = useEditorStore();
  
  const [previewMode, setPreviewMode] = useState<'default' | 'continuous' | 'label'>('default');
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [dataSourceMode, setDataSourceMode] = useState<'template' | 'data'>('template');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // 计算画布尺寸
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size];
  const isLandscape = pageConfig.orientation === 'landscape';
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;

  // 缩放控制
  const handleZoomIn = () => {
    setScale(prev => Math.min(2, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  // 获取预览记录
  const getPreviewRecords = useCallback(() => {
    // 模板预览模式：返回空记录，让组件显示占位符
    if (dataSourceMode === 'template') {
      return [{ id: 'template-preview', __mode__: 'template' }];
    }
    
    // 数据预览模式：使用实际记录
    if (selectedRecordIds.length > 0) {
      return records.filter(r => selectedRecordIds.includes(r.id as string));
    }
    
    if (records.length > 0) {
      return records;
    }
    
    // 没有数据时返回空记录
    return [{ id: 'empty', __mode__: 'empty' }];
  }, [dataSourceMode, records, selectedRecordIds]);

  const previewRecords = getPreviewRecords();
  const isEmptyPreview = dataSourceMode === 'template' || (dataSourceMode === 'data' && records.length === 0);

  // 计算内容区域宽度（考虑页边距）- 与 CanvasArea 保持一致
  const contentWidth = canvasWidth - (pageConfig.margins.left + pageConfig.margins.right) * mmToPx;

  // 获取组件宽度样式 - 与 CanvasArea 保持一致
  const getComponentWidthStyle = useCallback((width: string) => {
    const gap = 12; // gap-3 = 12px
    switch (width) {
      case '50%': 
        return { 
          width: `calc((100% - ${gap}px) / 2)`,
          flexShrink: 0,
          boxSizing: 'border-box' as const,
        };
      case '33%': 
        return { 
          width: `calc((100% - ${2 * gap}px) / 3)`,
          flexShrink: 0,
          boxSizing: 'border-box' as const,
        };
      case '25%': 
        return { 
          width: `calc((100% - ${3 * gap}px) / 4)`,
          flexShrink: 0,
          boxSizing: 'border-box' as const,
        };
      default: 
        return { 
          width: '100%',
          flexShrink: 0,
          boxSizing: 'border-box' as const,
        };
    }
  }, []);

  // 渲染单页内容（流式布局）
  const renderPageContent = useCallback((record: Record<string, unknown>) => {
    // 空状态：没有组件时显示提示
    if (components.length === 0) {
      return (
        <div 
          className="flex flex-col items-center justify-center h-full text-muted-foreground"
          style={{ width: `${contentWidth}px`, minHeight: '200px' }}
        >
          <Layout className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">模板为空</p>
          <p className="text-sm mt-1">请先添加组件到画布</p>
        </div>
      );
    }

    return (
      <div 
        className="flex flex-wrap content-start gap-3"
        style={{ width: `${contentWidth}px` }}
      >
        {components.map((component) => {
          const layoutWidth = component.layout?.width || '100%';
          
          return (
            <div
              key={component.id}
              className="w-full"
              style={{
                ...getComponentWidthStyle(layoutWidth),
                boxSizing: 'border-box',
              }}
            >
              <PrintComponentRenderer
                component={component}
                record={record}
                fields={fields}
                styleConfig={styleConfig}
                isEmptyPreview={isEmptyPreview}
              />
            </div>
          );
        })}
      </div>
    );
  }, [components, fields, styleConfig, contentWidth, getComponentWidthStyle, isEmptyPreview]);

  // 加载飞书数据
  const loadFeishuData = useCallback(async () => {
    setIsLoadingData(true);
    setPrintError(null);
    
    try {
      // 动态导入 feishu-env
      const { fetchFields, fetchRecords } = await import('@/lib/feishu-env');
      
      // 获取字段
      const feishuFields = await fetchFields();
      const appFields = feishuFields.map((field: any) => {
        // 判断字段种类
        let fieldKind: Field['fieldKind'] = 'other';
        const fieldType = String(field.type);
        
        if (fieldType === '17' || fieldType === 'attachment') {
          fieldKind = 'attachment';
        } else if (fieldType === '11' || fieldType === 'user' || fieldType === 'person') {
          fieldKind = 'person';
        } else if (fieldType === '1' || fieldType === 'text') {
          fieldKind = 'text';
        } else if (fieldType === '2' || fieldType === 'number') {
          fieldKind = 'number';
        } else if (fieldType === '5' || fieldType === 'date') {
          fieldKind = 'date';
        }
        
        return {
          id: field.id,
          name: field.name,
          type: field.type,
          placeholder: `[${field.name}]`,
          isSystem: false,
          fieldKind, // 【关键】在获取时就确定字段种类
        };
      });
      setFields(appFields);
      
      // 获取记录
      const feishuRecords = await fetchRecords();
      const appRecords = feishuRecords.map((record: any) => ({
        id: record.id,
        ...record.fields,
      }));
      setRecords(appRecords as Record<string, unknown>[]);
      
      // 切换到数据模式
      setDataSourceMode('data');
      
      // 重置页码
      setCurrentPage(0);
    } catch (error) {
      console.error('加载飞书数据失败:', error);
      setPrintError('加载数据失败，请确保在飞书环境中并选择了表格');
    } finally {
      setIsLoadingData(false);
    }
  }, [setFields, setRecords]);

  // 导出为 PDF
  const handleExportPDF = useCallback(async () => {
    if (!previewRef.current) return;
    
    setIsExporting(true);
    setPrintError(null);
    
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: pageConfig.size,
      });
      
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${templateName || '打印预览'}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      setPrintError('PDF导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [previewRef, isLandscape, pageConfig.size, templateName]);

  // 全选/取消全选
  const allSelected = records.length > 0 && selectedRecordIds.length === records.length;
  const handleToggleSelectAll = () => {
    if (allSelected) {
      clearRecordSelection();
    } else {
      selectAllRecords();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* 头部工具栏 */}
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle>打印预览</DialogTitle>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? '导出中...' : '导出 PDF'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 主体内容 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧：数据源选择和记录选择 */}
          <div className="w-72 border-r flex flex-col">
            {/* 数据源选择 */}
            <div className="p-4 border-b bg-muted/30">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                数据源
              </h3>
              <Tabs 
                value={dataSourceMode} 
                onValueChange={(v) => setDataSourceMode(v as 'template' | 'data')}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="template" className="text-xs">
                    <Layout className="w-3 h-3 mr-1" />
                    点选模板
                  </TabsTrigger>
                  <TabsTrigger value="data" className="text-xs">
                    <Database className="w-3 h-3 mr-1" />
                    点选数据
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {dataSourceMode === 'data' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={loadFeishuData}
                  disabled={isLoadingData}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingData ? 'animate-spin' : ''}`} />
                  {isLoadingData ? '加载中...' : '加载表格数据'}
                </Button>
              )}
              
              {dataSourceMode === 'template' && (
                <p className="text-xs text-muted-foreground mt-2">
                  预览模板结构，变量将显示为占位符
                </p>
              )}
            </div>

            {/* 记录选择（仅在数据模式下显示） */}
            {dataSourceMode === 'data' && records.length > 0 && (
              <>
                <div className="p-3 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={handleToggleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      全选 ({records.length})
                    </label>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    已选 {selectedRecordIds.length} 条
                  </Badge>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {records.map((record) => (
                      <div
                        key={record.id as string}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => toggleRecordSelection(record.id as string)}
                      >
                        <Checkbox
                          checked={selectedRecordIds.includes(record.id as string)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {String(record['__tableName__'] || record.id)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
            
            {dataSourceMode === 'data' && records.length === 0 && !isLoadingData && (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <Database className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  暂无数据
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  点击上方按钮加载表格数据
                </p>
              </div>
            )}
            
            {dataSourceMode === 'template' && (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <Layout className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  模板预览模式
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  显示模板结构和变量占位符
                </p>
              </div>
            )}
          </div>

          {/* 中间：预览区域 */}
          <div className="flex-1 flex flex-col bg-gray-100" style={{ overflow: 'visible' }}>
            {/* 预览模式切换 */}
            <div className="p-4 border-b bg-background flex items-center justify-between">
              <Tabs value={previewMode} onValueChange={(v: any) => setPreviewMode(v)}>
                <TabsList>
                  <TabsTrigger value="default">单页模式</TabsTrigger>
                  <TabsTrigger value="continuous">连续模式</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* 模式指示器 */}
              <Badge variant={dataSourceMode === 'template' ? 'secondary' : 'default'} className="text-xs">
                {dataSourceMode === 'template' ? '模板预览' : '数据预览'}
              </Badge>
            </div>

            {/* 缩放控制栏 - 跟模板编辑一样，位于画布上方 */}
            <div className="flex items-center justify-center p-4 border-b bg-background">
              <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  className="h-8 w-8"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={scale >= 2}
                  className="h-8 w-8"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleResetZoom}
                  className="h-8 w-8"
                  title="重置缩放"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 预览内容 */}
            <ScrollArea className="flex-1">
              <div 
                className="p-8 flex flex-col items-center gap-8"
                style={{ minWidth: 'fit-content' }}
              >
                {printError && (
                  <Alert variant="destructive" className="max-w-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{printError}</AlertDescription>
                  </Alert>
                )}

                {previewMode === 'continuous' ? (
                  // 连续模式
                  previewRecords.map((record, index) => (
                    <div
                      key={record.id as string}
                      ref={index === 0 ? previewRef : null}
                      className="bg-white shadow-lg relative"
                      style={{
                        width: `${canvasWidth * scale}px`,
                        minHeight: `${canvasHeight * scale}px`,
                        padding: `${pageConfig.margins.top * mmToPx * scale}px ${pageConfig.margins.right * mmToPx * scale}px ${pageConfig.margins.bottom * mmToPx * scale}px ${pageConfig.margins.left * mmToPx * scale}px`,
                        fontFamily: styleConfig.fontFamily,
                        marginBottom: '20px',
                      }}
                    >
                      <div className="absolute -top-6 left-0 text-sm text-muted-foreground">
                        第 {index + 1} 页
                      </div>
                      {renderPageContent(record)}
                    </div>
                  ))
                ) : (
                  // 单页模式
                  <>
                    {previewRecords.length > 1 && (
                      <div className="flex items-center gap-4 mb-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">
                          {currentPage + 1} / {previewRecords.length}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(Math.min(previewRecords.length - 1, currentPage + 1))}
                          disabled={currentPage === previewRecords.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    <div
                      ref={previewRef}
                      className="bg-white shadow-lg"
                      style={{
                        width: `${canvasWidth * scale}px`,
                        minHeight: `${canvasHeight * scale}px`,
                        padding: `${pageConfig.margins.top * mmToPx * scale}px ${pageConfig.margins.right * mmToPx * scale}px ${pageConfig.margins.bottom * mmToPx * scale}px ${pageConfig.margins.left * mmToPx * scale}px`,
                        fontFamily: styleConfig.fontFamily,
                      }}
                    >
                      {renderPageContent(previewRecords[currentPage])}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
