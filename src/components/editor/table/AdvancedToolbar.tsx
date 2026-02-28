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
  Maximize2,
  Check,
  Merge,
  Split,
  PlusSquare,
  Trash2,
  Eraser,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

type ToolbarMode = 'initial' | 'editing' | 'selecting';

interface AdvancedToolbarProps {
  mode: ToolbarMode;
  selectedCellsCount: number;
  onCompleteEdit: () => void;
  onMergeCells?: () => void;
}

export const AdvancedToolbar: React.FC<AdvancedToolbarProps> = React.memo(({ 
  mode, 
  selectedCellsCount, 
  onCompleteEdit,
  onMergeCells 
}) => {
  // 初始编辑状态 - 仅显示基础功能
  const renderInitialMode = () => (
    <>
      {/* 完成编辑按钮 */}
      <Button
        variant="default"
        size="sm"
        className="h-8 bg-blue-500 hover:bg-blue-600 text-white gap-1"
        onClick={onCompleteEdit}
      >
        <Check className="w-4 h-4" />
        <span className="text-xs">完成编辑</span>
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

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

      {/* 初始组件 */}
      <Button variant="ghost" size="sm" className="h-8 gap-1" disabled>
        <PlusSquare className="w-4 h-4" />
        <span className="text-xs">初始组件</span>
      </Button>
    </>
  );

  // 文字编辑状态 - 显示完整功能
  const renderEditingMode = () => (
    <>
      {/* 完成编辑按钮 */}
      <Button
        variant="default"
        size="sm"
        className="h-8 bg-blue-500 hover:bg-blue-600 text-white gap-1"
        onClick={onCompleteEdit}
      >
        <Check className="w-4 h-4" />
        <span className="text-xs">完成编辑</span>
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 基础表格操作 */}
      <Button variant="ghost" size="icon" className="h-8 w-8" title="插入表格">
        <TableIcon className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" className="h-8 w-8" title="合并单元格" disabled={selectedCellsCount <= 1}>
        <Merge className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" className="h-8 w-8" title="拆分单元格">
        <Split className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 插入行列 */}
      <Button variant="ghost" size="icon" className="h-8 w-8" title="上方插入行">
        <span className="text-xs">↑</span>
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="下方插入行">
        <span className="text-xs">↓</span>
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="左侧插入列">
        <span className="text-xs">←</span>
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="右侧插入列">
        <span className="text-xs">→</span>
      </Button>

      <Button variant="ghost" size="icon" className="h-8 w-8" title="删除">
        <Trash2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 对齐 */}
      <Button variant="ghost" size="icon" className="h-8 w-8" title="左对齐">
        <AlignLeft className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="居中对齐">
        <AlignCenter className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="右对齐">
        <AlignRight className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 颜色 */}
      <Button variant="ghost" size="icon" className="h-8 w-8" title="颜色">
        <Palette className="w-4 h-4" />
      </Button>

      {/* 边框 */}
      <Button variant="ghost" size="icon" className="h-8 w-8" title="边框">
        <Box className="w-4 h-4" />
      </Button>

      {/* 清除格式 */}
      <Button variant="ghost" size="icon" className="h-8 w-8" title="清除格式">
        <Eraser className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 插入功能 */}
      <Button variant="ghost" size="icon" className="h-8 w-8" title="插入链接" disabled>
        <Link className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" className="h-8 w-8" title="插入二维码" disabled>
        <QrCode className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" className="h-8 w-8" title="插入条形码" disabled>
        <Barcode className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" className="h-8 w-8" title="插入附件" disabled>
        <Paperclip className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" className="h-8 w-8" title="插入文章" disabled>
        <FileText className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" className="h-8 w-8" title="插入图片" disabled>
        <ImageIcon className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" className="h-8 w-8" title="循环字段" disabled>
        <Repeat className="w-4 h-4" />
      </Button>

      <Button variant="ghost" size="icon" className="h-8 w-8" title="更多">
        <MoreHorizontal className="w-4 h-4" />
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
    </>
  );

  return (
    <div className="flex items-center gap-1 bg-gray-100 border-b p-2 flex-wrap">
      {mode === 'initial' ? renderInitialMode() : renderEditingMode()}
    </div>
  );
});

AdvancedToolbar.displayName = 'AdvancedToolbar';
