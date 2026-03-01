'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Printer, ChevronLeft, ChevronRight, Eye, RefreshCw, FileText, Pencil, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTemplateStore, type Template } from '@/store/templateStore';
import { useSelectedDataStore } from '@/store/selectedDataStore';
import { useEditorStore } from '@/store/editorStore';
import feishuSDK from '@/lib/feishu-sdk-real';

interface TemplatePreviewProps {
  baseId?: string;
  tableId?: string;
  onEditTemplate?: (template: Template) => void;
}

// 检测模板中的变量
const extractVariables = (components: any[]): string[] => {
  console.log('[extractVariables] 开始提取变量，组件数量:', components?.length);
  const variables: string[] = [];

  const traverse = (comp: any, depth: number = 0) => {
    if (!comp) return;

    // 检测文本中的变量 [字段名]
    if (comp.text) {
      const matches = comp.text.match(/\[([^\]]+)\]/g);
      if (matches) {
        matches.forEach((match: string) => {
          const varName = match.slice(1, -1);
          if (!variables.includes(varName)) {
            variables.push(varName);
            console.log(`[extractVariables] 发现变量: [${varName}]`);
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
            console.log(`[extractVariables] 发现变量: [${varName}]`);
          }
        });
      }
    }

    // 递归检查子组件
    if (comp.children && Array.isArray(comp.children)) {
      comp.children.forEach((child: any) => traverse(child, depth + 1));
    }
  };

  components.forEach((comp, idx) => traverse(comp, 0));
  console.log('[extractVariables] 提取完成，变量列表:', variables);
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
  if (!component) {
    console.log('[renderComponent] 组件为空');
    return null;
  }

  const {
    id,
    type,
    text,
    content,
    style = {},
    children = [],
  } = component;

  console.log(`[renderComponent] 渲染组件: id=${id}, type=${type}`);

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

