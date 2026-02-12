'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PrintPreview, TaskPrintCard } from '@/components/print/PrintPreview';
import { QRCodeGenerator, BarcodeGenerator, BatchQRCodeGenerator } from '@/components/print/BarcodeGenerator';
import { BatchPrint } from '@/components/print/BatchPrint';
import { mockBitableData } from '@/data/mockData';
import { Printer, FileText, QrCode, Barcode, Layers, Download } from 'lucide-react';

export default function PrintPage() {
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<any>(null);
  const [qrValue, setQrValue] = useState('https://example.com/task/001');
  const [barcodeValue, setBarcodeValue] = useState('TASK-001-20250112');

  // 预览单个任务
  const handlePreview = (record: any) => {
    setPreviewRecord(record);
    setPrintPreviewOpen(true);
  };

  // 转换记录为打印数据格式
  const recordToPrintData = (record: any) => ({
    id: record.id,
    title: record.fields.field_1,
    status: record.fields.field_2,
    priority: record.fields.field_3,
    assignee: record.fields.field_4,
    progress: record.fields.field_7,
    startDate: record.fields.field_5,
    endDate: record.fields.field_6,
    description: record.fields.field_9,
    tags: record.fields.field_8,
  });

  // 生成批量二维码数据
  const batchQRData = mockBitableData.records.map(record => ({
    id: record.id,
    value: `https://example.com/task/${record.id}`,
    label: record.fields.field_1,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* 页面标题 */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">排版打印</h1>
              <p className="text-xs text-muted-foreground">多维度排版生成、批量打印、条码生成</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {mockBitableData.records.length} 条记录
            </Badge>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              导出设置
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <main className="p-6">
        <Tabs defaultValue="batch" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              批量打印
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              二维码生成
            </TabsTrigger>
            <TabsTrigger value="barcode" className="flex items-center gap-2">
              <Barcode className="w-4 h-4" />
              条形码生成
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              模板管理
            </TabsTrigger>
          </TabsList>

          {/* 批量打印 */}
          <TabsContent value="batch">
            <BatchPrint
              records={mockBitableData.records.map(recordToPrintData)}
              onPrint={(ids) => console.log('批量打印:', ids)}
              onExport={(ids) => console.log('批量导出:', ids)}
            />
          </TabsContent>

          {/* 二维码生成 */}
          <TabsContent value="qrcode">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 单个二维码生成器 */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">单个二维码</h3>
                <div className="space-y-4">
                  <div>
                    <Label>二维码内容</Label>
                    <Input
                      value={qrValue}
                      onChange={(e) => setQrValue(e.target.value)}
                      placeholder="输入URL或文本"
                    />
                  </div>
                  <QRCodeGenerator
                    value={qrValue}
                    size={200}
                    title="任务二维码"
                    showDownload
                  />
                </div>
              </Card>

              {/* 批量二维码 */}
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">批量二维码</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  为所有任务生成二维码，每条记录一个二维码
                </p>
                <BatchQRCodeGenerator values={batchQRData} size={150} />
              </Card>
            </div>
          </TabsContent>

          {/* 条形码生成 */}
          <TabsContent value="barcode">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 单个条形码生成器 */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">单个条形码</h3>
                <div className="space-y-4">
                  <div>
                    <Label>条形码内容</Label>
                    <Input
                      value={barcodeValue}
                      onChange={(e) => setBarcodeValue(e.target.value)}
                      placeholder="输入编号或文本"
                    />
                  </div>
                  <BarcodeGenerator
                    value={barcodeValue}
                    format="CODE128"
                    title="任务条形码"
                    showDownload
                  />
                </div>
              </Card>

              {/* 批量条形码 */}
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">批量条形码</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  为所有任务生成条形码
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockBitableData.records.map((record, idx) => (
                    <BarcodeGenerator
                      key={record.id}
                      value={`TASK-${String(idx + 1).padStart(3, '0')}-${Date.now()}`}
                      title={`任务 ${idx + 1}`}
                      showDownload
                    />
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 模板管理 */}
          <TabsContent value="template">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">打印模板管理</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    创建新模板
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    导入模板
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {/* 预设模板 */}
                  {['标准任务模板', '简洁卡片模板', '详细报告模板', '标签模板', '证书模板', '发票模板'].map(
                    (templateName, idx) => (
                      <Card key={idx} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{templateName}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {idx < 3 ? '系统模板' : '自定义模板'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1">
                            编辑
                          </Button>
                          <Button size="sm" className="flex-1">
                            使用
                          </Button>
                        </div>
                      </Card>
                    )
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 打印预览对话框 */}
      <PrintPreview
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        content={previewRecord && <TaskPrintCard data={previewRecord} />}
        title="任务打印预览"
        filename={`task-${previewRecord?.id}.pdf`}
      />
    </div>
  );
}
