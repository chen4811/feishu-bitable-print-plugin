'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Printer, ChevronLeft, ChevronRight, Eye, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTemplateStore, type Template } from '@/store/templateStore';
import { useSelectedDataStore } from '@/store/selectedDataStore';
import feishuSDK from '@/lib/feishu-sdk-real';

interface TemplatePreviewProps {
  baseId?: string;
  tableId?: string;
}

// 检测模板中的变量
const extractVariables = (components: any[]): string[] => {
  const variables: string[] = [];

  const traverse = (comp: any) => {
    if (!comp) return;

    // 检测文本中的变量 [字段名]
    if (comp.text) {
      const matches = comp.text.match(/\[([^\]]+)\]/g);
      if (matches) {
        matches.forEach((match: string) => {
          const varName = match.slice(1, -1);
          if (!variables.includes(varName)) {
            variables.push(varName);
          }
        });
      }
    }

    // 检测 content 中的变量
    if (comp.content) {
      const matches = comp.content.match(/\[([^\]]+)\]/g);
      if (matches) {
        matches.forEach((match: string) => {
          const varName = match.slice(1, -1);
          if (!variables.includes(varName)) {
            variables.push(varName);
          }
        });
      }
    }

    // 递归检查子组件
    if (comp.children && Array.isArray(comp.children)) {
      comp.children.forEach(traverse);
    }
  };

  components.forEach(traverse);
  return variables;
};

// 替换文本中的变量为实际值
const replaceVariables = (text: string, data: Record<string, any>): string => {
  if (!text || typeof text !== 'string') return text;

  return text.replace(/\[([^\]]+)\]/g, (match, varName) => {
    const value = data[varName];
    if (value === undefined || value === null) {
      return match; // 保留原变量格式
    }
    return String(value);
  });
};

