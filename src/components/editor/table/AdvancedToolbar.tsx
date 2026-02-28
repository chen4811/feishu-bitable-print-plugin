import React from 'react';
import { 
  CheckSquare, 
  TableCells, 
  Table, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Palette, 
  Link, 
  Image as ImageIcon, 
  FileText, 
  Paperclip, 
  Settings, 
  QrCode, 
  Barcode, 
  ChevronLeft,
  Check as CheckIcon,
  Grid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdvancedToolbarProps {
  onMergeCells: () => void;
  selectedCellCount: number;
  onHeaderFooterChange: (header: boolean, footer: boolean) => void;
  onBorderChange: (borderType: string) => void;
  onAlignmentChange: (alignment: 'left' | 'center' | 'right') => void;
  onColorChange: (colorType: 'text' | 'fill', color: string) => void;
  onInsertLink: () => void;
  onInsertQRCode: () => void;
  onInsertBarcode: () => void;
  onInsertImage: () => void;
  onInsertArticle: () => void;
  onInsertAttachment: () => void;
  onAdvancedConfig: () => void;
  onFinishEdit: () => void;
}

export const AdvancedToolbar: React.FC<AdvancedToolbarProps> = React.memo(({
  onMergeCells,
  selectedCellCount,
  onHeaderFooterChange,
  onBorderChange,
  onAlignmentChange,
  onColorChange,
  onInsertLink,
  onInsertQRCode,
  onInsertBarcode,
  onInsertImage,
  onInsertArticle,
  onInsertAttachment,
  onAdvancedConfig,
  onFinishEdit
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-1.5">
      <div className="flex items-center gap-0.5">
        {/* 第一组：返回/完成 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onFinishEdit}
          className="h-8 w-8 text-gray-500 hover:bg-gray-100 mr-1"
          title="完成编辑"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button 
          variant="default" 
          size="icon" 
          onClick={onFinishEdit}
          className="h-8 w-8 bg-blue-500 hover:bg-blue-600"
          title="保存更改"
        >
          <CheckIcon className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第二组：合并单元格 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">合并单元格</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第三组：表格 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onHeaderFooterChange(true, false)}
                className="h-8 w-8"
                title="表头"
              >
                <TableCells className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">表头</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onHeaderFooterChange(false, true)}
                className="h-8 w-8"
                title="表尾"
              >
                <Table className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">表尾</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第四组：边框 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onBorderChange('grid')}
                className="h-8 w-8"
                title="所有边框"
              >
                <Grid className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">所有边框</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第五组：对齐 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onAlignmentChange('left')}
                className="h-8 w-8"
                title="左对齐"
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">左对齐</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onAlignmentChange('center')}
                className="h-8 w-8"
                title="居中对齐"
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">居中对齐</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onAlignmentChange('right')}
                className="h-8 w-8"
                title="右对齐"
              >
                <AlignRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">右对齐</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第六组：颜色 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onColorChange('text', '#000000')}
                className="h-8 w-8"
                title="文字颜色"
              >
                <Palette className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">文字颜色</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第七组：插入 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onInsertLink}
                className="h-8 w-8"
                title="插入链接"
              >
                <Link className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">插入链接</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onInsertImage}
                className="h-8 w-8"
                title="插入图片"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">插入图片</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onInsertArticle}
                className="h-8 w-8"
                title="插入文章"
              >
                <FileText className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">插入文章</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onInsertAttachment}
                className="h-8 w-8"
                title="插入附件"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">插入附件</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onInsertQRCode}
                className="h-8 w-8"
                title="插入二维码"
              >
                <QrCode className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">插入二维码</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onInsertBarcode}
                className="h-8 w-8"
                title="插入条形码"
              >
                <Barcode className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">插入条形码</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="w-px h-5 bg-gray-200 mx-1" />
        
        {/* 第八组：高级设置 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onAdvancedConfig}
                className="h-8 w-8"
                title="高级设置"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">高级设置</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

AdvancedToolbar.displayName = 'AdvancedToolbar';
