'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Key,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LICENSE_DURATIONS, type LicenseType, formatLicenseCode } from '@/lib/license-utils';

interface License {
  id: number;
  code: string;
  type: LicenseType;
  duration_days: number;
  status: 'unused' | 'active' | 'expired' | 'revoked';
  created_by: string;
  created_at: string;
  bound_user_id?: string;
  bound_user_name?: string;
  bound_at?: string;
  valid_until?: string;
  days_remaining?: number;
  is_expired?: boolean;
}

interface LicenseManagerProps {
  adminToken: string;
}

/**
 * 管理员授权码管理面板
 */
export function LicenseManager({ adminToken }: LicenseManagerProps) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // 生成授权码表单状态
  const [generateCount, setGenerateCount] = useState(10);
  const [generateType, setGenerateType] = useState<LicenseType>('month');
  const [generatePrefix, setGeneratePrefix] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // 加载授权码列表
  const loadLicenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/admin/licenses', window.location.origin);
      if (filterStatus !== 'all') {
        url.searchParams.set('status', filterStatus);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '加载失败');
      }
      
      setLicenses(result.data);
    } catch (err) {
      console.error('[LicenseManager] 加载授权码失败:', err);
      setError(err instanceof Error ? err.message : '加载授权码列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, filterStatus]);

  // 初始加载
  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  // 生成授权码
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          count: generateCount,
          type: generateType,
          prefix: generatePrefix,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '生成失败');
      }
      
      setGeneratedCodes(result.data.codes);
      loadLicenses(); // 刷新列表
    } catch (err) {
      console.error('[LicenseManager] 生成授权码失败:', err);
      setError(err instanceof Error ? err.message : '生成授权码失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 作废授权码
  const handleRevoke = async (id: number) => {
    if (!confirm('确定要作废此授权码吗？')) return;
    
    try {
      const response = await fetch(`/api/admin/licenses?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '作废失败');
      }
      
      loadLicenses(); // 刷新列表
    } catch (err) {
      console.error('[LicenseManager] 作废授权码失败:', err);
      setError(err instanceof Error ? err.message : '作废授权码失败');
    }
  };

  // 复制到剪贴板
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    // 可以添加 toast 提示
  };

  // 导出授权码
  const handleExport = () => {
    const unusedLicenses = licenses.filter(l => l.status === 'unused');
    const content = unusedLicenses.map(l => formatLicenseCode(l.code)).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `授权码列表_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取状态显示
  const getStatusBadge = (status: string, isExpired?: boolean) => {
    const styles: Record<string, string> = {
      unused: 'bg-gray-100 text-gray-700',
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      revoked: 'bg-orange-100 text-orange-700',
    };
    
    const labels: Record<string, string> = {
      unused: '未使用',
      active: '使用中',
      expired: '已过期',
      revoked: '已作废',
    };
    
    return (
      <Badge variant="outline" className={cn(styles[status] || styles.unused)}>
        {labels[status] || status}
      </Badge>
    );
  };

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            授权码管理
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!licenses.some(l => l.status === 'unused')}
            >
              <Download className="h-4 w-4 mr-1" />
              导出未使用
            </Button>
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  生成授权码
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>生成授权码</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>生成数量</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={generateCount}
                      onChange={(e) => setGenerateCount(Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>有效期</Label>
                    <Select value={generateType} onValueChange={(v) => setGenerateType(v as LicenseType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LICENSE_DURATIONS.map(d => (
                          <SelectItem key={d.type} value={d.type}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>前缀（可选）</Label>
                    <Input
                      placeholder="如：VIP"
                      value={generatePrefix}
                      onChange={(e) => setGeneratePrefix(e.target.value.toUpperCase())}
                      maxLength={10}
                    />
                  </div>
                  
                  {generatedCodes.length > 0 && (
                    <div className="space-y-2">
                      <Label>生成的授权码</Label>
                      <div className="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
                        {generatedCodes.map((code, index) => (
                          <div key={index} className="font-mono text-sm py-1">
                            {code}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedCodes.join('\n'));
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        复制全部
                      </Button>
                    </div>
                  )}
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        生成授权码
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 筛选器 */}
        <div className="flex gap-2 mb-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="unused">未使用</SelectItem>
              <SelectItem value="active">使用中</SelectItem>
              <SelectItem value="expired">已过期</SelectItem>
              <SelectItem value="revoked">已作废</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={loadLicenses}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* 统计 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-muted p-3 rounded-md text-center">
            <div className="text-2xl font-bold">{licenses.length}</div>
            <div className="text-xs text-muted-foreground">总计</div>
          </div>
          <div className="bg-muted p-3 rounded-md text-center">
            <div className="text-2xl font-bold text-green-600">
              {licenses.filter(l => l.status === 'unused').length}
            </div>
            <div className="text-xs text-muted-foreground">未使用</div>
          </div>
          <div className="bg-muted p-3 rounded-md text-center">
            <div className="text-2xl font-bold text-blue-600">
              {licenses.filter(l => l.status === 'active').length}
            </div>
            <div className="text-xs text-muted-foreground">使用中</div>
          </div>
          <div className="bg-muted p-3 rounded-md text-center">
            <div className="text-2xl font-bold text-orange-600">
              {licenses.filter(l => l.status === 'expired' || l.status === 'revoked').length}
            </div>
            <div className="text-xs text-muted-foreground">失效</div>
          </div>
        </div>
        
        {/* 列表 */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>授权码</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>绑定用户</TableHead>
                <TableHead>到期时间</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    暂无授权码
                  </TableCell>
                </TableRow>
              ) : (
                licenses.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell className="font-mono">
                      {formatLicenseCode(license.code)}
                    </TableCell>
                    <TableCell>{license.duration_days}天</TableCell>
                    <TableCell>{getStatusBadge(license.status, license.is_expired)}</TableCell>
                    <TableCell>
                      {license.bound_user_name || '-'}
                      {license.bound_user_id && (
                        <div className="text-xs text-muted-foreground">
                          {license.bound_user_id.substring(0, 20)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {license.valid_until ? (
                        <span className={cn(
                          license.days_remaining !== undefined && license.days_remaining <= 7 && 
                            license.days_remaining > 0 && "text-orange-600"
                        )}>
                          {formatDate(license.valid_until)}
                          {license.days_remaining !== undefined && (
                            <span className="text-xs ml-1">
                              ({license.days_remaining}天)
                            </span>
                          )}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(license.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {license.status !== 'revoked' && license.status !== 'expired' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevoke(license.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default LicenseManager;
