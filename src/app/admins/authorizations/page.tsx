'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  RefreshCw,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// 授权码掩码显示
function maskToken(token: string): string {
  if (!token || token.length < 8) return '***';
  return token.slice(0, 4) + '****' + token.slice(-4);
}

export default function AuthorizationsPage() {
  const { authorizations, fetchAuthorizations, updateAuthorization, deleteAuthorization } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewToken, setViewToken] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // 页面加载时获取授权码数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAuthorizations();
      setIsLoading(false);
    };
    loadData();
  }, [fetchAuthorizations]);

  // 过滤授权码
  const filteredAuthorizations = authorizations.filter((auth) =>
    auth.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    auth.feishuUserId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchAuthorizations();
    setIsLoading(false);
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await updateAuthorization(id, { isActive: !isActive });
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个授权码吗？此操作不可恢复。')) {
      setDeletingId(id);
      await deleteAuthorization(id);
      setDeletingId(null);
    }
  };

  const handleViewToken = (token: string) => {
    setViewToken(token);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">授权码管理</h1>
          <p className="text-muted-foreground">
            管理用户的飞书多维表格授权码配置
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索表格名称、ID、用户名或飞书用户ID..."
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">加载中...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户信息</TableHead>
                  <TableHead>飞书ID</TableHead>
                  <TableHead>授权码</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最后使用</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuthorizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无授权码数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAuthorizations.map((auth) => (
                    <TableRow key={auth.id}>
                      {/* 用户信息 */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={auth.userAvatar} alt={auth.userName} />
                            <AvatarFallback>{auth.userName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{auth.userName || '未知用户'}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {auth.feishuUserId?.slice(0, 16)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* 飞书ID */}
                      <TableCell className="font-mono text-sm">
                        {auth.feishuUserId || '-'}
                      </TableCell>

                      {/* 授权码（掩码显示） */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">
                            {maskToken(auth.appTokenEncrypted)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleViewToken(auth.appTokenEncrypted)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* 状态 */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={auth.isActive}
                            onCheckedChange={() => handleToggleActive(auth.id, auth.isActive)}
                          />
                          <Badge variant={auth.isActive ? 'default' : 'secondary'}>
                            {auth.isActive ? '启用' : '禁用'}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* 最后使用 */}
                      <TableCell className="text-sm text-muted-foreground">
                        {auth.lastUsedAt ? new Date(auth.lastUsedAt).toLocaleString() : '从未使用'}
                      </TableCell>

                      {/* 创建时间 */}
                      <TableCell className="text-sm text-muted-foreground">
                        {auth.createdAt ? new Date(auth.createdAt).toLocaleString() : '-'}
                      </TableCell>

                      {/* 操作 */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleActive(auth.id, auth.isActive)}>
                              {auth.isActive ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  停用
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  启用
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(auth.id)}
                              disabled={deletingId === auth.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {deletingId === auth.id ? '删除中...' : '删除'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 查看授权码对话框 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>查看授权码</DialogTitle>
            <DialogDescription>
              完整授权码信息（请妥善保管，不要泄露）
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg">
              <code className="text-sm break-all font-mono">{viewToken}</code>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
