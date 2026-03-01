'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  Edit,
  FileText,
  Eye,
  Settings,
  Database,
  LayoutTemplate,
} from 'lucide-react';
import { UserTemplate } from '@/store/templateStore';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TemplatePreviewProps {
  template: UserTemplate;
  onBack: () => void;
  onEdit: () => void;
}

export function TemplatePreview({ template, onBack, onEdit }: TemplatePreviewProps) {
  console.log('[TemplatePreview] 渲染', template);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{template.name}</h1>
                  <p className="text-sm text-gray-500">
                    最后更新：{formatDistanceToNow(new Date(template.updatedAt), { 
                      addSuffix: true,
                      locale: zhCN 
                    })}
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              编辑模板
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 预览区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：模板预览 */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">模板预览</h2>
              </div>
              
              {/* 预览内容占位 */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 bg-white">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <LayoutTemplate className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">模板预览</h3>
                  <p className="text-gray-500 mb-4">
                    {template.description || '这是一个排版打印模板'}
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">点击"编辑模板"开始设计</span>
                  </div>
                </div>
              </div>

              {/* 模板信息 */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">创建时间</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(template.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">更新时间</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(template.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* 右侧：操作面板 */}
          <div className="space-y-6">
            {/* 快速操作 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
              <div className="space-y-3">
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={onEdit}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  编辑模板
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onBack}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回模板列表
                </Button>
              </div>
            </Card>

            {/* 模板设置 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">模板信息</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">模板名称</p>
                  <p className="text-sm font-medium text-gray-900">{template.name}</p>
                </div>
                {template.description && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">模板描述</p>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 mb-1">模板状态</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600">
                      可用
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 编辑步骤提示 */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">编辑步骤</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">数据源</p>
                    <p className="text-xs text-blue-700">连接飞书多维表格数据</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">组件</p>
                    <p className="text-xs text-blue-700">设计排版布局和内容</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">设置</p>
                    <p className="text-xs text-blue-700">配置打印和导出选项</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
