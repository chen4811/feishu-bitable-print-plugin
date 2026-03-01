'use client';

import { useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Key,
  MoreHorizontal,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function AuthorizationsPage() {
  const { authorizations, addAuthorization, updateAuthorization, deleteAuthorization } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<any>(null);
  const [formData, setFormData] = useState({
    tableId: '',
    tableName: '',
    appToken: '',
  });

  // 过滤授权码
  const filteredAuthorizations = authorizations.filter((auth) =>
    auth.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    auth.tableId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    await addAuthorization(formData);
    setFormData({ tableId: '', tableName: '', appToken: '' });
    setIsAddDialogOpen(false);
  };

  const handleEdit = async () => {
    if (editingAuth) {
      await updateAuthorization(editingAuth.tableId, {
        tableName: formData.tableName,
        appToken: formData.appToken,
      });
      setIsEditDialogOpen(false);
      setEditingAuth(null);
    }
  };

  const handleDelete = async (tableId: string) => {
    if (confirm('确定要删除这个授权码吗？')) {
      await deleteAuthorization(tableId);
    }
  };

  const handleToggleActive = async (tableId: string, isActive: boolean) => {
    await updateAuthorization(tableId, { isActive: !isActive });
  };

  const openEditDialog = (auth: any) => {
    setEditingAuth(auth);
    setFormData({
      tableId: auth.tableId,
      tableName: auth.tableName,
      appToken: '', // 不显示已加密的 token
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">授权码管理</h1>
          <p className="text-muted-foreground">
            管理飞书多维表格的授权码配置
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新增授权码
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增授权码</DialogTitle>
              <DialogDescription>
                添加一个新的飞书多维表格授权码配置
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tableId">表格 ID</Label>
                <Input
                  id="tableId"
                  placeholder="请输入表格 ID"
                  value={formData.tableId}
                  onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableName">表格名称</Label>
                <Input
                  id="tableName"
                  placeholder="请输入表格名称"
                  value={formData.tableName}
                  onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appToken">App Token</Label>
                <Input
                  id="appToken"
                  type="password"
                  placeholder="请输入 App Token"
                  value={formData.appToken}
                  onChange={(e) => setFormData({ ...formData, appToken: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAdd}>添加</Button>
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
              placeholder="搜索授权码..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 授权码列表 */}
      <Card>
        <CardHeader>
          <CardTitle>授权码列表</CardTitle>
          <CardDescription>
            共 {filteredAuthorizations.length} 个授权码配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>表格名称</TableHead>
                <TableHead>表格 ID</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最后使用</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuthorizations.map((auth) => (
                <TableRow key={auth.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      {auth.tableName}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{auth.tableId}</TableCell>
                  <TableCell>
                    <Badge variant={auth.isActive ? 'default' : 'secondary'}>
                      {auth.isActive ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {auth.isActive ? '活跃' : '未激活'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {auth.lastUsedAt ? new Date(auth.lastUsedAt).toLocaleString() : '从未使用'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(auth.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleActive(auth.tableId, auth.isActive)}>
                          {auth.isActive ? '停用' : '激活'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(auth)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(auth.tableId)}
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

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑授权码</DialogTitle>
            <DialogDescription>
              修改授权码配置信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tableName">表格名称</Label>
              <Input
                id="edit-tableName"
                value={formData.tableName}
                onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-appToken">新的 App Token（留空则不修改）</Label>
              <Input
                id="edit-appToken"
                type="password"
                placeholder="请输入新的 App Token"
                value={formData.appToken}
                onChange={(e) => setFormData({ ...formData, appToken: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
