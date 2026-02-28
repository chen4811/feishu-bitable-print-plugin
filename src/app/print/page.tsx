'use client';

import { useState, useEffect, useRef } from 'react';
import { bitable } from '@lark-base-open/js-sdk';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PrintConfigPanel } from '@/components/print/PrintConfig';
import { PrintConfig, PRESET_TEMPLATES } from '@/types/print-config';
import { mockBitableData } from '@/data/mockData';
import { 
  Printer, 
  AlertCircle, 
  Loader2,
  FileText,
  ArrowLeft
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PrintPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFeishuEnvironment, setIsFeishuEnvironment] = useState(false);
  
  // 数据状态
  const [fields, setFields] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [records, setRecords] = useState<Array<{ id: string; fields: Record<string, any> }>>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  
  // 打印配置
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    template: PRESET_TEMPLATES[0],
    selectedRecords: [],
    options: {
      includeQRCode: false,
      includeBarcode: false,
      barcodeFormat: 'CODE128',
      generateIndex: true,
      indexPrefix: 'NO.'
    }
  });

  // 预览模式
  const [showPreview, setShowPreview] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  // 初始化飞书 SDK
  useEffect(() => {
    const initFeishuSDK = async () => {
      try {
        // 检查是否在飞书环境中
        if (typeof window !== 'undefined' && (window as any).bitable) {
          setIsFeishuEnvironment(true);
          
          // 获取当前表格
          const table = await bitable.base.getActiveTable();
          
          // 获取字段列表
          const fieldMetaList = await table.getFieldMetaList();
          const fieldsData = fieldMetaList.map((field: any) => ({
            id: field.id,
            name: field.name,
            type: field.type
          }));
          setFields(fieldsData);
          
          // 获取记录列表
          const recordIdList = await table.getRecordIdList();
          const recordsData: Array<{ id: string; fields: Record<string, any> }> = [];
          
          for (const recordId of recordIdList) {
            try {
              // 获取记录的所有字段值
              const fieldValues: Record<string, any> = {};
              for (const field of fieldsData) {
                try {
                  // @ts-ignore
                  const cell = await table.getCell(recordId, field.id);
                  if (cell && cell.value !== undefined) {
                    fieldValues[field.id] = cell.value;
                  }
                } catch (e) {
                  // 忽略单个字段获取失败
                }
              }
              
              recordsData.push({
                id: recordId,
                fields: fieldValues
              });
            } catch (e) {
              console.warn(`获取记录 ${recordId} 失败:`, e);
            }
          }
          
          setRecords(recordsData);
        } else {
          // 不在飞书环境中，使用模拟数据
          setIsFeishuEnvironment(false);
          setFields(mockBitableData.fields.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type
          })));
          setRecords(mockBitableData.records.map(r => ({
            id: r.id,
            fields: r.fields
          })));
        }
      } catch (err) {
        console.error('初始化失败:', err);
        setError(err instanceof Error ? err.message : '初始化失败');
        
        // 失败时使用模拟数据
        setIsFeishuEnvironment(false);
        setFields(mockBitableData.fields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type
        })));
        setRecords(mockBitableData.records.map(r => ({
          id: r.id,
          fields: r.fields
        })));
      } finally {
        setIsLoading(false);
      }
    };

    initFeishuSDK();
  }, []);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(records.map(r => r.id));
    } else {
      setSelectedRecords([]);
    }
  };

  // 切换单个记录选择
  const handleToggleRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  // 处理配置变更
  const handleConfigChange = (config: PrintConfig) => {
    setPrintConfig(config);
  };

  // 预览
  const handlePreview = () => {
    setShowPreview(true);
  };

  // 打印
  const handlePrint = async () => {
    if (printContentRef.current) {
      window.print();
    }
  };

  // 导出 PDF
  const handleExportPDF = async () => {
    if (!printContentRef.current) return;

    try {
      setIsLoading(true);
      
      const canvas = await html2canvas(printContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: printConfig.template.layout.orientation === 'portrait' ? 'p' : 'l',
        unit: 'mm',
        format: printConfig.template.layout.paperSize.toLowerCase()
      });
      
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`print-${Date.now()}.pdf`);
    } catch (err) {
      console.error('导出 PDF 失败:', err);
      setError('导出 PDF 失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 返回主页
  const handleGoBack = () => {
    window.location.hash = '/';
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error && !isFeishuEnvironment) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <Card className="max-w-md p-6 border-destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-medium text-destructive">加载失败</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <p className="text-sm text-muted-foreground mt-2">使用模拟数据运行</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* 非飞书环境提示 */}
      {!isFeishuEnvironment && (
        <div className="fixed top-0 left-0 right-0 bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 px-4 py-2 z-50">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <AlertCircle className="w-4 h-4" />
            <span>当前使用模拟数据，在飞书环境中将显示真实数据</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 pt-10">
        {/* 左侧：记录选择 */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="sm" onClick={handleGoBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">选择记录</h2>
              <Badge variant="outline">
                {selectedRecords.length} / {records.length}
              </Badge>
            </div>
            <div className="flex items-center mt-3 space-x-2">
              <Checkbox
                checked={selectedRecords.length === records.length && records.length > 0}
                onCheckedChange={handleSelectAll}
                id="selectAll"
              />
              <Label htmlFor="selectAll" className="text-sm font-normal cursor-pointer">
                全选
              </Label>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {records.map((record) => (
                <Card
                  key={record.id}
                  className={`p-3 cursor-pointer transition-all ${
                    selectedRecords.includes(record.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleToggleRecord(record.id)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedRecords.includes(record.id)}
                      onCheckedChange={() => handleToggleRecord(record.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {Object.values(record.fields)[0] || `记录 ${record.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Object.keys(record.fields).length} 个字段
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* 中间：打印预览 */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Printer className="w-5 h-5" />
                排版打印
              </h1>
              <p className="text-sm text-muted-foreground">
                多维度排版生成 · 批量打印 · 条码生成
              </p>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            {showPreview && selectedRecords.length > 0 ? (
              <div ref={printContentRef} className="bg-white shadow-lg rounded-lg p-8 print:shadow-none print:p-0">
                {printConfig.template.style.showHeader && printConfig.template.style.headerText && (
                  <div className="text-center mb-6 pb-3 border-b">
                    <h2 className="text-lg font-semibold">
                      {printConfig.template.style.headerText
                        .replace('{date}', new Date().toLocaleDateString('zh-CN'))
                        .replace('{count}', String(selectedRecords.length))}
                    </h2>
                  </div>
                )}
                
                <div className={`grid gap-4`} style={{
                  gridTemplateColumns: `repeat(${printConfig.template.layout.columns}, 1fr)`
                }}>
                  {selectedRecords.map((recordId, index) => {
                    const record = records.find(r => r.id === recordId);
                    if (!record) return null;

                    return (
                      <Card 
                        key={recordId} 
                        className="p-4 print:break-inside-avoid"
                        style={{
                          border: printConfig.template.style.showBorder ? undefined : 'none',
                          fontSize: `${printConfig.template.style.fontSize}px`
                        }}
                      >
                        {printConfig.options.generateIndex && (
                          <div className="text-xs text-muted-foreground mb-2">
                            {printConfig.options.indexPrefix}{String(index + 1).padStart(3, '0')}
                          </div>
                        )}
                        <div className="space-y-2">
                          {printConfig.template.fieldMappings
                            .filter(m => m.include)
                            .sort((a, b) => a.order - b.order)
                            .map(mapping => {
                              const field = fields.find(f => f.id === mapping.fieldId);
                              if (!field) return null;
                              
                              const value = record.fields[mapping.fieldId];
                              return (
                                <div key={mapping.fieldId} className="flex gap-2 text-sm">
                                  <span className="font-medium min-w-[100px] text-muted-foreground">
                                    {mapping.displayName || mapping.fieldName}:
                                  </span>
                                  <span className="flex-1">
                                    {String(value || '-')}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {printConfig.template.style.showFooter && printConfig.template.style.footerText && (
                  <div className="text-center mt-6 pt-3 border-t text-xs text-muted-foreground">
                    {printConfig.template.style.footerText
                      .replace('{date}', new Date().toLocaleDateString('zh-CN'))
                      .replace('{count}', String(selectedRecords.length))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    {selectedRecords.length === 0 
                      ? '请在左侧选择要打印的记录'
                      : '点击右侧"预览"按钮查看打印效果'}
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* 右侧：打印配置 */}
        <div className="w-96 border-l">
          <PrintConfigPanel
            fields={fields}
            totalRecords={records.length}
            selectedRecords={selectedRecords}
            onConfigChange={handleConfigChange}
            onPreview={handlePreview}
            onPrint={handlePrint}
            onExportPDF={handleExportPDF}
          />
        </div>
      </div>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content,
          .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
