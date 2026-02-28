'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 20)}px`;
    }
  }, []);

  // 内容变化时调整高度
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // 组件挂载时调整高度
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="w-full border-0 outline-none p-1 resize-none overflow-hidden"
      style={{ 
        height: 'auto',
        backgroundColor: 'transparent',
        ...style,
      }}
    />
  );
};
import { CanvasComponentNode } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { HoverToolbar } from '../table/HoverToolbar';

interface CanvasComponentProps {
  component: CanvasComponentNode;
  isSelected: boolean;
  onSelect: () => void;
}

export function CanvasComponent({ component, isSelected, onSelect }: CanvasComponentProps) {
  const { 
    updateComponent, 
    styleConfig, 
    duplicateComponent, 
    deleteComponent,
    tableEditing,
    setTableEditing,
    tableCellEditing,
    setTableCellEditing,
  } = useEditorStore();
  
  // 通用状态
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 表格编辑状态（本地数据，UI 状态在 store）
  const [tableEditData, setTableEditData] = useState<any[][]>([]);
  
  // 表格单元格选择状态（用于拖动选择）
  const [cellSelection, setCellSelection] = useState<{
    startRow: number | null;
    startCol: number | null;
    endRow: number | null;
    endCol: number | null;
    isSelecting: boolean;
  }>({
    startRow: null,
    startCol: null,
    endRow: null,
    endCol: null,
    isSelecting: false,
  });
  
  // 悬停状态 - 用于显示操作按钮
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  // 圆点悬停状态 - 只在圆点悬停时显示操作按钮
  const [hoveredRowDot, setHoveredRowDot] = useState<number | null>(null);
  const [hoveredColDot, setHoveredColDot] = useState<number | null>(null);
  
  // 判断当前是否在编辑这个表格
  const isCurrentTableEditing = tableEditing.isEditing && tableEditing.tableId === component.id;

  // 检查单元格是否在选中范围内
  const isCellInSelection = (rowIndex: number, colIndex: number): boolean => {
    if (cellSelection.startRow === null || cellSelection.startCol === null) {
      return false;
    }
    
    const minRow = Math.min(cellSelection.startRow, cellSelection.endRow ?? cellSelection.startRow);
    const maxRow = Math.max(cellSelection.startRow, cellSelection.endRow ?? cellSelection.startRow);
    const minCol = Math.min(cellSelection.startCol, cellSelection.endCol ?? cellSelection.startCol);
    const maxCol = Math.max(cellSelection.startCol, cellSelection.endCol ?? cellSelection.startCol);
    
    return rowIndex >= minRow && rowIndex <= maxRow && 
           colIndex >= minCol && colIndex <= maxCol;
  };

  // 获取选中的所有单元格ID
  const getSelectedCellIds = (tableComp: any): string[] => {
    if (!tableComp.tableConfig?.cells) return [];
    
    const selectedIds: string[] = [];
    if (cellSelection.startRow === null || cellSelection.startCol === null) {
      return [];
    }
    
    const minRow = Math.min(cellSelection.startRow, cellSelection.endRow ?? cellSelection.startRow);
    const maxRow = Math.max(cellSelection.startRow, cellSelection.endRow ?? cellSelection.startRow);
    const minCol = Math.min(cellSelection.startCol, cellSelection.endCol ?? cellSelection.startCol);
    const maxCol = Math.max(cellSelection.startCol, cellSelection.endCol ?? cellSelection.startCol);
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = tableComp.tableConfig.cells[row]?.[col]?.id || `cell-${row}-${col}`;
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
      const tableComp = component as any;
      const selectedIds = getSelectedCellIds(tableComp);
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
      const tableComp = component as any;
      const selectedIds = getSelectedCellIds(tableComp);
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
      setEditContent((component as any).content && (component as any).content !== '显示' ? (component as any).content : '');
    }
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (component.type === 'text') {
      updateComponent(component.id, { content: editContent });
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

  // 复制组件
  const handleCopyComponent = (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    duplicateComponent(component.id);
  };

  // 删除组件
  const handleDeleteComponent = (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    deleteComponent(component.id);
  };

  // 表格单元格编辑
  const handleTableCellChange = (row: number, col: number, value: string) => {
    const newData = [...tableEditData];
    newData[row] = [...newData[row]];
    newData[row][col] = value;
    setTableEditData(newData);
    
    const tableComp = component as any;
    if (tableComp.tableConfig?.cells) {
      const newCells = newData.map((rowData, rowIndex) =>
        rowData.map((cellContent, colIndex) => ({
          id: tableComp.tableConfig.cells[rowIndex]?.[colIndex]?.id || `cell-${rowIndex}-${colIndex}`,
          content: cellContent,
          backgroundColor: tableComp.tableConfig.cells[rowIndex]?.[colIndex]?.backgroundColor,
          verticalAlign: tableComp.tableConfig.cells[rowIndex]?.[colIndex]?.verticalAlign,
          border: tableComp.tableConfig.cells[rowIndex]?.[colIndex]?.border,
          style: tableComp.tableConfig.cells[rowIndex]?.[colIndex]?.style,
        }))
      );
      updateComponent(component.id, {
        tableConfig: {
          ...tableComp.tableConfig,
          cells: newCells,
        },
      });
    }
  };

  // 自动聚焦到编辑框
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // 初始化表格编辑数据
  useEffect(() => {
    if (component.type === 'table') {
      const tableComp = component as any;
      if (tableComp.tableConfig?.cells) {
        setTableEditData(tableComp.tableConfig.cells.map((row: any[]) => 
          row.map((cell: any) => cell?.content || '')
        ));
      } else {
        setTableEditData([
          ['', '', ''],
          ['', '', ''],
        ]);
      }
    }
  }, [component.id, component.type]);

  // 生成二维码
  useEffect(() => {
    if (component.type === 'qrcode' && canvasRef.current) {
      const qrcodeComponent = component as any;
      QRCode.toCanvas(canvasRef.current, qrcodeComponent.content, {
        width: Math.min(qrcodeComponent.size || 150, 200),
        margin: 1,
      }).catch(console.error);
    }
  }, [component]);

  // 生成条形码
  useEffect(() => {
    if (component.type === 'barcode' && canvasRef.current) {
      const barcodeComponent = component as any;
      try {
        canvasRef.current.innerHTML = '';
        JsBarcode(canvasRef.current, barcodeComponent.content, {
          format: barcodeComponent.format || 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [component]);

  // ========== 表格行/列操作函数 ==========
  
  // 在指定位置新增行
  const handleAddRow = useCallback((tableComp: any, rowIndex: number) => {
    if (!tableComp.tableConfig?.cells) return;
    
    const currentCells = tableComp.tableConfig.cells;
    const colCount = currentCells[0]?.length || 3;
    
    // 创建新行的单元格
    const newRow = Array.from({ length: colCount }, (_, i) => ({
      id: `cell-${Date.now()}-${i}`,
      content: '',
    }));
    
    // 插入新行
    const newCells = [...currentCells];
    newCells.splice(rowIndex, 0, newRow);
    
    // 更新组件
    updateComponent(tableComp.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
    
    // 同步更新本地编辑数据
    setTableEditData(newCells.map((row: any[]) => row.map((cell: any) => cell.content || '')));
  }, [updateComponent]);

  // 删除指定行
  const handleDeleteRow = useCallback((tableComp: any, rowIndex: number) => {
    if (!tableComp.tableConfig?.cells) return;
    if (tableComp.tableConfig.cells.length <= 1) return; // 至少保留一行
    
    const newCells = tableComp.tableConfig.cells.filter((_: any, index: number) => index !== rowIndex);
    
    updateComponent(tableComp.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
    
    setTableEditData(newCells.map((row: any[]) => row.map((cell: any) => cell.content || '')));
  }, [updateComponent]);

  // 在指定位置新增列
  const handleAddColumn = useCallback((tableComp: any, colIndex: number) => {
    if (!tableComp.tableConfig?.cells) return;
    
    const newCells = tableComp.tableConfig.cells.map((row: any[], rowIdx: number) => {
      const newRow = [...row];
      newRow.splice(colIndex, 0, {
        id: `cell-${Date.now()}-${rowIdx}-${colIndex}`,
        content: '',
      });
      return newRow;
    });
    
    updateComponent(tableComp.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
    
    setTableEditData(newCells.map((row: any[]) => row.map((cell: any) => cell.content || '')));
  }, [updateComponent]);

  // 删除指定列
  const handleDeleteColumn = useCallback((tableComp: any, colIndex: number) => {
    if (!tableComp.tableConfig?.cells) return;
    if (tableComp.tableConfig.cells[0]?.length <= 1) return; // 至少保留一列
    
    const newCells = tableComp.tableConfig.cells.map((row: any[]) => 
      row.filter((_: any, index: number) => index !== colIndex)
    );
    
    updateComponent(tableComp.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
    
    setTableEditData(newCells.map((row: any[]) => row.map((cell: any) => cell.content || '')));
  }, [updateComponent]);

  // 渲染表格内容
  const renderTableContent = (tableComp: any) => {
    if (!tableComp.tableConfig?.cells) {
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
            <Button variant="ghost" size="icon" onClick={handleCopyComponent}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDeleteComponent}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    // 渲染单元格内容（通用）
    const renderCellContent = (cellContent: any, cell: any, cellStyle: any, isEditing: boolean) => {
      const textStyles: React.CSSProperties = {
        fontSize: `${cellStyle.fontSize || styleConfig.fontSize}px`,
        fontWeight: cellStyle.bold ? 'bold' : 'normal',
        fontStyle: cellStyle.italic ? 'italic' : 'normal',
        color: cellStyle.color || '#000000',
        backgroundColor: cellStyle.backgroundColor || 'transparent',
        textAlign: cellStyle.align || 'left',
        lineHeight: cellStyle.lineHeight || styleConfig.lineHeight,
        textDecoration: cellStyle.underline ? 'underline' : cellStyle.textDecoration || 'none',
        textTransform: cellStyle.textTransform || 'none',
        paddingBottom: cellStyle.paragraphSpacing ? `${cellStyle.paragraphSpacing}px` : 0,
        width: '100%',
        minHeight: '20px',
      };

      if (isEditing) {
        const textareaStyles: React.CSSProperties = {
          fontSize: textStyles.fontSize,
          fontWeight: textStyles.fontWeight,
          fontStyle: textStyles.fontStyle,
          color: textStyles.color,
          textAlign: textStyles.textAlign,
          lineHeight: textStyles.lineHeight,
          textDecoration: textStyles.textDecoration,
          textTransform: textStyles.textTransform,
        };
        
        return (
          <div className="w-full h-full flex items-stretch" style={textStyles}>
            <AutoResizingTextarea
              value={cellContent || ''}
              onChange={(value) => handleTableCellChange(0, 0, value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {}}
              style={textareaStyles}
            />
          </div>
        );
      }

      return (
        <div className="whitespace-pre-wrap" style={textStyles}>
          {cellContent || ''}
        </div>
      );
    };

    // ========== 编辑状态表格 ==========
    if (isCurrentTableEditing) {
      return (
        <div className="relative w-full" onMouseUp={handleCellMouseUp} onMouseLeave={handleTableMouseLeave}>
          <table className="w-full border-collapse">
              <tbody>
                {tableEditData.map((row: any[], rowIndex: number) => {
                  const isHeader = rowIndex < (tableComp.tableConfig?.headerRows || 0);
                  const isFooter = rowIndex >= tableEditData.length - (tableComp.tableConfig?.footerRows || 0);
                  
                  return (
                    <tr 
                      key={rowIndex} 
                      className={isHeader ? 'bg-gray-100 font-semibold' : isFooter ? 'bg-gray-50' : ''}
                    >
                      {/* 行操作单元格 */}
                      <td 
                        className="w-8 p-0 align-middle" 
                        style={{ verticalAlign: 'middle' }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-0.5 p-1 min-h-full">
                          {hoveredRowDot === rowIndex ? (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleAddRow(tableComp, rowIndex); }} className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center hover:bg-blue-600" title="在上方插入行">
                                <span className="text-xs font-bold">↑</span>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleAddRow(tableComp, rowIndex + 1); }} className="w-5 h-5 bg-green-500 text-white rounded flex items-center justify-center hover:bg-green-600" title="在下方插入行">
                                <span className="text-xs font-bold">↓</span>
                              </button>
                              {tableEditData.length > 1 && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteRow(tableComp, rowIndex); }} className="w-5 h-5 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600" title="删除此行">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </>
                          ) : (
                            <div 
                              className="w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
                              onMouseEnter={() => setHoveredRowDot(rowIndex)}
                              onMouseLeave={() => setHoveredRowDot(null)}
                            />
                          )}
                        </div>
                      </td>
                      
                      {row.map((cellContent: any, colIndex: number) => {
                        const cell = tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex];
                        const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
                        const rowSpan = cell?.rowSpan;
                        const colSpan = cell?.colSpan;
                        
                        if (rowSpan === 0 || colSpan === 0) return null;
                        
                        const isCellInRange = isCellInSelection(rowIndex, colIndex);
                        const isCellSelected = tableEditing.selectedCells.includes(cellId) || isCellInRange;
                        const cellBorder = cell?.border;
                        const borderWidth = cellBorder?.width || tableComp.tableConfig?.borderWidth || 1;
                        const borderColor = cellBorder?.color || tableComp.tableConfig?.borderColor || '#000000';
                        
                        const borderStyles: any = {};
                        if (cellBorder?.top) borderStyles.borderTop = `${borderWidth}px solid ${borderColor}`;
                        if (cellBorder?.right) borderStyles.borderRight = `${borderWidth}px solid ${borderColor}`;
                        if (cellBorder?.bottom) borderStyles.borderBottom = `${borderWidth}px solid ${borderColor}`;
                        if (cellBorder?.left) borderStyles.borderLeft = `${borderWidth}px solid ${borderColor}`;
                        
                        const hasCellBorder = cellBorder?.top || cellBorder?.right || cellBorder?.bottom || cellBorder?.left;
                        const cellStyle = tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex]?.style || {};
                        
                        return (
                          <td
                            key={`${rowIndex}-${colIndex}`}
                            rowSpan={rowSpan && rowSpan > 1 ? rowSpan : undefined}
                            colSpan={colSpan && colSpan > 1 ? colSpan : undefined}
                            className={`p-1 text-sm cursor-pointer transition-colors select-none ${!hasCellBorder ? 'border' : ''}`}
                            style={{
                              backgroundColor: isCellSelected ? '#dbeafe' : (cell?.backgroundColor || cell?.style?.backgroundColor || 'transparent'),
                              userSelect: 'none',
                              verticalAlign: cell?.verticalAlign || 'middle',
                              ...borderStyles,
                            }}
                            onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                            onMouseEnter={(e) => {
                              handleCellMouseMove(rowIndex, colIndex, e);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!cellSelection.isSelecting) {
                                setTableEditing({ selectedCells: [cellId] });
                                setTableCellEditing({ isEditing: true, tableId: component.id, cellId, rowIndex, colIndex });
                              }
                            }}
                          >
                            {/* 列操作按钮 - 仅在第一行 */}
                            {rowIndex === 0 && (
                              <>
                                {hoveredColDot === colIndex ? (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); handleAddColumn(tableComp, colIndex); }} className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center hover:bg-blue-600" title="在左侧插入列" onMouseDown={(e) => e.stopPropagation()}>
                                      <span className="text-xs font-bold">←</span>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleAddColumn(tableComp, colIndex + 1); }} className="w-5 h-5 bg-green-500 text-white rounded flex items-center justify-center hover:bg-green-600" title="在右侧插入列" onMouseDown={(e) => e.stopPropagation()}>
                                      <span className="text-xs font-bold">→</span>
                                    </button>
                                    {tableEditData[0]?.length > 1 && (
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteColumn(tableComp, colIndex); }} className="w-5 h-5 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600" title="删除此列" onMouseDown={(e) => e.stopPropagation()}>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <div 
                                    className="w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
                                    onMouseEnter={() => setHoveredColDot(colIndex)}
                                    onMouseLeave={() => setHoveredColDot(null)}
                                  />
                                )}
                              </>
                            )}
                            
                            {(() => {
                              const textStyles: React.CSSProperties = {
                                fontSize: `${cellStyle.fontSize || styleConfig.fontSize}px`,
                                fontWeight: cellStyle.bold ? 'bold' : 'normal',
                                fontStyle: cellStyle.italic ? 'italic' : 'normal',
                                color: cellStyle.color || '#000000',
                                backgroundColor: cellStyle.backgroundColor || 'transparent',
                                textAlign: cellStyle.align || 'left',
                                lineHeight: cellStyle.lineHeight || styleConfig.lineHeight,
                                textDecoration: cellStyle.underline ? 'underline' : cellStyle.textDecoration || 'none',
                                textTransform: cellStyle.textTransform || 'none',
                                paddingBottom: cellStyle.paragraphSpacing ? `${cellStyle.paragraphSpacing}px` : 0,
                                width: '100%',
                                minHeight: '20px',
                              };

                              if (tableCellEditing.isEditing && tableCellEditing.cellId === cellId) {
                                const textareaStyles: React.CSSProperties = {
                                  fontSize: textStyles.fontSize,
                                  fontWeight: textStyles.fontWeight,
                                  fontStyle: textStyles.fontStyle,
                                  color: textStyles.color,
                                  textAlign: textStyles.textAlign,
                                  lineHeight: textStyles.lineHeight,
                                  textDecoration: textStyles.textDecoration,
                                  textTransform: textStyles.textTransform,
                                };
                                
                                return (
                                  <div className="w-full h-full flex items-stretch" style={textStyles}>
                                    <AutoResizingTextarea
                                      value={cellContent || ''}
                                      onChange={(value) => handleTableCellChange(rowIndex, colIndex, value)}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) e.stopPropagation();
                                      }}
                                      style={textareaStyles}
                                    />
                                  </div>
                                );
                              }

                              return (
                                <div className="whitespace-pre-wrap" style={textStyles}>
                                  {cellContent || ''}
                                </div>
                              );
                            })()}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

    // ========== 非编辑状态表格（原生表格）==========
    return (
      <div className="relative w-full" onMouseUp={handleCellMouseUp} onMouseLeave={handleTableMouseLeave}>
        <table className="w-full border-collapse">
          <tbody>
            {tableEditData.map((row: any[], rowIndex: number) => {
              const isHeader = rowIndex < (tableComp.tableConfig?.headerRows || 0);
              const isFooter = rowIndex >= tableEditData.length - (tableComp.tableConfig?.footerRows || 0);
              
              return (
                <tr key={rowIndex} className={isHeader ? 'bg-gray-100 font-semibold' : isFooter ? 'bg-gray-50' : ''}>
                  {/* 保留行操作列空间（隐藏内容） */}
                  <td className="w-8 p-0" style={{ verticalAlign: 'middle' }}>
                    <div className="p-1 min-h-full opacity-0">
                      <div className="w-2 h-2 rounded-full" />
                    </div>
                  </td>
                  
                  {row.map((cellContent: any, colIndex: number) => {
                    const cell = tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex];
                    const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
                    const rowSpan = cell?.rowSpan;
                    const colSpan = cell?.colSpan;
                    
                    if (rowSpan === 0 || colSpan === 0) return null;
                    
                    const cellBorder = cell?.border;
                    const borderWidth = cellBorder?.width || tableComp.tableConfig?.borderWidth || 1;
                    const borderColor = cellBorder?.color || tableComp.tableConfig?.borderColor || '#000000';
                    
                    const borderStyles: any = {};
                    if (cellBorder?.top) borderStyles.borderTop = `${borderWidth}px solid ${borderColor}`;
                    if (cellBorder?.right) borderStyles.borderRight = `${borderWidth}px solid ${borderColor}`;
                    if (cellBorder?.bottom) borderStyles.borderBottom = `${borderWidth}px solid ${borderColor}`;
                    if (cellBorder?.left) borderStyles.borderLeft = `${borderWidth}px solid ${borderColor}`;
                    
                    const hasCellBorder = cellBorder?.top || cellBorder?.right || cellBorder?.bottom || cellBorder?.left;
                    const cellStyle = tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex]?.style || {};
                    
                    const textStyles: React.CSSProperties = {
                      fontSize: `${cellStyle.fontSize || styleConfig.fontSize}px`,
                      fontWeight: cellStyle.bold ? 'bold' : 'normal',
                      fontStyle: cellStyle.italic ? 'italic' : 'normal',
                      color: cellStyle.color || '#000000',
                      backgroundColor: cellStyle.backgroundColor || 'transparent',
                      textAlign: cellStyle.align || 'left',
                      lineHeight: cellStyle.lineHeight || styleConfig.lineHeight,
                      textDecoration: cellStyle.underline ? 'underline' : cellStyle.textDecoration || 'none',
                      textTransform: cellStyle.textTransform || 'none',
                      paddingBottom: cellStyle.paragraphSpacing ? `${cellStyle.paragraphSpacing}px` : 0,
                      width: '100%',
                      minHeight: '20px',
                    };
                    
                    return (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        rowSpan={rowSpan && rowSpan > 1 ? rowSpan : undefined}
                        colSpan={colSpan && colSpan > 1 ? colSpan : undefined}
                        className={`p-1 text-sm ${!hasCellBorder ? 'border' : ''}`}
                        style={{
                          backgroundColor: cell?.backgroundColor || cell?.style?.backgroundColor || 'transparent',
                          verticalAlign: cell?.verticalAlign || 'middle',
                          ...borderStyles,
                        }}
                      >
                        {/* 保留列操作按钮空间（仅第一行，隐藏内容） */}
                        {rowIndex === 0 && (
                          <div className="w-2 h-2 rounded-full opacity-0" />
                        )}
                        
                        <div className="whitespace-pre-wrap" style={textStyles}>
                          {cellContent || ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // 渲染不同类型的组件
  const renderContent = () => {
    switch (component.type) {
      case 'text':
        const textComp = component as any;
        
        if (isEditing) {
          return (
            <div className="w-full p-2">
              <textarea
                ref={textareaRef}
                className="w-full min-h-[60px] p-2 border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={handleTextBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextBlur();
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                placeholder="输入文本..."
              />
            </div>
          );
        }

        return (
          <div
            className="w-full cursor-text"
            style={{
              padding: '0.5rem',
              fontSize: `${textComp.textStyle?.fontSize || styleConfig.fontSize}px`,
              fontWeight: textComp.textStyle?.bold ? 'bold' : 'normal',
              fontStyle: textComp.textStyle?.italic ? 'italic' : 'normal',
              color: textComp.textStyle?.color || '#000000',
              backgroundColor: textComp.textStyle?.backgroundColor || 'transparent',
              textAlign: textComp.textStyle?.align || 'left',
              lineHeight: textComp.textStyle?.lineHeight || styleConfig.lineHeight,
              marginBottom: textComp.textStyle?.paragraphSpacing ? `${textComp.textStyle.paragraphSpacing}px` : 0,
              textDecoration: textComp.textStyle?.underline ? 'underline' : textComp.textStyle?.textDecoration || 'none',
              textTransform: textComp.textStyle?.textTransform || 'none',
            }}
            onDoubleClick={handleDoubleClickText}
          >
            {textComp.textStyle?.headingLevel === 1 && (
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem' 
              }}>
                {textComp.content || '显示'}
              </h1>
            )}
            {textComp.textStyle?.headingLevel === 2 && (
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem' 
              }}>
                {textComp.content || '显示'}
              </h2>
            )}
            {textComp.textStyle?.listType === 'unordered' && !textComp.textStyle?.headingLevel && (
              <ul style={{ marginLeft: '1.5rem', paddingLeft: 0 }}>
                <li>{textComp.content || '显示'}</li>
              </ul>
            )}
            {textComp.textStyle?.listType === 'ordered' && !textComp.textStyle?.headingLevel && (
              <ol style={{ marginLeft: '1.5rem', paddingLeft: 0 }}>
                <li>{textComp.content || '显示'}</li>
              </ol>
            )}
            {!textComp.textStyle?.headingLevel && !textComp.textStyle?.listType && (
              <span>
                {textComp.textStyle?.linkUrl ? (
                  <a 
                    href={textComp.textStyle.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6', textDecoration: 'underline' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {textComp.content || '显示'}
                  </a>
                ) : (
                  textComp.content || '显示'
                )}
              </span>
            )}
          </div>
        );

      case 'table':
        const tableComp = component as any;
        
        // 编辑状态：表格内容，工具栏在 EditorPage 层面
        if (isCurrentTableEditing) {
          return (
            <div onDoubleClick={handleDoubleClickTable}>
              {renderTableContent(tableComp)}
            </div>
          );
        }
        
        // 非编辑状态：工具栏在右上角悬浮
        return (
          <div className="relative group" onDoubleClick={handleDoubleClickTable}>
            <div className="absolute -top-9 right-0 z-10">
              <HoverToolbar
                onEdit={handleEditTable}
                onDelete={handleDeleteComponent}
                onCopy={handleCopyComponent}
                isSelected={isSelected}
              />
            </div>
            {renderTableContent(tableComp)}
          </div>
        );

      case 'image':
        const imageComp = component as any;
        return (
          <div className="w-full flex items-center justify-center p-2">
            {imageComp.src ? (
              <img
                src={imageComp.src}
                alt={imageComp.alt || '图片'}
                className="max-w-full max-h-[300px] object-contain"
                style={{ objectFit: imageComp.fit || 'contain' }}
              />
            ) : (
              <div className="w-full h-32 flex items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded">
                <span className="text-sm text-muted-foreground">点击选择图片</span>
              </div>
            )}
          </div>
        );

      case 'qrcode':
        return (
          <div className="w-full flex flex-col items-center justify-center p-4">
            <canvas ref={canvasRef} />
            <p className="text-xs text-muted-foreground mt-2">
              {(component as any).content || '二维码内容'}
            </p>
          </div>
        );

      case 'barcode':
        return (
          <div className="w-full flex flex-col items-center justify-center p-4">
            <canvas ref={canvasRef} />
            <p className="text-xs text-muted-foreground mt-2">
              {(component as any).content || '条形码内容'}
            </p>
          </div>
        );

      case 'line':
        const lineComp = component as any;
        return (
          <div className="w-full p-2">
            <hr
              style={{
                border: 'none',
                height: `${lineComp.thickness || 1}px`,
                backgroundColor: lineComp.color || '#000000',
                borderTop: lineComp.style === 'dashed' ? '1px dashed #000' : 
                          lineComp.style === 'dotted' ? '1px dotted #000' : 'none',
              }}
            />
          </div>
        );

      default:
        const unknownComp = component as any;
        return (
          <div className="w-full p-4 text-center text-muted-foreground">
            未知组件类型: {unknownComp.type || 'unknown'}
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
}
