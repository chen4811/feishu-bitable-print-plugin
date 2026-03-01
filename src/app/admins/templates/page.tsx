'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  MoreHorizontal,
  Search,
  Eye,
  Copy,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function TemplatesPage() {
  const { templates, fetchTemplates, addTemplate, updateTemplate, deleteTemplate } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  // 加载模板列表
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 过滤模板
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    await addTemplate({
      name: formData.name,
      description: formData.description,
      config: {},
    });
    setFormData({ name: '', description: '' });
    setIsAddDialogOpen(false);
  };

  const handleEdit = async () => {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, {
        name: formData.name,
        description: formData.description,
      });
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个模板吗？')) {
      await deleteTemplate(id);
    }
  };

  const openEditDialog = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
    });
    setIsEditDialogOpen(true);
  };

  const openPreviewDialog = (template: any) => {
    setPreviewTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">模板管理</h1>
          <p className="text-muted-foreground">
            管理打印模板和预设
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新增模板
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增模板</DialogTitle>
              <DialogDescription>
                创建一个新的打印模板
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">模板名称</Label>
                <Input
                  id="name"
                  placeholder="请输入模板名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">模板描述</Label>
                <Textarea
                  id="description"
                  placeholder="请输入模板描述"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAdd}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 模板列表 */}
      <Card>
        <CardHeader>
          <CardTitle>模板列表</CardTitle>
          <CardDescription>
            共 {filteredTemplates.length} 个模板
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模板名称</TableHead>
                <TableHead>创建者</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>公开</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {template.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={template.userAvatar} alt={template.userName} />
                        <AvatarFallback>{template.userName?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{template.userName || '未知用户'}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {template.feishuUserId?.slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {template.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.isPublic ? 'default' : 'secondary'}>
                      {template.isPublic ? '是' : '否'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPreviewDialog(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          预览
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          复制
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 预览对话框 */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>模板预览</DialogTitle>
            <DialogDescription>
              {previewTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {previewTemplate ? (
              <div className="space-y-4">
                {/* 模板信息 */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">模板名称</p>
                    <p className="font-medium">{previewTemplate.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">创建者</p>
                    <p className="font-medium">{previewTemplate.userName || '未知用户'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">创建时间</p>
                    <p className="font-medium">{new Date(previewTemplate.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">更新时间</p>
                    <p className="font-medium">{new Date(previewTemplate.updatedAt).toLocaleString('zh-CN')}</p>
                  </div>
                </div>

                {/* 模板内容预览 */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">模板内容</h4>
                  {previewTemplate.data ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        组件数量: {previewTemplate.data.components?.length || 0}
                      </p>
                      <p className="text-sm text-gray-600">
                        页面尺寸: {previewTemplate.data.pageConfig?.width || 'A4'} x {previewTemplate.data.pageConfig?.height || 'A4'}
                      </p>
                      {/* 显示组件列表 */}
                      {previewTemplate.data.components && previewTemplate.data.components.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium">组件列表:</p>
                          {previewTemplate.data.components.map((comp: any, idx: number) => (
                            <div key={comp.id || idx} className="p-2 bg-gray-50 rounded text-sm">
                              <span className="font-medium">{comp.type || '未知类型'}</span>
                              {comp.text && (
                                <span className="text-gray-600 ml-2 truncate">
                                  : {comp.text.substring(0, 50)}{comp.text.length > 50 ? '...' : ''}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">空模板（没有组件）</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">没有模板数据</p>
                  )}
                </div>

                {/* 原始数据（调试用，可折叠） */}
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">查看原始数据</summary>
                  <pre className="mt-2 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(previewTemplate, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-center text-gray-500">加载中...</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPreviewDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
