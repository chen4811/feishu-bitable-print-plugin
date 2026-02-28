'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TableQuickActions } from '../table/TableQuickActions';
import {
  Pencil,
  Copy,
  Trash2,
  GripVertical,
  GripHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editorStore';

// 自适应高度的文本域组件
const AutoResizingTextarea = ({ 
  value, 
  onChange, 
  onClick, 
  onKeyDown,
  style
}: { 
  value: string;
  onChange: (value: string) => void;
  onClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  style?: React.CSSProperties;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 40)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={style}
      className="w-full resize-none outline-none bg-transparent text-inherit"
    />
  );
};

interface CanvasComponentProps {
  component: any;
  onComponentMouseDown: (e: React.MouseEvent, component: any) => void;
  setSelectedNode?: (nodeId: string | null) => void;
}

export const CanvasComponent: React.FC<CanvasComponentProps> = ({
  component,
  onComponentMouseDown,
  setSelectedNode
}) => {
  const store = useEditorStore() as any;
  const selectedNodeId = store.selectedNode?.id || null;
  const { updateNode, tableEditing, setTableEditing } = store;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isSelected = selectedNodeId === component.id;
  const isCurrentTableEditing = tableEditing.isEditing && tableEditing.tableId === component.id;

  // 单元格选择状态
  const [cellSelection, setCellSelection] = useState({
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 0,
    isSelecting: false,
  });

  // 获取选中的单元格ID
  const getSelectedCellIds = (node: any) => {
    if (!node.table) return [];
    
    const selectedIds: string[] = [];
    const minRow = Math.min(cellSelection.startRow, cellSelection.endRow);
    const maxRow = Math.max(cellSelection.startRow, cellSelection.endRow);
    const minCol = Math.min(cellSelection.startCol, cellSelection.endCol);
    const maxCol = Math.max(cellSelection.startCol, cellSelection.endCol);
    
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cellId = `cell-${r}-${c}`;
        selectedIds.push(cellId);
      }
    }
    
    return selectedIds;
  };

  // 处理单元格鼠标按下
  const handleCellMouseDown = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentTableEditing) return;
    
    setCellSelection({
      startRow: rowIndex,
      startCol: colIndex,
      endRow: rowIndex,
      endCol: colIndex,
      isSelecting: true,
    });
  };

  // 处理单元格鼠标移动
  const handleCellMouseMove = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentTableEditing || !cellSelection.isSelecting) return;
    
    setCellSelection(prev => ({
      ...prev,
      endRow: rowIndex,
      endCol: colIndex,
    }));
  };

  // 处理单元格鼠标释放
  const handleCellMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentTableEditing) return;
    
    if (cellSelection.isSelecting) {
      setCellSelection(prev => ({
        ...prev,
        isSelecting: false,
      }));
      
      // 更新 store 中的选中单元格
      const selectedIds = getSelectedCellIds(component);
      if (selectedIds.length > 0) {
        setTableEditing({
          selectedCells: selectedIds,
        });
      }
    }
  };

  // 处理鼠标离开表格
  const handleTableMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentTableEditing) return;
    
    if (cellSelection.isSelecting) {
      setCellSelection(prev => ({
        ...prev,
        isSelecting: false,
      }));
      
      // 更新 store 中的选中单元格
      const selectedIds = getSelectedCellIds(component);
      if (selectedIds.length > 0) {
        setTableEditing({
          selectedCells: selectedIds,
        });
      }
    }
  };

  // 文本组件编辑
  const handleDoubleClickText = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (component.type === 'text') {
      setIsEditing(true);
      setEditContent(component.content && component.content !== '显示' ? component.content : '');
    }
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (component.type === 'text') {
      updateNode(component.id, { content: editContent });
    }
  };

  // 表格编辑 - 切换编辑状态
  const handleEditTable = useCallback((e?: React.MouseEvent) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    if (isCurrentTableEditing) {
      // 退出编辑
      setTableEditing({
        isEditing: false,
        tableId: null,
        selectedCells: [],
      });
    } else {
      // 进入编辑 - 只设置基本状态
      setTableEditing({
        isEditing: true,
        tableId: component.id,
        selectedCells: [],
      });
    }
  }, [component.id, isCurrentTableEditing, setTableEditing]);

  // 双击表格进入编辑
  const handleDoubleClickTable = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentTableEditing) {
      handleEditTable();
    }
  };

  // 获取表格
  const getTable = () => {
    if (component.type !== 'table') return null;
    return component.table;
  };

  // 表格快捷操作处理函数
  const handleAddRowBefore = (rowIndex: number) => {
    const table = getTable();
    if (!table) return;
    
    const newRows = [...table.rows];
    const newCols = [...table.columns];
    
    // 在指定行前插入新行
    const newRow = {
      id: `row-${Date.now()}`,
      height: 40,
      isHeader: false,
      isFooter: false,
      isHidden: false
    };
    newRows.splice(rowIndex, 0, newRow);
    
    // 更新所有单元格的行索引
    const updatedCells = table.cells.map((cell: any) => {
      if (cell.row >= rowIndex) {
        return { ...cell, row: cell.row + 1 };
      }
      return cell;
    });
    
    // 添加新行的单元格
    newCols.forEach((_: any, colIndex: number) => {
      updatedCells.push({
        id: `cell-${Date.now()}-${colIndex}`,
        row: rowIndex,
        col: colIndex,
        content: '',
        styles: {},
        rowSpan: 1,
        colSpan: 1,
        isMerged: false
      });
    });
    
    updateNode(component.id, {
      table: {
        ...table,
        rows: newRows,
        cells: updatedCells
      }
    });
  };

  const handleAddRowAfter = (rowIndex: number) => {
    handleAddRowBefore(rowIndex + 1);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const table = getTable();
    if (!table) return;
    if (table.rows.length <= 1) return;
    
    const newRows = table.rows.filter((_: any, index: number) => index !== rowIndex);
    const updatedCells = table.cells
      .filter((cell: any) => cell.row !== rowIndex)
      .map((cell: any) => {
        if (cell.row > rowIndex) {
          return { ...cell, row: cell.row - 1 };
        }
        return cell;
      });
    
    updateNode(component.id, {
      table: {
        ...table,
        rows: newRows,
        cells: updatedCells
      }
    });
  };

  const handleToggleRowHeader = (rowIndex: number) => {
    const table = getTable();
    if (!table) return;
    
    const newRows = [...table.rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      isHeader: !newRows[rowIndex].isHeader
    };
    
    updateNode(component.id, {
      table: {
        ...table,
        rows: newRows
      }
    });
  };

  const handleToggleRowFooter = (rowIndex: number) => {
    const table = getTable();
    if (!table) return;
    
    const newRows = [...table.rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      isFooter: !newRows[rowIndex].isFooter
    };
    
    updateNode(component.id, {
      table: {
        ...table,
        rows: newRows
      }
    });
  };

  const handleToggleRowHidden = (rowIndex: number) => {
    const table = getTable();
    if (!table) return;
    
    const newRows = [...table.rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      isHidden: !newRows[rowIndex].isHidden
    };
    
    updateNode(component.id, {
      table: {
        ...table,
        rows: newRows
      }
    });
  };

  const handleAddColumnBefore = (colIndex: number) => {
    const table = getTable();
    if (!table) return;
    
    const newRows = [...table.rows];
    const newCols = [...table.columns];
    
    // 在指定列前插入新列
    const newCol = {
      id: `col-${Date.now()}`,
      width: 100,
      isHidden: false
    };
    newCols.splice(colIndex, 0, newCol);
    
    // 更新所有单元格的列索引
    const updatedCells = table.cells.map((cell: any) => {
      if (cell.col >= colIndex) {
        return { ...cell, col: cell.col + 1 };
      }
      return cell;
    });
    
    // 添加新列的单元格
    newRows.forEach((_: any, rowIndex: number) => {
      updatedCells.push({
        id: `cell-${Date.now()}-${rowIndex}`,
        row: rowIndex,
        col: colIndex,
        content: '',
        styles: {},
        rowSpan: 1,
        colSpan: 1,
        isMerged: false
      });
    });
    
    updateNode(component.id, {
      table: {
        ...table,
        columns: newCols,
        cells: updatedCells
      }
    });
  };

  const handleAddColumnAfter = (colIndex: number) => {
    handleAddColumnBefore(colIndex + 1);
  };

  const handleDeleteColumn = (colIndex: number) => {
    const table = getTable();
    if (!table) return;
    if (table.columns.length <= 1) return;
    
    const newCols = table.columns.filter((_: any, index: number) => index !== colIndex);
    const updatedCells = table.cells
      .filter((cell: any) => cell.col !== colIndex)
      .map((cell: any) => {
        if (cell.col > colIndex) {
          return { ...cell, col: cell.col - 1 };
        }
        return cell;
      });
    
    updateNode(component.id, {
      table: {
        ...table,
        columns: newCols,
        cells: updatedCells
      }
    });
  };

  const handleToggleColumnHidden = (colIndex: number) => {
    const table = getTable();
    if (!table) return;
    
    const newCols = [...table.columns];
    newCols[colIndex] = {
      ...newCols[colIndex],
      isHidden: !newCols[colIndex].isHidden
    };
    
    updateNode(component.id, {
      table: {
        ...table,
        columns: newCols
      }
    });
  };

  // 表格单元格编辑
  const handleTableCellChange = (row: number, col: number, value: string) => {
    const table = getTable();
    if (!table) return;
    
    const updatedCells = table.cells.map((cell: any) => {
      if (cell.row === row && cell.col === col) {
        return { ...cell, content: value };
      }
      return cell;
    });
    
    updateNode(component.id, {
      table: {
        ...table,
        cells: updatedCells
      }
    });
  };

  // 自动聚焦到编辑框
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // 获取表格数据
  const getTableData = () => {
    const table = getTable();
    if (!table) {
      return { rows: [], columns: [], cells: [] };
    }
    
    return {
      rows: table.rows,
      columns: table.columns,
      cells: table.cells
    };
  };

  // 获取单元格内容
  const getCellContent = (row: number, col: number) => {
    const table = getTable();
    if (!table) return '';
    
    const cell = table.cells.find((c: any) => c.row === row && c.col === col);
    return cell?.content || '';
  };

  // 检查单元格是否选中
  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (!isCurrentTableEditing) return false;
    
    const minRow = Math.min(cellSelection.startRow, cellSelection.endRow);
    const maxRow = Math.max(cellSelection.startRow, cellSelection.endRow);
    const minCol = Math.min(cellSelection.startCol, cellSelection.endCol);
    const maxCol = Math.max(cellSelection.startCol, cellSelection.endCol);
    
    return rowIndex >= minRow && rowIndex <= maxRow && 
           colIndex >= minCol && colIndex <= maxCol;
  };

  // 类型安全的样式访问
  const getComponentStyles = () => {
    if (component.type === 'text') {
      return component.styles || { width: 200, height: 100 };
    } else if (component.type === 'table') {
      return component.styles || { width: 400, height: 200 };
    } else {
      return { width: 200, height: 100 };
    }
  };

  // 渲染表格
  const renderTable = () => {
    if (component.type !== 'table') return null;
    
    const { rows, columns, cells } = getTableData();
    
    // 检查是否显示行或列
    const isRowVisible = (rowIndex: number) => !rows[rowIndex]?.isHidden;
    const isColumnVisible = (colIndex: number) => !columns[colIndex]?.isHidden;
    
    // 获取可见的行和列
    const visibleRows = rows.filter((_: any, index: number) => isRowVisible(index));
    const visibleColumns = columns.filter((_: any, index: number) => isColumnVisible(index));
    
    if (visibleRows.length === 0 || visibleColumns.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Pencil className="w-4 h-4" />
            <span>表格组件</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button variant="default" size="sm" onClick={handleEditTable}>
              编辑表格
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative">
        {isCurrentTableEditing && (
          <TableQuickActions
            rows={visibleRows}
            columns={visibleColumns}
            onAddRowBefore={handleAddRowBefore}
            onAddRowAfter={handleAddRowAfter}
            onDeleteRow={handleDeleteRow}
            onToggleRowHeader={handleToggleRowHeader}
            onToggleRowFooter={handleToggleRowFooter}
            onToggleRowHidden={handleToggleRowHidden}
            onAddColumnBefore={handleAddColumnBefore}
            onAddColumnAfter={handleAddColumnAfter}
            onDeleteColumn={handleDeleteColumn}
            onToggleColumnHidden={handleToggleColumnHidden}
          />
        )}
        
        <div 
          className="relative"
          onMouseUp={handleCellMouseUp}
          onMouseLeave={handleTableMouseLeave}
        >
          <table className="w-full border-collapse">
            <tbody>
              {visibleRows.map((row: any, rowIndex: number) => {
                const actualRowIndex = rows.findIndex((r: any) => r.id === row.id);
                
                return (
                  <tr 
                    key={row.id}
                    className={`
                      ${row.isHeader ? 'bg-gray-100 font-semibold' : ''}
                      ${row.isFooter ? 'bg-gray-50' : ''}
                    `}
                    style={{ height: `${row.height}px` }}
                  >
                    {visibleColumns.map((col: any, colIndex: number) => {
                      const actualColIndex = columns.findIndex((c: any) => c.id === col.id);
                      const cellContent = getCellContent(actualRowIndex, actualColIndex);
                      const selected = isCellSelected(actualRowIndex, actualColIndex);
                      
                      return (
                        <td 
                          key={col.id}
                          className={`
                            border border-gray-300 p-2
                            ${selected ? 'bg-blue-100' : ''}
                          `}
                          style={{ width: `${col.width}px` }}
                          onMouseDown={(e) => handleCellMouseDown(actualRowIndex, actualColIndex, e)}
                          onMouseMove={(e) => handleCellMouseMove(actualRowIndex, actualColIndex, e)}
                        >
                          {isCurrentTableEditing ? (
                            <AutoResizingTextarea
                              value={cellContent}
                              onChange={(value) => handleTableCellChange(actualRowIndex, actualColIndex, value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div>{cellContent || '\u00A0'}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 渲染文本组件
  const renderText = () => {
    if (component.type !== 'text') return null;
    
    return (
      <div onDoubleClick={handleDoubleClickText}>
        {isEditing ? (
          <AutoResizingTextarea
            value={editContent}
            onChange={setEditContent}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextBlur();
              }
            }}
          />
        ) : (
          <div>{component.content || '显示'}</div>
        )}
      </div>
    );
  };

  // 渲染其他组件
  const renderOther = () => {
    if (component.type === 'text' || component.type === 'table') return null;
    
    return (
      <div className="text-muted-foreground">
        {component.type} 组件
      </div>
    );
  };

  return (
    <div
      className={`
        relative p-2 rounded
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${isCurrentTableEditing ? 'ring-2 ring-green-500' : ''}
      `}
      style={{
        width: `${getComponentStyles().width}px`,
        height: `${getComponentStyles().height}px`,
        ...getComponentStyles()
      }}
      onMouseDown={(e) => onComponentMouseDown(e, component)}
      onDoubleClick={component.type === 'table' ? handleDoubleClickTable : undefined}
    >
      {/* 选中时的边框控制 */}
      {isSelected && (
        <>
          <div className="absolute -left-1 -top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded cursor-nw-resize" />
          <div className="absolute -right-1 -top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded cursor-ne-resize" />
          <div className="absolute -left-1 -bottom-1 w-3 h-3 bg-white border-2 border-blue-500 rounded cursor-sw-resize" />
          <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border-2 border-blue-500 rounded cursor-se-resize" />
        </>
      )}
      
      {/* 组件内容 */}
      {component.type === 'text' && renderText()}
      {component.type === 'table' && renderTable()}
      {renderOther()}
      
      {/* 编辑按钮 - 表格组件 */}
      {isSelected && component.type === 'table' && (
        <div className="absolute -top-10 left-0 flex gap-2 bg-white shadow-lg rounded p-1 z-10">
          <Button variant="default" size="sm" onClick={handleEditTable}>
            {isCurrentTableEditing ? '退出编辑' : '编辑表格'}
          </Button>
        </div>
      )}
    </div>
  );
};