// 渲染单个组件（带变量替换）
const renderComponent = (component: any, data: Record<string, any>): React.ReactNode => {
  if (!component) return null;

  const {
    id,
    type,
    text,
    content,
    style = {},
    children = [],
  } = component;

  // 替换变量
  const processedText = text ? replaceVariables(text, data) : undefined;
  const processedContent = content ? replaceVariables(content, data) : undefined;

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

  switch (type) {
    case 'text':
      return (
        <div key={id} style={commonStyle}>
          {processedText}
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
            backgroundColor: style.backgroundColor || '#fff',
            border: '1px solid #e2e8f0',
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
    default:
      return (
        <div key={id} style={commonStyle}>
          {processedContent || processedText}
        </div>
      );
  }
};

export function TemplatePreview({ baseId, tableId }: TemplatePreviewProps) {
  const { templates, fetchTemplates } = useTemplateStore();
  const {
    records,
    currentIndex,
    setRecords,
    setCurrentIndex,
    nextRecord,
    prevRecord,
    isListening,
    setIsListening,
    isFromFeishu,
    setIsFromFeishu,
    getCurrentRecord,
  } = useSelectedDataStore();

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVariableMapping, setShowVariableMapping] = useState(true);

  // 加载模板列表
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 设置飞书选中监听
  useEffect(() => {
    if (!isListening) {
      setIsFromFeishu(false);
      return;
    }

    // 检查是否在飞书环境中
    const isInFeishu = typeof window !== 'undefined' && (
      window.location.href.includes('larksuite.com') ||
      window.location.href.includes('feishu.cn') ||
      // @ts-ignore
      (window.bitable !== undefined)
    );

    if (!isInFeishu) {
      toast.info('当前不在飞书环境中，无法监听选中变化');
      setIsListening(false);
      return;
    }

    setIsFromFeishu(true);

    // 注册选中变化监听
    const unsubscribe = feishuSDK.onSelectionChange(async (event) => {
      console.log('[TemplatePreview] 检测到选中变化:', event);

      try {
        // 获取选中数据
        const selectedData = await feishuSDK.getSelectedData(event);

        if (selectedData && selectedData.length > 0) {
          // 转换为记录格式
          const records = selectedData.map((data, index) => ({
            id: `row_${data._rowIndex || index}`,
            ...data,
          }));

          setRecords(records);
          toast.success(`已获取 ${records.length} 条选中数据`);
        } else {
          setRecords([]);
          toast.info('未检测到选中的数据');
        }
      } catch (error) {
        console.error('[TemplatePreview] 获取选中数据失败:', error);
        toast.error('获取选中数据失败');
      }
    });

    toast.success('已开始监听飞书选中变化');

    return () => {
      unsubscribe?.();
    };
  }, [isListening, setRecords, setIsFromFeishu]);

  // 获取当前选中的模板
  const currentRecord = getCurrentRecord();

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

    if (records.length === 0) {
      toast.error('没有可打印的数据');
      return;
    }

    window.print();
  }, [selectedTemplate, records.length]);

  // 处理批量打印（所有记录）
  const handleBatchPrint = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('请先选择一个模板');
      return;
    }

    if (records.length === 0) {
      toast.error('没有可打印的数据');
      return;
    }

    // 打开新窗口进行批量打印
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('请允许弹窗以进行批量打印');
      return;
    }

    // 生成批量打印内容
    const printContent = records.map((record, index) => `
      <div class="print-page" style="
        width: 210mm;
        height: 297mm;
        padding: 20mm;
        margin: 0 auto;
        box-sizing: border-box;
        page-break-after: always;
        position: relative;
        background: white;
      ">
        ${selectedTemplate.data?.components
          ?.map((comp: any) => {
            const style = comp.style || {};
            const processedText = comp.text
              ? comp.text.replace(/\[([^\]]+)\]/g, (match: string, varName: string) => {
                  const value = record[varName];
                  return value !== undefined ? String(value) : match;
                })
              : '';

            return `<div style="
              position: absolute;
              left: ${style.x || 0}px;
              top: ${style.y || 0}px;
              width: ${style.width ? `${style.width}px` : 'auto'};
              height: ${style.height ? `${style.height}px` : 'auto'};
              font-size: ${style.fontSize || '16px'};
              font-weight: ${style.fontWeight || 'normal'};
              color: ${style.color || '#000'};
              background-color: ${style.backgroundColor || 'transparent'};
              padding: ${style.padding || '0'};
              text-align: ${style.textAlign || 'left'};
              white-space: pre-wrap;
            ">${processedText}</div>`;
          })
          .join('') || ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>批量打印 - ${selectedTemplate.name}</title>
        <style>
          @media print {
            body { margin: 0; }
            .print-page { page-break-after: always; }
            .print-page:last-child { page-break-after: auto; }
          }
          @page { size: A4; margin: 0; }
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

    toast.success(`已打开批量打印窗口，共 ${records.length} 条记录`);
  }, [selectedTemplate, records]);

  return (
    <div className="flex h-full gap-4 p-4">
      {/* 左侧：模板列表 */}
      <Card className="w-80 flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            模板列表
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-2 p-4 pt-0">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
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
              ))}

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

      {/* 中间：打印预览 */}
      <div className="flex-1 flex flex-col">
        {/* 工具栏 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* 飞书监听开关 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="feishu-listen"
                    checked={isListening}
                    onCheckedChange={setIsListening}
                  />
                  <Label htmlFor="feishu-listen" className="text-sm">
                    监听飞书选中
                  </Label>
                </div>

                {isFromFeishu && (
                  <Badge variant="secondary" className="text-xs">
                    已连接飞书
                  </Badge>
                )}
              </div>

              {/* 数据导航 */}
              {records.length > 0 && (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevRecord}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentIndex + 1} / {records.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextRecord}
                    disabled={currentIndex === records.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* 打印按钮 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchPrint}
                  disabled={!selectedTemplate || records.length === 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  批量打印 ({records.length})
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrint}
                  disabled={!selectedTemplate || records.length === 0}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  打印当前
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* A4 预览区域 */}
        <div className="flex-1 bg-gray-100 rounded-lg p-8 overflow-auto">
          <div className="flex justify-center min-h-full">
            {selectedTemplate ? (
              <div
                className="bg-white shadow-lg print:shadow-none"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '20mm',
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                {records.length > 0 && currentRecord ? (
                  selectedTemplate.data?.components?.map((component: any) =>
                    renderComponent(component, currentRecord)
                  )
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>暂无数据</p>
                      <p className="text-sm mt-1">
                        {isListening
                          ? '请在飞书多维表格中选中数据'
                          : '请开启飞书监听并选中数据'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">请从左侧选择一个模板</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右侧：变量映射和数据信息 */}
      <Card className="w-64 flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">数据匹配</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-250px)]">
            {selectedTemplate ? (
              <div className="space-y-4">
                {/* 模板变量 */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-gray-700">模板变量</h4>
                  {templateVariables.length > 0 ? (
                    <div className="space-y-1">
                      {templateVariables.map((varName) => (
                        <div
                          key={varName}
                          className="text-xs px-2 py-1 bg-gray-100 rounded"
                        >
                          [{varName}]
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">模板中没有变量</p>
                  )}
                </div>

                {/* 数据匹配状态 */}
                {currentRecord && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-gray-700">匹配状态</h4>
                    {variableMapping.length > 0 ? (
                      <div className="space-y-2">
                        {variableMapping.map((mapping) => (
                          <div
                            key={mapping.name}
                            className={`text-xs px-2 py-1 rounded flex items-center justify-between ${
                              mapping.hasValue
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            <span>{mapping.name}</span>
                            {mapping.hasValue ? (
                              <Badge variant="outline" className="text-[10px] h-4">
                                ✓
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-4">
                                ✗
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">无需变量替换</p>
                    )}
                  </div>
                )}

                {/* 当前数据预览 */}
                {currentRecord && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-gray-700">当前数据</h4>
                    <div className="space-y-1 text-xs">
                      {Object.entries(currentRecord)
                        .filter(([key]) => !key.startsWith('_'))
                        .slice(0, 10)
                        .map(([key, value]) => (
                          <div key={key} className="truncate">
                            <span className="text-gray-500">{key}:</span>{' '}
                            <span className="text-gray-700">
                              {String(value).slice(0, 50)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                选择模板查看变量信息
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bg-white,
          .bg-white * {
            visibility: visible;
          }
          .bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default TemplatePreview;
