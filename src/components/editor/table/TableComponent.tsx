import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TableComponent as TableComponentType } from '@/types/editor';
import { HoverToolbar } from './HoverToolbar';
import { AdvancedToolbar } from './AdvancedToolbar';

type EditMode = 'view' | 'initial' | 'editing';

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
  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [tableData, setTableData] = useState<string[][]>([
    ['单元格1', '单元格2', '单元格3'],
    ['单元格4', '单元格5', '单元格6'],
    ['单元格7', '单元格8', '单元格9'],
  ]);

  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (editMode === 'view') {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (editMode === 'view') {
      hideTimeoutRef.current = setTimeout(() => {
        if (!isToolbarHovered) {
          setIsHovered(false);
        }
      }, 300); // 300ms 延迟关闭
    }
  };

  const handleToolbarMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsToolbarHovered(true);
  };

  const handleToolbarMouseLeave = () => {
    setIsToolbarHovered(false);
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected) {
      onSelect();
    }
  };

  const handleEditTable = () => {
    setEditMode('initial');
    setIsHovered(false);
    if (!isSelected) {
      onSelect();
    }
  };

  const handleCompleteEdit = () => {
    setEditMode('view');
    setSelectedCells([]);
  };

  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = [...tableData];
    newData[row] = [...newData[row]];
    newData[row][col] = value;
    setTableData(newData);
    onUpdate({ content: { type: 'simple-table', data: newData } });
  };

  const handleCellClick = (e: React.MouseEvent, row: number, col: number) => {
    e.stopPropagation();
    const cellId = `${row}-${col}`;
    
    if (editMode === 'initial') {
      setEditMode('editing');
    }
    
    if (e.shiftKey) {
      setSelectedCells(prev => 
        prev.includes(cellId) ? prev.filter(id => id !== cellId) : [...prev, cellId]
      );
    } else {
      setSelectedCells([cellId]);
    }
  };

  const handleMergeCells = () => {
    console.log('合并单元格:', selectedCells);
    setSelectedCells([]);
  };

  const showHoverToolbar = isHovered && editMode === 'view' && !isSelected;
  const getToolbarMode = editMode === 'initial' ? 'initial' : 'editing';

  return (
    <div 
      className="table-component relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* 悬停工具栏 - 仅在悬停且未选中时显示 */}
      {showHoverToolbar && (
        <div 
          className="absolute -top-12 left-0 right-0 z-20"
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          <HoverToolbar 
            onEdit={handleEditTable}
            onDelete={onDelete}
            onCopy={onCopy}
          />
        </div>
      )}

      {/* 高级编辑工具栏 - 编辑模式时在表格上方显示，不遮挡表格 */}
      {editMode !== 'view' && (
        <div className="mb-3">
          <AdvancedToolbar 
            mode={getToolbarMode}
            selectedCellsCount={selectedCells.length}
            onCompleteEdit={handleCompleteEdit}
            onMergeCells={handleMergeCells}
          />
        </div>
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
                        cursor: editMode !== 'view' ? 'cell' : 'default',
                      }}
                    >
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editMode === 'initial') {
                            setEditMode('editing');
                          }
                        }}
                        disabled={editMode === 'view'}
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
    </div>
  );
};
