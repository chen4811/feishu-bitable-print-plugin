import React, { useState, useCallback, useRef } from 'react';
import { TableComponent as TableComponentType } from '@/types/editor';
import { HoverToolbar } from './HoverToolbar';
import { AdvancedToolbar } from './AdvancedToolbar';

interface TableComponentProps {
  component: TableComponentType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TableComponentType>) => void;
  onDelete: () => void;
  onCopy: () => void;
}

export const TableComponent: React.FC<TableComponentProps> = ({
  component,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onCopy,
}) => {
  // 本地 UI 状态
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  
  // 简单的表格数据
  const [tableData, setTableData] = useState<string[][]>([
    ['单元格1', '单元格2', '单元格3'],
    ['单元格4', '单元格5', '单元格6'],
    ['单元格7', '单元格8', '单元格9'],
  ]);

  const containerRef = useRef<HTMLDivElement>(null);

  // 处理鼠标进入
  const handleMouseEnter = useCallback(() => {
    if (!isSelected && !isEditing) {
      setIsHovered(true);
    }
  }, [isSelected, isEditing]);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // 处理点击 - 进入编辑模式
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected) {
      onSelect();
    }
    if (!isEditing) {
      setIsEditing(true);
      setIsHovered(false);
    }
  }, [isSelected, isEditing, onSelect]);

  // 处理编辑
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setIsHovered(false);
    if (!isSelected) {
      onSelect();
    }
  }, [isSelected, onSelect]);

  // 处理单元格变化
  const handleCellChange = useCallback((row: number, col: number, value: string) => {
    const newData = [...tableData];
    newData[row] = [...newData[row]];
    newData[row][col] = value;
    setTableData(newData);
    onUpdate({ content: { type: 'simple-table', data: newData } });
  }, [tableData, onUpdate]);

  // 添加行
  const addRow = useCallback(() => {
    const newRow = new Array(tableData[0]?.length || 3).fill('');
    const newData = [...tableData, newRow];
    setTableData(newData);
    onUpdate({ content: { type: 'simple-table', data: newData } });
  }, [tableData, onUpdate]);

  // 添加列
  const addColumn = useCallback(() => {
    const newData = tableData.map(row => [...row, '']);
    setTableData(newData);
    onUpdate({ content: { type: 'simple-table', data: newData } });
  }, [tableData, onUpdate]);

  // 合并单元格（占位实现）
  const handleMergeCells = useCallback(() => {
    console.log('合并单元格:', selectedCells);
    // 实际实现需要更复杂的逻辑
    setSelectedCells([]);
  }, [selectedCells]);

  // 处理单元格点击（用于多选）
  const handleCellClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.stopPropagation();
    const cellId = `${row}-${col}`;
    
    if (e.shiftKey) {
      // Shift + 点击：添加到选中
      setSelectedCells(prev => 
        prev.includes(cellId) ? prev.filter(id => id !== cellId) : [...prev, cellId]
      );
    } else {
      // 普通点击：只选中当前
      setSelectedCells([cellId]);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="table-component relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* 高级编辑工具栏 - 编辑模式时在顶部显示 */}
      {isEditing && (
        <div className="absolute -top-12 left-0 right-0 z-10">
          <AdvancedToolbar 
            selectedCellsCount={selectedCells.length}
            onMergeCells={handleMergeCells}
          />
        </div>
      )}

      {/* 悬停工具栏 - 仅在悬停且未选中时显示 */}
      {isHovered && !isSelected && !isEditing && (
        <HoverToolbar 
          onEdit={handleEdit}
          onDelete={onDelete}
          onCopy={onCopy}
        />
      )}

      {/* 表格内容 */}
      <div className="border rounded-lg overflow-hidden">
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  const cellId = `${rowIndex}-${colIndex}`;
                  const isCellSelected = selectedCells.includes(cellId);
                  
                  return (
                    <td 
                      key={colIndex} 
                      onClick={(e) => handleCellClick(e, rowIndex, colIndex)}
                      style={{ 
                        border: '1px solid #ddd', 
                        padding: '8px',
                        backgroundColor: isCellSelected ? '#e0f2fe' : 'white',
                        cursor: 'cell',
                      }}
                    >
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          width: '100%', 
                          border: 'none', 
                          background: 'transparent',
                          outline: 'none',
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 简单的操作按钮 - 底部 */}
      {isEditing && (
        <div className="flex gap-2 mt-2">
          <button 
            onClick={(e) => { e.stopPropagation(); addRow(); }}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
          >
            添加行
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); addColumn(); }}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
          >
            添加列
          </button>
        </div>
      )}
    </div>
  );
};
