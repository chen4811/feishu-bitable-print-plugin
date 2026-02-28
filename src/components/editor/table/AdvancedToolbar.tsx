import React from 'react';
import { 
  Table as TableIcon, 
  Box, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Palette, 
  Link, 
  QrCode, 
  Barcode, 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  Repeat, 
  Maximize2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface AdvancedToolbarProps {
  selectedCellsCount: number;
  onMergeCells?: () => void;
}

export const AdvancedToolbar: React.FC<AdvancedToolbarProps> = React.memo(({ 
  selectedCellsCount, 
  onMergeCells 
}) => {
  return (
    <div className="flex items-center gap-1 bg-white border-b p-2 flex-wrap">
      {/* 表头/表尾 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <TableIcon className="w-4 h-4" />
            <span className="text-xs">表头/表尾</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>设置表头行数</DropdownMenuItem>
          <DropdownMenuItem>设置表尾行数</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 边框 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <Box className="w-4 h-4" />
            <span className="text-xs">边框</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>边框颜色</DropdownMenuItem>
          <DropdownMenuItem>边框宽度</DropdownMenuItem>
          <DropdownMenuItem>显示/隐藏边框</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 对齐 */}
      <div className="flex items-center gap-0 border rounded-md">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none">
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-x-0">
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none">
          <AlignRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 颜色 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <Palette className="w-4 h-4" />
            <span className="text-xs">颜色</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>文字颜色</DropdownMenuItem>
          <DropdownMenuItem>背景颜色</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 插入链接 */}
      <Button variant="ghost" size="sm" className="h-8 gap-1" disabled>
        <Link className="w-4 h-4" />
        <span className="text-xs">插入链接</span>
      </Button>

      {/* 插入二维码 */}
      <Button variant="ghost" size="sm" className="h-8 gap-1" disabled>
        <QrCode className="w-4 h-4" />
        <span className="text-xs">插入二维码</span>
      </Button>

      {/* 插入条形码 */}
      <Button variant="ghost" size="sm" className="h-8 gap-1" disabled>
        <Barcode className="w-4 h-4" />
        <span className="text-xs">插入条形码</span>
      </Button>

      {/* 插入附件列表/图片 */}
      <Button variant="ghost" size="sm" className="h-8 gap-1" disabled>
        <Paperclip className="w-4 h-4" />
        <span className="text-xs">插入附件</span>
      </Button>

      {/* 插入文章 */}
      <Button variant="ghost" size="sm" className="h-8 gap-1" disabled>
        <FileText className="w-4 h-4" />
        <span className="text-xs">插入文章</span>
      </Button>

      {/* 插入图片 */}
      <Button variant="ghost" size="sm" className="h-8 gap-1" disabled>
        <ImageIcon className="w-4 h-4" />
        <span className="text-xs">插入图片</span>
      </Button>

      {/* 循环字段高级配置 */}
      <Button variant="ghost" size="sm" className="h-8 gap-1" disabled>
        <Repeat className="w-4 h-4" />
        <span className="text-xs">循环字段</span>
      </Button>

      {/* 条件渲染：合并单元格按钮 */}
      {selectedCellsCount > 1 && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <Button 
            variant="default" 
            size="sm" 
            className="h-8 gap-1 bg-primary"
            onClick={onMergeCells}
          >
            <Maximize2 className="w-4 h-4" />
            <span className="text-xs">合并单元格</span>
          </Button>
        </>
      )}
    </div>
  );
});

AdvancedToolbar.displayName = 'AdvancedToolbar';
