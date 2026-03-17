/**
 * 多选确认对话框组件
 * 
 * 功能：
 * 1. 显示选中记录数量
 * 2. 询问用户是否载入所有数据
 * 3. 提供确认/取消按钮
 */

'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface SelectionConfirmDialogProps {
  open: boolean;
  selectedCount: number;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SelectionConfirmDialog({
  open,
  selectedCount,
  isLoading,
  onConfirm,
  onCancel,
}: SelectionConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            📋 多选提示
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                已选中 <strong className="text-primary">{selectedCount}</strong> 条数据
              </p>
              <p>
                是否全部载入到排版画布？
              </p>
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在加载数据...</span>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>❌ 取消</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-primary text-primary-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                载入中...
              </>
            ) : (
              '✅ 确认载入'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
