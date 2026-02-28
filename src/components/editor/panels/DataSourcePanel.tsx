'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editorStore';
import { useFeishuSDK } from '@/hooks/useFeishuSDK';
import { Search, Plus, Copy, AlertCircle } from 'lucide-react';
import { Field } from '@/types/editor';

interface DataSourcePanelProps {
  onAddField: (field: Field) => void;
}

export function DataSourcePanel({ onAddField }: DataSourcePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'field' | 'system'>('field');
  
  const { fields, systemFields, isFeishuEnvironment } = useEditorStore();

  // 过滤字段
  const filteredFields = (activeTab === 'field' ? fields : systemFields).filter(
    (field) => field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyField = (field: Field) => {
    navigator.clipboard.writeText(field.placeholder);
  };

  const handleAddField = (field: Field) => {
    onAddField(field);
  };

  return (
    <div className="p-3 space-y-3">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">数据源</h3>
      </div>

      {/* 提示 */}
      {!isFeishuEnvironment && (
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            多维表格字段变量（演示）
          </p>
        </div>
      )}

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索字段"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* 标签切换 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'field' | 'system')}>
        <TabsList className="w-full h-8">
          <TabsTrigger value="field" className="text-xs flex-1">字段</TabsTrigger>
          <TabsTrigger value="system" className="text-xs flex-1">系统</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 字段列表 */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {filteredFields.map((field) => (
          <div
            key={field.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer group"
            onClick={() => handleAddField(field)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{field.name}</p>
              <p className="text-xs text-muted-foreground truncate">{field.placeholder}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyField(field);
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddField(field);
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}

        {/* 空状态 */}
        {filteredFields.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">暂无字段</p>
            <p className="text-xs mt-1">
              {searchQuery ? '未找到匹配的字段' : '请在飞书多维表格中使用'}
            </p>
          </div>
        )}
      </div>

      {/* 类型说明 */}
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-2">字段类型</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">文本</Badge>
          <Badge variant="outline" className="text-xs">数字</Badge>
          <Badge variant="outline" className="text-xs">日期</Badge>
          <Badge variant="outline" className="text-xs">单选</Badge>
          <Badge variant="outline" className="text-xs">多选</Badge>
          <Badge variant="outline" className="text-xs">附件</Badge>
        </div>
      </div>
    </div>
  );
}
