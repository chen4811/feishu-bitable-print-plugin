'use client';

import React, { useCallback } from 'react';
import {
  Table,
  Grid,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Link,
  QrCode,
  Barcode,
  Image as ImageIcon,
  FileText,
  Settings,
  Merge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdvancedToolbarProps {
  onMergeCells?: () => void;
  selectedCellCount?: number;
  onHeaderFooterChange?: (headerRows: number, footerRows: number) => void;
  onBorderChange?: (hasBorder: boolean) => void;
  onAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  onColorChange?: (color: string) => void;
  onInsertLink?: () => void;
  onInsertQRCode?: () => void;
  onInsertBarcode?: () => void;
  onInsertImage?: () => void;
  onInsertArticle?: () => void;
  onInsertAttachment?: () => void;
  onAdvancedConfig?: () => void;
  onFinishEdit?: () => void;
}

export const AdvancedToolbar: React.FC<AdvancedToolbarProps> = React.memo(({
  onMergeCells,
  selectedCellCount = 0,
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
  onFinishEdit,
}) => {
  const handleHeaderFooterClick = useCallback(() => {
    // 默认设置 1 行表头，0 行表尾
    onHeaderFooterChange?.(1, 0);
  }, [onHeaderFooterChange]);

  const handleMergeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMergeCells?.();
  }, [onMergeCells]);

  return (
    <div className="w-full bg-white border-b rounded-t-lg px-2 py-1 shadow-sm">
      <div className="flex items-center gap-0.5 flex-wrap">
        {/* 表头/表尾 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
              <Table className="w-3.5 h-3.5" />
              <span className="text-xs">表头/表尾</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onHeaderFooterChange?.(1, 0)}>
              1 行表头
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHeaderFooterChange?.(2, 0)}>
              2 行表头
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHeaderFooterChange?.(0, 1)}>
              1 行表尾
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHeaderFooterChange?.(0, 0)}>
              无表头表尾
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />

        {/* 边框 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2"
          onClick={() => onBorderChange?.(true)}
        >
          <Square className="w-3.5 h-3.5" />
          <span className="text-xs">边框</span>
        </Button>

        <Separator orientation="vertical" className="h-5" />

        {/* 对齐 */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAlignmentChange?.('left')}
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAlignmentChange?.('center')}
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAlignmentChange?.('right')}
          >
            <AlignRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* 颜色 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
              <Palette className="w-3.5 h-3.5" />
              <span className="text-xs">颜色</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <div className="grid grid-cols-5 gap-1 p-2">
              {['#ffffff', '#f3f4f6', '#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#fee2e2', '#e0e7ff', '#fef9c3', '#dcfce7'].map((color) => (
                <DropdownMenuItem key={color} onClick={() => onColorChange?.(color)}>
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: color }}
                  />
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuItem onClick={() => onColorChange?.('transparent')}>
              透明
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />

        {/* 插入功能 */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onInsertLink}
            title="插入链接"
          >
            <Link className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onInsertQRCode}
            title="插入二维码"
          >
            <QrCode className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onInsertBarcode}
            title="插入条形码"
          >
            <Barcode className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onInsertAttachment}
            title="插入附件列表"
          >
            <FileText className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onInsertArticle}
            title="插入文章"
          >
            <FileText className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onInsertImage}
            title="插入图片"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* 循环字段高级配置 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2"
          onClick={onAdvancedConfig}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="text-xs">循环字段高级配置</span>
        </Button>

        {/* 合并单元格 - 条件显示 */}
        {selectedCellCount > 1 && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant="default"
              size="sm"
              className="h-7 gap-1 px-2 bg-blue-500 hover:bg-blue-600"
              onClick={handleMergeClick}
            >
              <Merge className="w-3.5 h-3.5" />
              <span className="text-xs">合并单元格</span>
            </Button>
          </>
        )}

        <Separator orientation="vertical" className="h-5" />

        {/* 完成编辑按钮 */}
        <Button
          variant="default"
          size="sm"
          className="h-7 gap-1 px-2 bg-green-500 hover:bg-green-600"
          onClick={(e) => {
            e.stopPropagation();
            onFinishEdit?.();
          }}
        >
          <span className="text-xs">完成编辑</span>
        </Button>
      </div>
    </div>
  );
});

AdvancedToolbar.displayName = 'AdvancedToolbar';