export function TemplatePreview({ baseId, tableId, onEditTemplate }: TemplatePreviewProps) {
  console.log('[TemplatePreview] 组件渲染，props:', { baseId, tableId });

  const { templates, fetchTemplates, setCurrentTemplate } = useTemplateStore();
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
  const [debugInfo, setDebugInfo] = useState<string>('');

  // 加载模板列表
  useEffect(() => {
    console.log('[TemplatePreview] useEffect - 加载模板列表');
    fetchTemplates().then(() => {
      console.log('[TemplatePreview] 模板列表加载完成，数量:', templates.length);
    }).catch(err => {
      console.error('[TemplatePreview] 加载模板列表失败:', err);
    });
  }, [fetchTemplates]);

  // 监听模板变化
  useEffect(() => {
    console.log('[TemplatePreview] 模板列表变化:', templates.map(t => ({ id: t.id, name: t.name })));
  }, [templates]);

  // 设置飞书选中监听
  useEffect(() => {
    console.log('[TemplatePreview] useEffect - 飞书监听状态变化:', isListening);

    if (!isListening) {
      console.log('[TemplatePreview] 监听已关闭');
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

    console.log('[TemplatePreview] 飞书环境检测:', { isInFeishu, href: window.location.href });

    if (!isInFeishu) {
      toast.info('当前不在飞书环境中，无法监听选中变化');
      setIsListening(false);
      return;
    }

    setIsFromFeishu(true);
    console.log('[TemplatePreview] 开始在飞书环境中监听选中变化');

    // 注册选中变化监听
    const unsubscribe = feishuSDK.onSelectionChange(async (event) => {
      console.log('[TemplatePreview] 检测到选中变化:', JSON.stringify(event, null, 2));
      setDebugInfo(`选中事件: ${JSON.stringify(event, null, 2)}`);

      try {
        // 获取选中数据
        console.log('[TemplatePreview] 正在获取选中数据...');
        const selectedData = await feishuSDK.getSelectedData(event);
        console.log('[TemplatePreview] 获取到的选中数据:', selectedData);

        if (selectedData && selectedData.length > 0) {
          // 转换为记录格式
          const records = selectedData.map((data, index) => ({
            id: `row_${data._rowIndex || index}`,
            ...data,
          }));

          console.log('[TemplatePreview] 设置记录数据:', records);
          setRecords(records);
          toast.success(`已获取 ${records.length} 条选中数据`);
        } else {
          console.log('[TemplatePreview] 未获取到数据');
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
      console.log('[TemplatePreview] 取消飞书监听');
      unsubscribe?.();
    };
  }, [isListening, setRecords, setIsFromFeishu]);

  // 处理模板选择
  const handleSelectTemplate = useCallback((template: Template) => {
    console.log('[TemplatePreview] 选择模板，模板详情:', {
      id: template.id,
      name: template.name,
      hasData: !!template.data,
      dataKeys: template.data ? Object.keys(template.data) : [],
      data: template.data,
      componentsCount: template.data?.components?.length || 0,
    });
    setSelectedTemplate(template);
    
    // 详细的调试信息
    const dataStr = template.data ? JSON.stringify(template.data).slice(0, 800) : '(empty)';
    const debugText = `选中模板: ${template.name}\n` +
      `模板ID: ${template.id}\n` +
      `有数据: ${!!template.data}\n` +
      `数据类型: ${typeof template.data}\n` +
      `数据内容: ${dataStr}`;
    setDebugInfo(debugText);
  }, []);

  // 处理编辑模板
  const handleEdit = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('请先选择一个模板');
      return;
    }
    console.log('[TemplatePreview] 编辑模板:', selectedTemplate.id);
    setCurrentTemplate(selectedTemplate);
    onEditTemplate?.(selectedTemplate);
  }, [selectedTemplate, setCurrentTemplate, onEditTemplate]);

  // 获取当前选中的模板
  const currentRecord = getCurrentRecord();
  console.log('[TemplatePreview] 当前记录:', currentRecord);

  // 提取模板中的变量
  const templateVariables = useMemo(() => {
    console.log('[TemplatePreview] 计算模板变量，selectedTemplate:', selectedTemplate?.id);
    if (!selectedTemplate || !selectedTemplate.data?.components) {
      console.log('[TemplatePreview] 没有模板数据或组件');
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
    console.log('[TemplatePreview] 打印当前页');
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
    console.log('[TemplatePreview] 批量打印，记录数:', records.length);
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
    const printContent = records.map((record, index) => {
      console.log(`[TemplatePreview] 生成打印页 ${index + 1}/${records.length}`);
      return `
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
    `}).join('');

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

  console.log('[TemplatePreview] 渲染，状态:', {
    templatesCount: templates.length,
    selectedTemplateId: selectedTemplate?.id,
    recordsCount: records.length,
    currentIndex,
    isListening,
    isFromFeishu,
  });

  return (
    <div className="flex h-full gap-4 p-4">
      {/* 左侧：模板列表 */}
      <Card className="w-80 flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            模板列表 ({templates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-2 p-4 pt-0">
              {templates.map((template) => (
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
              {/* 左侧：飞书监听开关 + 编辑按钮 */}
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

                {/* 编辑模板按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={!selectedTemplate}
                  className="ml-4"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  编辑模板
                </Button>
              </div>

              {/* 中间：数据导航 */}
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

              {/* 右侧：打印按钮 */}
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

            {/* 调试信息 */}
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-auto">
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
                {(() => {
                  console.log('[TemplatePreview] 渲染预览', {
                    hasTemplate: !!selectedTemplate,
                    hasData: !!selectedTemplate.data,
                    hasComponents: selectedTemplate.data?.components?.length || 0,
                    hasRecords: records.length > 0,
                    hasCurrentRecord: !!currentRecord
                  });

                  // 有组件时，显示它们
                  if (selectedTemplate.data?.components?.length > 0) {
                    // 如果有数据，替换变量；否则原样显示
                    const dataToUse = records.length > 0 && currentRecord ? currentRecord : {};
                    return selectedTemplate.data.components.map((component: any, idx: number) => {
                      console.log(`[TemplatePreview] 渲染组件 ${idx}:`, component.id, component.type);
                      return renderComponent(component, dataToUse);
                    });
                  }
                  
                  // 没有组件时
                  else {
                    return (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="font-medium">模板数据为空</p>
                          <p className="text-sm mt-1">请先在编辑器中添加组件</p>
                        </div>
                      </div>
                    );
                  }
                })()}
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
                  <h4 className="text-sm font-medium mb-2 text-gray-700">模板变量 ({templateVariables.length})</h4>
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
                    <h4 className="text-sm font-medium mb-2 text-gray-700">当前数据 (前10项)</h4>
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
