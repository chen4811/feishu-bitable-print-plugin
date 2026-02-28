import React from 'react';
import { 
  CheckSquare, 
  Layout, 
  Table, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Palette, 
  Grid,
  Check as CheckIcon,
  Square,
  Minus,
  Columns,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdvancedToolbarProps {
  onMergeCells: () => void;
  selectedCellCount: number;
  onHeaderFooterChange: (header: boolean, footer: boolean) => void;
  onBorderChange: (borderType: string) => void;
  onAlignmentChange: (alignment: 'left' | 'center' | 'right') => void;
  onColorChange: (colorType: 'text' | 'fill', color: string) => void;
  onFinishEdit: () => void;
}

export const AdvancedToolbar: React.FC<AdvancedToolbarProps> = React.memo(({
  onMergeCells,
  selectedCellCount,
  onHeaderFooterChange,
  onBorderChange,
  onAlignmentChange,
  onColorChange,
  onFinishEdit
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-1.5">
      <div className="flex items-center gap-0.5">
        {/* 第一组：完成编辑 */}
        <Button 
          variant="default" 
          size="icon" 
          onClick={onFinishEdit}
          className="h-8 w-8 bg-blue-500 hover:bg-blue-600"
          title="完成编辑"
        >
          <CheckIcon className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第二组：合并单元格 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onMergeCells}
          disabled={selectedCellCount < 2}
          className="h-8 w-8 disabled:opacity-50"
          title="合并单元格"
        >
          <CheckSquare className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第三组：表头表尾 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onHeaderFooterChange(true, false)}
          className="h-8 w-8"
          title="表头"
        >
          <Layout className="w-4 h-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onHeaderFooterChange(false, true)}
          className="h-8 w-8"
          title="表尾"
        >
          <Table className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第四组：边框 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onBorderChange('all')}
          className="h-8 w-8"
          title="所有边框"
        >
          <Grid className="w-4 h-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onBorderChange('horizontal')}
          className="h-8 w-8"
          title="水平边框"
        >
          <Minus className="w-4 h-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onBorderChange('vertical')}
          className="h-8 w-8"
          title="垂直边框"
        >
          <Columns className="w-4 h-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onBorderChange('none')}
          className="h-8 w-8"
          title="无边框"
        >
          <X className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第五组：对齐 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onAlignmentChange('left')}
          className="h-8 w-8"
          title="左对齐"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onAlignmentChange('center')}
          className="h-8 w-8"
          title="居中对齐"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onAlignmentChange('right')}
          className="h-8 w-8"
          title="右对齐"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第六组：颜色 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onColorChange('text', '#000000')}
          className="h-8 w-8"
          title="文字颜色"
        >
          <Palette className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

AdvancedToolbar.displayName = 'AdvancedToolbar';
