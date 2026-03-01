'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Printer,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Database,
} from 'lucide-react';
import { UserTemplate } from '@/store/templateStore';
import { useFeishuSDK } from '@/hooks/useFeishuSDK';

interface TemplatePreviewProps {
  template: UserTemplate;
  onBack: () => void;
  onEdit: () => void;
}

// 替换字段变量为实际值
function replaceFieldVariables(text: string, record: Record<string, any>): string {
  if (!text) return '';
  
  // 匹配 [字段名] 格式的占位符
  return text.replace(/\[([^\]]+)\]/g, (match, fieldName) => {
    const value = record[fieldName];
    return value !== undefined && value !== null ? String(value) : match;
  });
}

// 渲染组件为打印预览
function renderComponentForPrint(component: any, record: Record<string, any>): React.ReactNode {
  if (!component) return null;
  
  const content = (() => {
    switch (component.type) {
      case 'text':
        return replaceFieldVariables(component.text || '', record);
      case 'table':
        return `[表格: ${component.tableConfig?.rows || 0}x${component.tableConfig?.cols || 0}]`;
      case 'image':
        return component.src ? '[图片]' : '[图片占位符]';
      default:
        return component.text || component.content || '';
    }
  })();
  
  return (
    <div
      className="mb-4"
      style={{
        fontSize: component.style?.fontSize || 14,
        fontWeight: component.style?.fontWeight || 'normal',
        color: component.style?.color || '#000',
        textAlign: component.style?.textAlign || 'left',
      }}
    >
      {content}
    </div>
  );
}

export function TemplatePreview({ template, onBack, onEdit }: TemplatePreviewProps) {
  const { records, fields, isLoading, isFeishuEnvironment, fetchRecords, fetchFields } = useFeishuSDK();
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isAllSelected, setIsAllSelected] = useState(false);

  // 获取模板数据
  const templateData = template.data || {};
  const components = templateData.components || [];
  const pageConfig = templateData.pageConfig || { width: 210, height: 297, backgroundColor: '#ffffff' };

  // 加载飞书数据
  useEffect(() => {
    if (isFeishuEnvironment) {
      fetchRecords();
      fetchFields();
    }
  }, [isFeishuEnvironment, fetchRecords, fetchFields]);

  // 选择/取消选择记录
  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecordIds(prev => {
      const newSelection = prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId];
      setIsAllSelected(newSelection.length === records.length && records.length > 0);
      return newSelection;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRecordIds([]);
      setIsAllSelected(false);
    } else {
      setSelectedRecordIds(records.map(r => r.id as string));
      setIsAllSelected(true);
    }
  };

  // 获取当前预览的记录
  const selectedRecords = records.filter(r => selectedRecordIds.includes(r.id as string));
  const currentRecord = selectedRecords[currentPreviewIndex] || null;

  // 切换到上一条/下一条预览
  const goToPrev = () => {
    setCurrentPreviewIndex(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentPreviewIndex(prev => Math.min(selectedRecords.length - 1, prev + 1));
  };

  // 处理打印
  const handlePrint = () => {
    if (selectedRecordIds.length === 0) {
      alert('请先选择要打印的记录');
      return;
    }
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{template.name}</h1>
                <p className="text-xs text-gray-500">
                  {selectedRecordIds.length > 0 
                    ? `已选择 ${selectedRecordIds.length} 条记录，正在预览第 ${currentPreviewIndex + 1} 条`
                    : '请选择要打印的记录'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
            >
              编辑模板
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
              onClick={handlePrint}
              disabled={selectedRecordIds.length === 0}
            >
              <Printer className="w-4 h-4 mr-1" />
              打印 ({selectedRecordIds.length})
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：数据选择区域 */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col print:hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">数据选择</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={toggleSelectAll}
              >
                {isAllSelected ? (
                  <><CheckSquare className="w-4 h-4 mr-1" /> 取消全选</>
                ) : (
                  <><Square className="w-4 h-4 mr-1" /> 全选</>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              选择多维表格记录进行打印预览
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                加载数据中...
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无数据</p>
                <p className="text-xs mt-1">请在飞书多维表格中添加数据</p>
              </div>
            ) : (
              <div className="space-y-1">
                {records.map((record, index) => {
                  const recordId = record.id as string;
                  const isSelected = selectedRecordIds.includes(recordId);
                  // 获取第一个字段作为标题
                  const firstFieldValue = Object.values(record)[0] as string;
                  
                  return (
                    <div
                      key={recordId}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                        ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}
                      `}
                      onClick={() => toggleRecordSelection(recordId)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleRecordSelection(recordId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {firstFieldValue || `记录 ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          ID: {recordId?.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* 底部统计 */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">已选择</span>
              <Badge variant="secondary">{selectedRecordIds.length} / {records.length}</Badge>
            </div>
          </div>
        </div>

        {/* 右侧：打印预览区域 */}
        <div className="flex-1 bg-gray-100 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* 预览控制栏 */}
            {selectedRecords.length > 1 && (
              <div className="flex items-center justify-center gap-4 mb-4 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrev}
                  disabled={currentPreviewIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一条
                </Button>
                <span className="text-sm text-gray-600">
                  {currentPreviewIndex + 1} / {selectedRecords.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={currentPreviewIndex === selectedRecords.length - 1}
                >
                  下一条
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* A4 纸张预览 */}
            <Card 
              className="bg-white shadow-lg mx-auto"
              style={{
                width: `${pageConfig.width || 210}mm`,
                minHeight: `${pageConfig.height || 297}mm`,
                backgroundColor: pageConfig.backgroundColor || '#ffffff',
                padding: '20mm',
              }}
            >
              {currentRecord ? (
                <div className="space-y-4">
                  {components.map((component: any, index: number) => (
                    <div key={component.id || index}>
                      {renderComponentForPrint(component, currentRecord)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                  <FileText className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">请选择数据记录</p>
                  <p className="text-sm mt-1">从左侧选择要打印的记录进行预览</p>
                </div>
              )}
            </Card>

            {/* 打印提示 */}
            {selectedRecords.length === 0 && (
              <div className="text-center mt-8 text-gray-500 print:hidden">
                <p className="text-sm">提示：选择左侧的数据记录后，可以预览打印效果</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 打印时隐藏的提示 */}
      <div className="hidden print:block">
        <style>{`
          @media print {
            body { background: white; }
            .print\\:hidden { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
