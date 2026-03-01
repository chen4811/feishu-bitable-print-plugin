'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit,
  FileText,
  Eye,
  LayoutTemplate,
  Type,
  Table as TableIcon,
  Image as ImageIcon,
  BarChart3,
} from 'lucide-react';
import { UserTemplate } from '@/store/templateStore';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TemplatePreviewProps {
  template: UserTemplate;
  onBack: () => void;
  onEdit: () => void;
}

// 组件类型图标
const componentIcons: Record<string, React.ReactNode> = {
  text: <Type className="w-4 h-4" />,
  table: <TableIcon className="w-4 h-4" />,
  image: <ImageIcon className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
};

// 渲染组件内容（显示占位符而非实际值）
function renderComponentContent(component: any): string {
  if (!component) return '';
  
  // 如果是文本组件
  if (component.type === 'text' || component.text !== undefined) {
    const text = component.text || component.content || '';
    // 返回原始文本（包含占位符），不做替换
    return text;
  }
  
  // 表格组件
  if (component.type === 'table' || component.tableConfig) {
    const rows = component.tableConfig?.rows || component.rows || 0;
    const cols = component.tableConfig?.cols || component.cols || 0;
    return `表格 (${rows}x${cols})`;
  }
  
  // 图片组件
  if (component.type === 'image') {
    return component.src ? '图片' : '图片占位符';
  }
  
  return '未知组件';
}

export function TemplatePreview({ template, onBack, onEdit }: TemplatePreviewProps) {
  console.log('[TemplatePreview] 渲染', template);

  // 解析模板数据
  const templateData = template.data || {};
  const components = templateData.components || [];
  const pageConfig = templateData.pageConfig || {};
  const hasContent = components.length > 0;

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
                {hasContent && (
                  <Badge variant="secondary" className="ml-2">
                    {components.length} 个组件
                  </Badge>
                )}
              </div>
              
              {hasContent ? (
                // 有内容时显示实际预览
                <div 
                  className="border border-gray-200 rounded-lg bg-white overflow-auto"
                  style={{
                    minHeight: '400px',
                    maxHeight: '600px',
                  }}
                >
                  {/* 页面容器 */}
                  <div 
                    className="mx-auto p-8"
                    style={{
                      width: pageConfig.width ? `${pageConfig.width}px` : '210mm',
                      minHeight: pageConfig.height ? `${pageConfig.height}px` : '297mm',
                      backgroundColor: pageConfig.backgroundColor || '#ffffff',
                    }}
                  >
                    {/* 组件列表 */}
                    <div className="space-y-4">
                      {components.map((component: any, index: number) => (
                        <div
                          key={component.id || index}
                          className="p-4 border border-dashed border-gray-300 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2 text-gray-500">
                            {componentIcons[component.type] || <LayoutTemplate className="w-4 h-4" />}
                            <span className="text-xs font-medium uppercase">{component.type || '组件'}</span>
                          </div>
                          <div className="text-gray-800 whitespace-pre-wrap">
                            {renderComponentContent(component)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // 空模板时显示占位
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 bg-white">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <LayoutTemplate className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">空模板</h3>
                    <p className="text-gray-500 mb-4">
                      {template.description || '这是一个空模板，还没有添加任何内容'}
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium">点击"编辑模板"开始设计</span>
                    </div>
                  </div>
                </div>
              )}

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

            {/* 模板统计 */}
            {hasContent && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">模板统计</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">组件总数</span>
                    <span className="text-sm font-medium text-gray-900">{components.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">文本组件</span>
                    <span className="text-sm font-medium text-gray-900">
                      {components.filter((c: any) => c.type === 'text').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">表格组件</span>
                    <span className="text-sm font-medium text-gray-900">
                      {components.filter((c: any) => c.type === 'table').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">图片组件</span>
                    <span className="text-sm font-medium text-gray-900">
                      {components.filter((c: any) => c.type === 'image').length}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* 页面配置 */}
            {pageConfig && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">页面配置</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">页面尺寸</span>
                    <span className="text-sm font-medium text-gray-900">
                      {pageConfig.width ? `${pageConfig.width}x${pageConfig.height}px` : 'A4 (默认)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">背景颜色</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border border-gray-200"
                        style={{ backgroundColor: pageConfig.backgroundColor || '#ffffff' }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {pageConfig.backgroundColor || '#ffffff'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* 模板信息 */}
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
                {template.isPublic !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">公开状态</p>
                    <Badge variant={template.isPublic ? "default" : "secondary"}>
                      {template.isPublic ? '公开' : '私有'}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
