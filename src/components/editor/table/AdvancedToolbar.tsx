import React, { useState } from 'react';
import { 
  Layout, 
  Palette, 
  Grid,
  Check as CheckIcon,
  Square,
  Merge,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BorderSettingsPanel } from './BorderSettingsPanel';
import { AlignmentSettingsPanel } from './AlignmentSettingsPanel';

interface AdvancedToolbarProps {
  onMergeCells: () => void;
  selectedCellCount: number;
  onOpenHeaderFooterDialog: () => void;
  onBorderChange: (borderType: string) => void;
  onBorderWidthChange: (width: number) => void;
  borderWidth: number;
  onAlignmentChange: (align: 'top' | 'middle' | 'bottom') => void;
  verticalAlign: 'top' | 'middle' | 'bottom';
  onColorChange: (colorType: 'text' | 'fill', color: string) => void;
  onFinishEdit: () => void;
  onDeleteRows?: () => void;
  onDeleteColumns?: () => void;
}

export const AdvancedToolbar: React.FC<AdvancedToolbarProps> = React.memo(({
  onMergeCells,
  selectedCellCount,
  onOpenHeaderFooterDialog,
  onBorderChange,
  onBorderWidthChange,
  borderWidth,
  onAlignmentChange,
  verticalAlign,
  onColorChange,
  onFinishEdit,
  onDeleteRows,
  onDeleteColumns,
}) => {
  const [showBorderPanel, setShowBorderPanel] = useState(false);
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
          <Merge className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第三组：删除行/列 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDeleteRows}
          disabled={!onDeleteRows}
          className="h-8 w-8 disabled:opacity-50 text-destructive hover:text-destructive"
          title="删除选中行"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDeleteColumns}
          disabled={!onDeleteColumns}
          className="h-8 w-8 disabled:opacity-50 text-destructive hover:text-destructive"
          title="删除选中列"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第三组：表头表尾 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onOpenHeaderFooterDialog}
          className="h-8 w-8"
          title="表头表尾"
        >
          <Layout className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第四组：边框 */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowBorderPanel(!showBorderPanel)}
            className="h-8 w-8"
            title="边框"
          >
            <Grid className="w-4 h-4" />
          </Button>
          
          {/* 边框设置面板 */}
          {showBorderPanel && (
            <div className="absolute top-full left-0 mt-1 z-50">
              <BorderSettingsPanel
                borderWidth={borderWidth}
                onBorderChange={(type) => {
                  onBorderChange(type);
                  setShowBorderPanel(false);
                }}
                onBorderWidthChange={(width) => {
                  onBorderWidthChange(width);
                }}
              />
            </div>
          )}
        </div>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第五组：对齐 */}
        <AlignmentSettingsPanel
          verticalAlign={verticalAlign}
          onAlignmentChange={onAlignmentChange}
        />
        
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
