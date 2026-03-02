'use client';

import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  Table as TableIcon, 
  QrCode, 
  Barcode, 
  Box, 
  Variable,
  Ruler,
  Layers
} from 'lucide-react';

// 组件类型图标映射
const componentTypeIcons: Record<string, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  table: <TableIcon className="h-4 w-4" />,
  qrcode: <QrCode className="h-4 w-4" />,
  barcode: <Barcode className="h-4 w-4" />,
  container: <Box className="h-4 w-4" />,
};

const componentTypeLabels: Record<string, string> = {
  text: '文本',
  table: '表格',
  qrcode: '二维码',
  barcode: '条形码',
  container: '容器',
};

// 检测模板中的变量 - 支持 [字段名] 和 {{字段名}} 两种格式
const extractVariables = (components: any[]): string[] => {
  const variables: string[] = [];
  const variableRegex = /\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g;

  const traverse = (comp: any) => {
    if (!comp) return;

    const extractFromText = (text: string) => {
      if (!text) return;
      let match;
      variableRegex.lastIndex = 0;
      while ((match = variableRegex.exec(text)) !== null) {
        const varName = (match[1] || match[3])?.trim();
        if (varName && !variables.includes(varName)) {
          variables.push(varName);
        }
      }
    };

    if (comp.text) extractFromText(comp.text);
    if (comp.content) extractFromText(comp.content);

    if (comp.children && Array.isArray(comp.children)) {
      comp.children.forEach((child: any) => traverse(child));
    }
  };

  components.forEach((comp) => traverse(comp));
  return variables;
};

// 统计组件信息
const analyzeComponents = (components: any[]) => {
  const stats: Record<string, number> = {};
  let totalCount = 0;

  const traverse = (comp: any) => {
    if (!comp) return;
    const type = comp.type || 'unknown';
    stats[type] = (stats[type] || 0) + 1;
    totalCount++;

    if (comp.children && Array.isArray(comp.children)) {
      comp.children.forEach((child: any) => traverse(child));
    }
  };

  components.forEach((comp) => traverse(comp));
  return { stats, totalCount };
};

// 渲染表格组件
const renderTableComponent = (component: any): React.ReactNode => {
  const { id, tableConfig, style = {} } = component;
  
  if (!tableConfig) return null;

  const { cells = [], borderWidth = 1, borderColor = '#000000', showOuterBorder = true, showInnerBorder = true } = tableConfig;

  return (
    <div 
      key={id}
      style={{
        position: 'absolute',
        left: style.x || 0,
        top: style.y || 0,
        width: style.width || 'auto',
        ...style,
      }}
    >
      <table 
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          border: showOuterBorder ? `${borderWidth}px solid ${borderColor}` : 'none',
          fontSize: style.fontSize || '14px',
        }}
      >
        <tbody>
          {cells.map((row: any[], rowIndex: number) => {
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
                  
                  // 截断过长的内容用于预览
                  const displayContent = content.length > 50 
                    ? content.substring(0, 50) + '...' 
                    : content;
                  
                  return (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      rowSpan={rowSpan > 1 ? rowSpan : undefined}
                      colSpan={colSpan > 1 ? colSpan : undefined}
                      style={{
                        border: showInnerBorder ? `${borderWidth}px solid ${borderColor}` : 'none',
                        padding: '4px 8px',
                        verticalAlign: 'top',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        ...cell.style,
                      }}
                    >
                      {displayContent}
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

// 渲染单个组件（预览模式）
const renderComponent = (component: any): React.ReactNode => {
  if (!component) return null;

  const { id, type, text, content, style = {}, children = [] } = component;

  // 表格组件特殊处理
  if (type === 'table') {
    return renderTableComponent(component);
  }

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    left: style.x || 0,
    top: style.y || 0,
    width: style.width || 'auto',
    height: style.height || 'auto',
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: style.color,
    backgroundColor: style.backgroundColor,
    borderWidth: style.borderWidth,
    borderColor: style.borderColor,
    borderStyle: style.borderWidth ? 'solid' : undefined,
    borderRadius: style.borderRadius,
    padding: style.padding,
    textAlign: style.textAlign,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    overflow: 'hidden',
    ...style,
  };

  // 截断过长的文本用于预览
  const truncateText = (str: string, maxLen: number = 100) => {
    if (!str || str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
  };

  switch (type) {
    case 'text':
      return (
        <div key={id} style={commonStyle}>
          {truncateText(text || content)}
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
            backgroundColor: style.backgroundColor || '#fff',
            border: '1px solid #e2e8f0',
            minWidth: '60px',
            minHeight: '60px',
          }}
        >
          <QrCode className="h-6 w-6 text-slate-400" />
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
            backgroundColor: style.backgroundColor || '#fff',
            border: '1px solid #e2e8f0',
            minWidth: '80px',
            minHeight: '40px',
          }}
        >
          <Barcode className="h-4 w-12 text-slate-400" />
        </div>
      );
    case 'container':
      return (
        <div key={id} style={{ ...commonStyle, border: '1px dashed #cbd5e1' }}>
          {children.map((child: any) => renderComponent(child))}
        </div>
      );
    default:
      return (
        <div key={id} style={commonStyle}>
          {truncateText(text || content)}
        </div>
      );
  }
};

