'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES } from '@/types/editor';
import { Printer, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintPreviewDialog({ open, onOpenChange }: PrintPreviewDialogProps) {
  const { components, pageConfig, styleConfig, templateName } = useEditorStore();
  const [previewMode, setPreviewMode] = useState<'default' | 'continuous' | 'label'>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // 计算画布尺寸
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size];
  const isLandscape = pageConfig.orientation === 'landscape';
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;

  // 导出 PDF
  const handleExportPDF = async () => {
    if (!previewRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: pageConfig.orientation,
        unit: 'mm',
        format: pageConfig.size,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${templateName}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('导出 PDF 失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 打印
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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

        {/* 预览区域 */}
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-6 flex justify-center">
          <div
            ref={previewRef}
            className="bg-white shadow-lg"
            style={{
              width: `${canvasWidth}px`,
              minHeight: `${canvasHeight}px`,
              padding: `${pageConfig.margins.top * mmToPx}px ${pageConfig.margins.right * mmToPx}px ${pageConfig.margins.bottom * mmToPx}px ${pageConfig.margins.left * mmToPx}px`,
              fontFamily: styleConfig.fontFamily,
            }}
          >
            {components.length > 0 ? (
              <div className="relative" style={{ minHeight: `${canvasHeight - (pageConfig.margins.top + pageConfig.margins.bottom) * mmToPx}px` }}>
                {components.map((component) => (
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
                    {component.type === 'text' && (
                      <div
                        style={{
                          fontSize: `${(component as any).fontSize || styleConfig.fontSize}pt`,
                          fontWeight: (component as any).fontWeight,
                          textAlign: (component as any).textAlign,
                          lineHeight: (component as any).lineHeight || styleConfig.lineHeight,
                        }}
                      >
                        {(component as any).content}
                      </div>
                    )}
                    {component.type === 'qrcode' && (
                      <div className="flex items-center justify-center w-full h-full bg-muted/50 rounded">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {component.type === 'barcode' && (
                      <div className="flex items-center justify-center w-full h-full bg-muted/50 rounded">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {component.type === 'line' && (
                      <div
                        style={{
                          width: '100%',
                          height: `${(component as any).thickness}px`,
                          backgroundColor: (component as any).color,
                        }}
                      />
                    )}
                    {component.type === 'table' && (
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-gray-300 p-2 text-xs">列1</th>
                            <th className="border border-gray-300 p-2 text-xs">列2</th>
                            <th className="border border-gray-300 p-2 text-xs">列3</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 p-2 text-xs">数据</td>
                            <td className="border border-gray-300 p-2 text-xs">数据</td>
                            <td className="border border-gray-300 p-2 text-xs">数据</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
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

        {/* 底部操作栏 */}
        <div className="flex-shrink-0 border-t pt-4 flex items-center justify-between">
          {/* 页码控制 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              第 {currentPage} / 1 页
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              返回编辑
            </Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={isExporting || components.length === 0}>
              <Download className="w-4 h-4 mr-1" />
              {isExporting ? '导出中...' : '导出 PDF'}
            </Button>
            <Button onClick={handlePrint} disabled={components.length === 0}>
              <Printer className="w-4 h-4 mr-1" />
              打印
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
