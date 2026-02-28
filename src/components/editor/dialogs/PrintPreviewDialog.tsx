'use client';

import { useState, useRef, useCallback } from 'react';
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
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES, EditorComponent, Field } from '@/types/editor';
import { 
  Printer, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  CheckSquare,
  Square,
  AlertCircle,
  FileCode
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { parseComponentVariables } from '@/utils/variableParser';
import { 
  generatePrintHTML, 
  invokeSystemPrint, 
  exportAsHTML 
} from '@/utils/printUtils';

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  } = useEditorStore();
  
  const [previewMode, setPreviewMode] = useState<'default' | 'continuous' | 'label'>('default');
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // 计算画布尺寸
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size];
  const isLandscape = pageConfig.orientation === 'landscape';
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;

  // 获取预览记录
  const previewRecords = selectedRecordIds.length > 0
    ? records.filter(r => selectedRecordIds.includes(r.id as string))
    : records.length > 0 ? records : [{ id: 'demo', __tableName__: '演示数据' }];

  // 渲染单页内容
  const renderPageContent = useCallback((record: Record<string, unknown>) => {
    return components.map((component) => {
      // 解析变量
      const parsedComponent = parseComponentVariables(
        component as unknown as Record<string, unknown>,
        record,
        fields
      );

      return (
        <div
          key={component.id}
          className="absolute"
          style={{
            left: `${component.x}px`,
            top: `${component.y}px`,
            width: `${component.width}px`,
            minHeight: `${component.height}px`,
            zIndex: component.zIndex,
          }}
        >
          {renderComponent(parsedComponent)}
        </div>
      );
    });
  }, [components, fields]);

  // 渲染组件
  const renderComponent = (component: Record<string, unknown>) => {
    switch (component.type) {
      case 'text':
        return (
          <div
            style={{
              fontSize: `${component.fontSize || styleConfig.fontSize}pt`,
              fontWeight: component.fontWeight as React.CSSProperties['fontWeight'],
              textAlign: component.textAlign as React.CSSProperties['textAlign'],
              lineHeight: (component.lineHeight || styleConfig.lineHeight) as React.CSSProperties['lineHeight'],
              fontFamily: styleConfig.fontFamily,
            }}
          >
            {component.content as string}
          </div>
        );
      case 'line':
        return (
          <div
            style={{
              width: '100%',
              height: `${component.thickness || 1}px`,
              backgroundColor: component.color as string,
            }}
          />
        );
      case 'qrcode':
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded">
            <span className="text-xs text-muted-foreground">QR: {String(component.content).slice(0, 10)}...</span>
          </div>
        );
      case 'barcode':
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded">
            <span className="text-xs text-muted-foreground">BC: {String(component.content).slice(0, 10)}...</span>
          </div>
        );
      case 'table':
        return (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-muted">
                <th className="border border-gray-300 p-1 text-xs">列1</th>
                <th className="border border-gray-300 p-1 text-xs">列2</th>
                <th className="border border-gray-300 p-1 text-xs">列3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-1 text-xs">数据</td>
                <td className="border border-gray-300 p-1 text-xs">数据</td>
                <td className="border border-gray-300 p-1 text-xs">数据</td>
              </tr>
            </tbody>
          </table>
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded">
            <span className="text-xs text-muted-foreground">{String(component.type)}</span>
          </div>
        );
    }
  };

  // 真正的系统打印
  const handlePrint = useCallback(() => {
    setPrintError(null);
    
    if (components.length === 0) {
      setPrintError('请先添加组件到画布');
      return;
    }
    
    // 获取要打印的记录
    const recordsToPrint = selectedRecordIds.length > 0
      ? records.filter(r => selectedRecordIds.includes(r.id as string))
      : records.length > 0 ? records : [{ id: 'demo', __tableName__: '演示数据' }];
    
    try {
      // 生成打印 HTML
      const html = generatePrintHTML(
        components,
        recordsToPrint,
        fields,
        pageConfig,
        styleConfig,
        templateName
      );
      
      // 调用系统打印
      invokeSystemPrint(html, {
        onError: (error) => {
          setPrintError(error.message);
        }
      });
    } catch (error) {
      setPrintError((error as Error).message);
    }
  }, [components, fields, pageConfig, styleConfig, templateName, records, selectedRecordIds]);

  // 导出为 HTML 文件
  const handleExportHTML = useCallback(() => {
    if (components.length === 0) {
      alert('请先添加组件到画布');
      return;
    }
    
    const recordsToExport = selectedRecordIds.length > 0
      ? records.filter(r => selectedRecordIds.includes(r.id as string))
      : records.length > 0 ? records : [{ id: 'demo', __tableName__: '演示数据' }];
    
    exportAsHTML(
      components,
      recordsToExport,
      fields,
      pageConfig,
      styleConfig,
      templateName
    );
  }, [components, fields, pageConfig, styleConfig, templateName, records, selectedRecordIds]);

  // 导出 PDF（支持批量）
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: pageConfig.orientation,
        unit: 'mm',
        format: pageConfig.size,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const recordsToExport = selectedRecordIds.length > 0
        ? records.filter(r => selectedRecordIds.includes(r.id as string))
        : records.length > 0 ? records : [{ id: 'demo', __tableName__: '演示数据' }];

      for (let i = 0; i < recordsToExport.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        // 渲染页面到临时容器
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
          position: absolute;
          left: -9999px;
          width: ${canvasWidth}px;
          height: ${canvasHeight}px;
          background: white;
          padding: ${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px;
        `;
        
        tempContainer.innerHTML = `<div style="font-family: ${styleConfig.fontFamily}">记录 ${i + 1}</div>`;
        document.body.appendChild(tempContainer);

        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          logging: false,
        });

        document.body.removeChild(tempContainer);

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`${templateName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('导出 PDF 失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 上一页/下一页
  const goToPrevPage = () => setCurrentPage(Math.max(0, currentPage - 1));
  const goToNextPage = () => setCurrentPage(Math.min(previewRecords.length - 1, currentPage + 1));

  const currentRecord = previewRecords[currentPage];
  const totalPages = previewRecords.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle>{templateName}</DialogTitle>
              <Badge variant="outline">
                {pageConfig.size}/{pageConfig.orientation === 'portrait' ? '纵向' : '横向'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as typeof previewMode)}>
                <TabsList className="h-8">
                  <TabsTrigger value="default" className="text-xs">默认</TabsTrigger>
                  <TabsTrigger value="continuous" className="text-xs">连续</TabsTrigger>
                  <TabsTrigger value="label" className="text-xs">标签</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </DialogHeader>

        {/* 错误提示 */}
        {printError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{printError}</AlertDescription>
          </Alert>
        )}

        {/* 批量选择区域 */}
        {records.length > 0 && (
          <div className="border-b pb-3 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              批量模式
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllRecords}
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              全选
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearRecordSelection}
            >
              <Square className="w-4 h-4 mr-1" />
              清空
            </Button>
            <Badge variant="secondary">
              已选 {selectedRecordIds.length} 条
            </Badge>
          </div>
        )}

        {/* 主内容区域 */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* 预览区域 */}
          <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-6 flex justify-center">
            <div
              ref={previewRef}
              className="bg-white shadow-lg relative"
              style={{
                width: `${canvasWidth}px`,
                minHeight: `${canvasHeight}px`,
                padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
                fontFamily: styleConfig.fontFamily,
              }}
            >
              {components.length > 0 ? (
                renderPageContent(currentRecord || {})
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无内容</p>
                    <p className="text-xs mt-1">请先添加组件到画布</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 记录列表（批量模式） */}
          {records.length > 1 && (
            <div className="w-48 border-l pl-4">
              <p className="text-sm font-medium mb-2">记录列表</p>
              <ScrollArea className="h-64">
                <div className="space-y-1">
                  {records.map((record, idx) => (
                    <div
                      key={record.id as string}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                        currentPage === idx ? 'bg-muted' : ''
                      }`}
                      onClick={() => setCurrentPage(idx)}
                    >
                      <Checkbox
                        checked={selectedRecordIds.includes(record.id as string)}
                        onCheckedChange={() => toggleRecordSelection(record.id as string)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs truncate">
                        {String(record[fields[0]?.id] || `记录 ${idx + 1}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex-shrink-0 border-t pt-4 flex items-center justify-between">
          {/* 页码控制 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevPage} disabled={currentPage === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              第 {currentPage + 1} / {totalPages} 页
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextPage} disabled={currentPage >= totalPages - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              返回编辑
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportHTML} 
              disabled={components.length === 0}
              title="导出为独立 HTML 文件，可在任何浏览器中打开并打印"
            >
              <FileCode className="w-4 h-4 mr-1" />
              导出 HTML
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportPDF} 
              disabled={isExporting || components.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              {isExporting ? '导出中...' : `导出 PDF${selectedRecordIds.length > 1 ? ` (${selectedRecordIds.length}页)` : ''}`}
            </Button>
            <Button 
              onClick={handlePrint} 
              disabled={components.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
              title="打开系统打印对话框"
            >
              <Printer className="w-4 h-4 mr-1" />
              打印
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
