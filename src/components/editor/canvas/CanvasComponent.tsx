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

    return (
      <div 
        onMouseUp={handleCellMouseUp}
        onMouseLeave={handleTableMouseLeave}
      >
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
                {row.map((cellContent: any, colIndex: number) => {
                  const cell = tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex];
                  const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
                  
                  // 检查是否是被合并的单元格（rowSpan 或 colSpan 为 0）
                  const rowSpan = cell?.rowSpan;
                  const colSpan = cell?.colSpan;
                  
                  // 如果是被合并的单元格，不渲染
                  if (rowSpan === 0 || colSpan === 0) {
                    return null;
                  }
                  
                  const isCellInRange = isCellInSelection(rowIndex, colIndex);
                  const isCellSelected = tableEditing.selectedCells.includes(cellId) || isCellInRange;
                  const cellBorder = cell?.border;
                  const borderWidth = cellBorder?.width || tableComp.tableConfig?.borderWidth || 1;
                  const borderColor = cellBorder?.color || tableComp.tableConfig?.borderColor || '#000000';
                  
                  // 构建边框样式
                  const borderStyles: any = {};
                  if (cellBorder?.top) {
                    borderStyles.borderTop = `${borderWidth}px solid ${borderColor}`;
                  }
                  if (cellBorder?.right) {
                    borderStyles.borderRight = `${borderWidth}px solid ${borderColor}`;
                  }
                  if (cellBorder?.bottom) {
                    borderStyles.borderBottom = `${borderWidth}px solid ${borderColor}`;
                  }
                  if (cellBorder?.left) {
                    borderStyles.borderLeft = `${borderWidth}px solid ${borderColor}`;
                  }
                  
                  // 如果没有设置单元格边框，使用默认边框
                  const hasCellBorder = cellBorder?.top || cellBorder?.right || cellBorder?.bottom || cellBorder?.left;
                  
                  return (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      rowSpan={rowSpan && rowSpan > 1 ? rowSpan : undefined}
                      colSpan={colSpan && colSpan > 1 ? colSpan : undefined}
                      className={`p-1 text-sm cursor-pointer transition-colors select-none ${!hasCellBorder ? 'border' : ''}`}
                      style={{
                        backgroundColor: (() => {
                          const cellBgColor = cell?.backgroundColor;
                          const cellTextBgColor = cell?.style?.backgroundColor;
                          
                          if (isCellSelected) {
                            // 如果有单元格背景色，使用半透明蓝色叠加
                            if (cellBgColor || cellTextBgColor) {
                              return 'rgba(59, 130, 246, 0.2)';
                            }
                            return '#dbeafe';
                          }
                          
                          // 优先使用单元格背景色，其次是文本背景色
                          return cellBgColor || cellTextBgColor || 'transparent';
                        })(),
                        userSelect: 'none',
                        verticalAlign: cell?.verticalAlign || 'middle',
                        ...borderStyles,
                      }}
                      onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                      onMouseEnter={(e) => handleCellMouseMove(rowIndex, colIndex, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrentTableEditing && !cellSelection.isSelecting) {
                          // 只有在没有拖动选择时才处理单击
                          setTableEditing({
                            selectedCells: [cellId],
                          });
                          // 同时设置单元格编辑状态
                          setTableCellEditing({
                            isEditing: true,
                            tableId: component.id,
                            cellId,
                            rowIndex,
                            colIndex,
                          });
                        }
                      }}
                    >
                    {(() => {
                      const cellStyle = tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex]?.style || {};
                      
                      // 构建单元格文本样式
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

                      // 编辑模式 - 应用样式到 textarea
                      if (isCurrentTableEditing) {
                        // 为 textarea 构建样式（只应用影响文本显示的样式）
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
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.stopPropagation();
                                }
                              }}
                              style={textareaStyles}
                            />
                          </div>
                        );
                      }

                      // 预览模式 - 渲染带样式的内容
                      // 处理标题、列表等特殊样式
                      const renderContentWithStyle = () => {
                        // 基础文本样式
                        const baseTextStyle: React.CSSProperties = {
                          fontSize: `${cellStyle.fontSize || styleConfig.fontSize}px`,
                          fontWeight: cellStyle.bold ? 'bold' : 'normal',
                          fontStyle: cellStyle.italic ? 'italic' : 'normal',
                          color: cellStyle.color || '#000000',
                          textAlign: cellStyle.align || 'left',
                          lineHeight: cellStyle.lineHeight || styleConfig.lineHeight,
                          textDecoration: cellStyle.underline ? 'underline' : cellStyle.textDecoration || 'none',
                          textTransform: cellStyle.textTransform || 'none',
                          margin: 0,
                          padding: 0,
                          display: 'block',
                          width: '100%',
                        };

                        // 标题样式
                        if (cellStyle.headingLevel === 1) {
                          return (
                            <h1 style={{ 
                              ...baseTextStyle,
                              fontSize: cellStyle.fontSize ? `${cellStyle.fontSize}px` : '24px',
                              fontWeight: 'bold',
                            }}>
                              {cellContent || ''}
                            </h1>
                          );
                        }
                        if (cellStyle.headingLevel === 2) {
                          return (
                            <h2 style={{ 
                              ...baseTextStyle,
                              fontSize: cellStyle.fontSize ? `${cellStyle.fontSize}px` : '18px',
                              fontWeight: 'bold',
                            }}>
                              {cellContent || ''}
                            </h2>
                          );
                        }
                        // 列表样式
                        if (cellStyle.listType === 'unordered' && !cellStyle.headingLevel) {
                          return (
                            <ul style={{ 
                              marginLeft: '1.5rem', 
                              paddingLeft: 0,
                              textAlign: baseTextStyle.textAlign,
                              lineHeight: baseTextStyle.lineHeight,
                            }}>
                              <li style={{
                                fontSize: baseTextStyle.fontSize,
                                fontWeight: baseTextStyle.fontWeight,
                                fontStyle: baseTextStyle.fontStyle,
                                color: baseTextStyle.color,
                                textDecoration: baseTextStyle.textDecoration,
                              }}>
                                {cellContent || ''}
                              </li>
                            </ul>
                          );
                        }
                        if (cellStyle.listType === 'ordered' && !cellStyle.headingLevel) {
                          return (
                            <ol style={{ 
                              marginLeft: '1.5rem', 
                              paddingLeft: 0,
                              textAlign: baseTextStyle.textAlign,
                              lineHeight: baseTextStyle.lineHeight,
                            }}>
                              <li style={{
                                fontSize: baseTextStyle.fontSize,
                                fontWeight: baseTextStyle.fontWeight,
                                fontStyle: baseTextStyle.fontStyle,
                                color: baseTextStyle.color,
                                textDecoration: baseTextStyle.textDecoration,
                              }}>
                                {cellContent || ''}
                              </li>
                            </ol>
                          );
                        }
                        // 链接样式
                        if (cellStyle.linkUrl) {
                          return (
                            <a 
                              href={cellStyle.linkUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                ...baseTextStyle,
                                color: '#3b82f6', 
                                textDecoration: 'underline',
                                display: 'inline',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {cellContent || ''}
                            </a>
                          );
                        }
                        // 默认文本样式
                        return (
                          <span style={baseTextStyle}>
                            {cellContent || ''}
                          </span>
                        );
                      };

                      return (
                        <div 
                          className="whitespace-pre-wrap" 
                          style={textStyles}
                        >
                          {renderContentWithStyle()}
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
