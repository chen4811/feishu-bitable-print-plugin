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
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

  // 渲染单页内容（流式布局）
  const renderPageContent = useCallback((record: Record<string, unknown>) => {
    return (
      <div className="flex flex-col gap-3 w-full">
        {components.map((component) => {
          return (
            <div
              key={component.id}
              className="w-full"
              style={{
                width: component.width === 100 ? '100%' : `${component.width}%`,
              }}
            >
              {renderComponent(component, record)}
            </div>
          );
        })}
      </div>
    );
  }, [components]);

  // 渲染组件
  const renderComponent = (component: CanvasComponentNode, record: Record<string, unknown>) => {
    // 简单的变量解析
    const resolveVariables = (text: string) => {
      return text.replace(/\[([^\]]+)\]/g, (match, varName) => {
        return String(record[varName] || match);
      });
    };

    switch (component.type) {
      case 'text':
        const textComp = component as any;
        return (
          <div
            style={{
              fontSize: `${textComp.textStyle?.fontSize || styleConfig.fontSize}px`,
              fontWeight: textComp.textStyle?.bold ? 'bold' : 'normal',
              color: textComp.textStyle?.color || '#000000',
              textAlign: textComp.textStyle?.align || 'left',
              lineHeight: textComp.textStyle?.lineHeight || styleConfig.lineHeight,
              fontFamily: styleConfig.fontFamily,
            }}
          >
            {resolveVariables(textComp.content || '')}
          </div>
        );
      case 'line':
        const lineComp = component as any;
        return (
          <hr
            style={{
              borderColor: lineComp.color || '#000000',
              borderWidth: `${lineComp.thickness || 1}px`,
              borderStyle: lineComp.style || 'solid',
            }}
          />
        );
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
      case 'image':
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
      case 'table':
        return (
          <div className="w-full border-collapse">
            <div className="border border-gray-300 bg-gray-50 p-2">
              表格预览
            </div>
          </div>
        );
      default:
        return <div className="text-gray-500">{(component as any).type}</div>;
    }
  };

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

  // 系统打印
  const handleSystemPrint = useCallback(() => {
    window.print();
  }, []);

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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSystemPrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                打印
              </Button>
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
          {/* 左侧：记录选择 */}
          {records.length > 0 && (
            <div className="w-64 border-r flex flex-col">
              <div className="p-4 border-b">
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
                <Badge variant="secondary">
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
            </div>
          )}

          {/* 中间：预览区域 */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
            {/* 预览模式切换 */}
            <div className="p-4 border-b bg-background">
              <Tabs value={previewMode} onValueChange={(v: any) => setPreviewMode(v)}>
                <TabsList>
                  <TabsTrigger value="default">单页模式</TabsTrigger>
                  <TabsTrigger value="continuous">连续模式</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* 预览内容 */}
            <ScrollArea className="flex-1">
              <div className="p-8 flex flex-col items-center gap-8">
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
                        width: `${canvasWidth}px`,
                        minHeight: `${canvasHeight}px`,
                        padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
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
                        width: `${canvasWidth}px`,
                        minHeight: `${canvasHeight}px`,
                        padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
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
