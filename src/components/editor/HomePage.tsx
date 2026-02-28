'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  FileText, 
  Table, 
  Upload, 
  FileSpreadsheet, 
  Presentation,
  Star,
  Crown,
  ChevronRight,
  Search,
  Sparkles
} from 'lucide-react';
import { presetTemplates, templateCategories } from '@/data/presetTemplates';
import { PresetTemplate } from '@/types/editor';

interface HomePageProps {
  onCreateNew: () => void;
  onSelectTemplate: (template: PresetTemplate) => void;
}

// 创建方式卡片
const createOptions = [
  {
    icon: Plus,
    title: '创建排版',
    description: '空白自定义排版',
    action: 'create',
  },
  {
    icon: Table,
    title: '自动生成表格排版',
    description: '基于表格数据生成',
    action: 'auto-table',
  },
  {
    icon: Upload,
    title: '导入排版',
    description: '导入已有排版文件',
    action: 'import',
  },
  {
    icon: FileText,
    title: '创建文档模板',
    description: 'Word格式模板',
    action: 'docx',
  },
  {
    icon: FileSpreadsheet,
    title: '创建表格模板',
    description: 'Excel格式模板',
    action: 'excel',
  },
  {
    icon: Presentation,
    title: '创建幻灯片模板',
    description: 'PPT格式模板',
    action: 'ppt',
  },
];

export function HomePage({ onCreateNew, onSelectTemplate }: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤模板
  const filteredTemplates = presetTemplates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateAction = (action: string) => {
    if (action === 'create' || action === 'auto-table') {
      onCreateNew();
    } else {
      // TODO: 实现其他创建方式
      alert(`${action} 功能开发中...`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold">排版打印</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              高级版
            </Button>
            <Button size="sm" onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-1" />
              创建排版
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 欢迎区域 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">把多维表格的数据快速转化为各类文档、单据、合同</h2>
          <p className="text-muted-foreground">
            已为用户生成 <span className="text-primary font-semibold">2,892,874</span> 份文件
            <Button variant="link" className="p-0 ml-2 h-auto">查看最佳实践案例</Button>
          </p>
        </div>

        {/* 创建方式卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {createOptions.map((option) => (
            <Card
              key={option.action}
              className="p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group"
              onClick={() => handleCreateAction(option.action)}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <option.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{option.title}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 模板选择区域 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">从模版开始</h3>
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              还没有使用过排版打印？强烈建议从模版开始
            </Badge>
          </div>

          {/* 搜索和分类 */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="h-9">
                {templateCategories.slice(0, 8).map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs px-3">
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* 模板网格 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all group overflow-hidden"
                onClick={() => onSelectTemplate(template)}
              >
                {/* 缩略图 */}
                <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                  </div>
                  {/* 格式标签 */}
                  <Badge className="absolute bottom-2 right-2 text-xs" variant="secondary">
                    {template.format}
                  </Badge>
                  {/* 高级标签 */}
                  {template.isPremium && (
                    <div className="absolute top-2 left-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                    </div>
                  )}
                  {/* Hover 遮罩 */}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button size="sm" variant="secondary">
                      使用模板
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
                {/* 模板信息 */}
                <div className="p-3">
                  <h4 className="font-medium text-sm truncate">{template.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* 空状态 */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">没有找到匹配的模板</p>
            </div>
          )}
        </div>
      </main>

      {/* 底部信息 */}
      <footer className="border-t mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span>高级版</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="link" size="sm" className="text-muted-foreground">
              快速指南
            </Button>
            <Button variant="link" size="sm" className="text-muted-foreground">
              帮助中心
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
