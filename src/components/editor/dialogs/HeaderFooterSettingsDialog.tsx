'use client';

import React from 'react';
import { X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HeaderFooterSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headerRows: number;
  footerRows: number;
  onHeaderRowsChange: (rows: number) => void;
  onFooterRowsChange: (rows: number) => void;
  maxRows: number;
}

export const HeaderFooterSettingsDialog: React.FC<HeaderFooterSettingsDialogProps> = ({
  open,
  onOpenChange,
  headerRows,
  footerRows,
  onHeaderRowsChange,
  onFooterRowsChange,
  maxRows,
}) => {
  const rowOptions = [0, 1, 2];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold">表头和表尾</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* 说明文字 */}
          <p className="text-sm text-gray-500">
            如果打印时表格被分页，表头表尾会出现在每一页的表格上
          </p>

          {/* 表格示意图 */}
          <div className="border rounded p-2 bg-gray-50">
            <div className="text-center">
              <div className="border-b border-gray-300 py-2 text-sm text-gray-500">
                表头
              </div>
              <div className="py-4 text-sm text-gray-400">
                表格内容
              </div>
              <div className="border-t border-gray-300 py-2 text-sm text-gray-500">
                表尾
              </div>
            </div>
          </div>

          {/* 表头行和表尾行选择 */}
          <div className="grid grid-cols-2 gap-8">
            {/* 表头行 */}
            <div>
              <label className="block text-sm font-medium mb-3">表头行</label>
              <div className="flex gap-2">
                {rowOptions.map((rows) => (
                  <Button
                    key={rows}
                    variant={headerRows === rows ? 'default' : 'ghost'}
                    size="icon"
                    className={`w-12 h-10 ${headerRows === rows ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    onClick={() => onHeaderRowsChange(rows)}
                  >
                    {rows}
                  </Button>
                ))}
              </div>
            </div>

            {/* 表尾行 */}
            <div>
              <label className="block text-sm font-medium mb-3">表尾行</label>
              <div className="flex gap-2">
                {rowOptions.map((rows) => (
                  <Button
                    key={rows}
                    variant={footerRows === rows ? 'default' : 'ghost'}
                    size="icon"
                    className={`w-12 h-10 ${footerRows === rows ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    onClick={() => onFooterRowsChange(rows)}
                  >
                    {rows}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* 限制说明 */}
          <div className="text-sm text-gray-600">
            <p className="mb-2">无法设置表头表尾的场景：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>表头表尾设置的总行数大于表格总行数</li>
              <li>行内包含循环字段区域</li>
              <li>行内包含与其他行的合并单元格</li>
            </ul>
          </div>

          {/* 帮助按钮 */}
          <div className="flex justify-start">
            <Button variant="ghost" size="sm" className="text-sm text-gray-500">
              <HelpCircle className="w-4 h-4 mr-1" />
              帮助
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
