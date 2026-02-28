import React, { useCallback } from 'react';
import { Trash2, Copy, Settings, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HoverToolbarProps {
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

export const HoverToolbar: React.FC<HoverToolbarProps> = React.memo(({ onEdit, onDelete, onCopy }) => {
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  }, [onEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  const handleCopyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
  }, [onCopy]);

  return (
    <div className="absolute top-0 left-0 right-0 -translate-y-full mb-2 z-20">
      <div 
        className="flex items-center gap-2 bg-white border rounded-lg shadow-lg px-3 py-2"
        onClick={handleEditClick}
      >
        {/* 主文本：编辑表格 */}
        <span className="text-sm font-medium cursor-pointer hover:text-primary">
          编辑表格
        </span>
        
        <div className="flex-1" />
        
        {/* 操作按钮：从右到左排列 */}
        <div className="flex items-center gap-1">
          {/* 隐藏按钮（禁用） */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            disabled
            title="隐藏"
          >
            <EyeOff className="w-4 h-4" />
          </Button>
          
          {/* 复制按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopyClick}
            title="复制"
          >
            <Copy className="w-4 h-4" />
          </Button>
          
          {/* 组件属性按钮（禁用） */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            disabled
            title="组件属性"
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          {/* 删除按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

HoverToolbar.displayName = 'HoverToolbar';