interface TemplateCanvasPreviewProps {
  templateData: any;
  className?: string;
  showStats?: boolean;
  showVariables?: boolean;
  scale?: number;
}

export function TemplateCanvasPreview({ 
  templateData, 
  className = '',
  showStats = true,
  showVariables = true,
  scale = 0.5,
}: TemplateCanvasPreviewProps) {
  const { pageConfig = {}, components = [] } = templateData || {};

  const variables = useMemo(() => extractVariables(components), [components]);
  const { stats, totalCount } = useMemo(() => analyzeComponents(components), [components]);

  // 页面尺寸配置
  const pageWidth = pageConfig.width || 794; // A4 默认宽度 (px at 96dpi)
  const pageHeight = pageConfig.height || 1123; // A4 默认高度
  const padding = pageConfig.padding || { top: 40, right: 40, bottom: 40, left: 40 };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 统计信息 */}
      {showStats && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Layers className="h-4 w-4" />
            组件统计
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="flex items-center gap-1">
                {componentTypeIcons[type] || <Box className="h-3 w-3" />}
                {componentTypeLabels[type] || type}
                <span className="ml-1 text-xs">{count}</span>
              </Badge>
            ))}
            <Badge variant="outline" className="ml-auto">
              总计: {totalCount}
            </Badge>
          </div>
        </div>
      )}

      {/* 页面配置信息 */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Ruler className="h-4 w-4" />
          页面配置
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-slate-600">
            尺寸: {pageWidth} × {pageHeight} px
          </div>
          <div className="text-slate-600">
            边距: 上{padding.top} 右{padding.right} 下{padding.bottom} 左{padding.left}
          </div>
        </div>
      </div>

      {/* 变量列表 */}
      {showVariables && variables.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Variable className="h-4 w-4" />
            模板变量 ({variables.length}个)
          </div>
          <div className="flex flex-wrap gap-1">
            {variables.map((variable) => (
              <Badge key={variable} variant="outline" className="font-mono text-xs">
                [{variable}]
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* 画布预览 */}
      <div className="flex justify-center overflow-auto bg-slate-100 rounded-lg p-4">
        <div
          style={{
            width: pageWidth * scale,
            height: pageHeight * scale,
            backgroundColor: '#fff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            position: 'relative',
            overflow: 'hidden',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* 边距指示 */}
          <div
            style={{
              position: 'absolute',
              top: padding.top,
              left: padding.left,
              right: padding.right,
              bottom: padding.bottom,
              border: '1px dashed #e2e8f0',
              pointerEvents: 'none',
            }}
          />
          
          {/* 渲染所有组件 */}
          {components.map((component: any) => renderComponent(component))}
          
          {/* 空状态 */}
          {components.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">空模板</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateCanvasPreview;
