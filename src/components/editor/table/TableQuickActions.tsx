'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Eye, EyeOff, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


interface TableQuickActionsProps {
  rows: any[];
  columns: any[];
  onAddRowBefore: (rowIndex: number) => void;
  onAddRowAfter: (rowIndex: number) => void;
  onDeleteRow: (rowIndex: number) => void;
  onToggleRowHeader: (rowIndex: number) => void;
  onToggleRowFooter: (rowIndex: number) => void;
  onToggleRowHidden: (rowIndex: number) => void;
  onAddColumnBefore: (colIndex: number) => void;
  onAddColumnAfter: (colIndex: number) => void;
  onDeleteColumn: (colIndex: number) => void;
  onToggleColumnHidden: (colIndex: number) => void;
}

export const TableQuickActions: React.FC<TableQuickActionsProps> = ({
  rows,
  columns,
  onAddRowBefore,
  onAddRowAfter,
  onDeleteRow,
  onToggleRowHeader,
  onToggleRowFooter,
  onToggleRowHidden,
  onAddColumnBefore,
  onAddColumnAfter,
  onDeleteColumn,
  onToggleColumnHidden,
}) => {
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [hoveredRowButton, setHoveredRowButton] = useState<number | null>(null);
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);

  // 过滤掉隐藏的行和列
  const visibleRows = rows.filter(row => !row.isHidden);
  const visibleColumns = columns.filter(col => !col.isHidden);

  const handleRowMouseEnter = useCallback((index: number) => {
    setHoveredRowIndex(index);
  }, []);

  const handleRowMouseLeave = useCallback(() => {
    setHoveredRowIndex(null);
    setHoveredRowButton(null);
  }, []);

  const handleRowButtonMouseEnter = useCallback((index: number) => {
    setHoveredRowButton(index);
  }, []);

  const handleRowButtonMouseLeave = useCallback(() => {
    setHoveredRowButton(null);
  }, []);

  const handleColMouseEnter = useCallback((index: number) => {
    setHoveredColIndex(index);
  }, []);

  const handleColMouseLeave = useCallback(() => {
    setHoveredColIndex(null);
  }, []);

  return (
    <div className="relative">
      {/* 行控制条 - 左侧 */}
      <div className="absolute top-0 left-0 -translate-x-full h-full flex flex-col">
        {visibleRows.map((row, visibleIndex) => {
          const originalIndex = rows.findIndex(r => r.id === row.id);
          const isHovered = hoveredRowIndex === originalIndex;

          return (
            <div
              key={row.id}
              className="relative flex items-center"
              style={{
                height: `${row.height}px`,
              }}
              onMouseEnter={() => handleRowMouseEnter(originalIndex)}
              onMouseLeave={handleRowMouseLeave}
            >
              {/* 渐变色条 */}
              <div
                className={`transition-all duration-200 ${isHovered ? 'w-4' : 'w-1'}`}
                style={{
                  background: isHovered
                    ? 'linear-gradient(to right, rgba(59, 130, 246, 0.3), transparent)'
                    : 'linear-gradient(to right, rgba(59, 130, 246, 0.1), transparent)',
                  height: '100%',
                }}
              />

              {/* 操作菜单 */}
              {isHovered && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-white border shadow-sm hover:bg-gray-50"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right">
                      <DropdownMenuItem onClick={() => onAddRowBefore(originalIndex)}>
                        <Plus className="w-4 h-4 mr-2" />
                        上方插入行
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAddRowAfter(originalIndex)}>
                        <Plus className="w-4 h-4 mr-2" />
                        下方插入行
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleRowHeader(originalIndex)}>
                        <Grid className="w-4 h-4 mr-2" />
                        {row.isHeader ? '取消表头' : '设为表头'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleRowFooter(originalIndex)}>
                        <Grid className="w-4 h-4 mr-2" />
                        {row.isFooter ? '取消表尾' : '设为表尾'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleRowHidden(originalIndex)}>
                        {row.isHidden ? (
                          <Eye className="w-4 h-4 mr-2" />
                        ) : (
                          <EyeOff className="w-4 h-4 mr-2" />
                        )}
                        {row.isHidden ? '显示行' : '隐藏行'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteRow(originalIndex)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除行
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 行间添加按钮 */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none">
        {visibleRows.map((row, visibleIndex) => {
          const originalIndex = rows.findIndex(r => r.id === row.id);
          const isHovered = hoveredRowButton === originalIndex;

          return (
            <div
              key={`add-${row.id}`}
              className="absolute left-0 right-0 flex justify-center pointer-events-auto"
              style={{
                marginTop: `${visibleIndex > 0 ? '0' : '0'}`,
                top: visibleIndex > 0 ? 'auto' : '0',
                bottom: visibleIndex < visibleRows.length - 1 ? 'auto' : '0',
              }}
            >
              <div
                className="relative"
                onMouseEnter={() => handleRowButtonMouseEnter(originalIndex)}
                onMouseLeave={handleRowButtonMouseLeave}
              >
                {/* 小圆点 */}
                <div
                  className={`transition-all duration-200 ${isHovered ? 'opacity-0' : 'opacity-100'}`}
                >
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                </div>

                {/* 悬停时显示的 + 号按钮 */}
                {isHovered && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Button
                      variant="default"
                      size="icon"
                      className="h-6 w-6 bg-blue-500 hover:bg-blue-600"
                      onClick={() => onAddRowAfter(originalIndex)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 列级操作 - 顶部 */}
      <div className="flex items-end" style={{ paddingLeft: '40px' }}>
        {visibleColumns.map((col, visibleIndex) => {
          const originalIndex = columns.findIndex(c => c.id === col.id);
          const isHovered = hoveredColIndex === originalIndex;

          return (
            <div
              key={col.id}
              className="relative"
              style={{
                width: `${col.width}px`,
              }}
              onMouseEnter={() => handleColMouseEnter(originalIndex)}
              onMouseLeave={handleColMouseLeave}
            >
              {/* 占位，用于对齐 */}
              <div className="h-4" />
              
              {/* 列操作菜单 */}
              {isHovered && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-white border shadow-sm hover:bg-gray-50"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuItem onClick={() => onAddColumnBefore(originalIndex)}>
                        <Plus className="w-4 h-4 mr-2" />
                        左侧插入列
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAddColumnAfter(originalIndex)}>
                        <Plus className="w-4 h-4 mr-2" />
                        右侧插入列
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleColumnHidden(originalIndex)}>
                        {col.isHidden ? (
                          <Eye className="w-4 h-4 mr-2" />
                        ) : (
                          <EyeOff className="w-4 h-4 mr-2" />
                        )}
                        {col.isHidden ? '显示列' : '隐藏列'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteColumn(originalIndex)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除列
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};