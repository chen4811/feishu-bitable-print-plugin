import React, { useCallback } from 'react';
import { Trash2, Copy, Settings, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HoverToolbarProps {
  onEdit: (e?: React.MouseEvent) => void;
  onDelete: (e?: React.MouseEvent) => void;
  onCopy: (e?: React.MouseEvent) => void;
  isSelected?: boolean;
}

export const HoverToolbar: React.FC<HoverToolbarProps> = React.memo(({ onEdit, onDelete, onCopy, isSelected = false }) => {
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(e);
  }, [onEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(e);
  }, [onDelete]);

  const handleCopyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(e);
  }, [onCopy]);

  return (
    <div className={`transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
      <div className="flex items-center bg-white border rounded-lg shadow-lg px-2 py-1">
        {/* 主按钮：编辑表格 */}
        <Button
          variant="default"
          size="sm"
          className="h-7 px-2 bg-blue-500 hover:bg-blue-600 text-white"
          onClick={handleEditClick}
        >
          <span className="text-xs">编辑表格</span>
        </Button>
        
        <div className="flex-1" />
        
        {/* 操作按钮：从右到左排列 */}
        <div className="flex items-center gap-0.5">
          {/* 删除按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          
          {/* 组件属性按钮（禁用） */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            disabled
            title="组件属性"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
          
          {/* 复制按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopyClick}
            title="复制"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          
          {/* 隐藏按钮（禁用） */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            disabled
            title="隐藏"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

HoverToolbar.displayName = 'HoverToolbar';
