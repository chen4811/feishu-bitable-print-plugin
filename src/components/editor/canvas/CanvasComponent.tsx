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
  const componentId = useRef(`textarea-${Math.random().toString(36).substr(2, 9)}`);

  // 自动调整高度
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      // 关键修复：先重置高度，然后精确计算
      textareaRef.current.style.height = '0px'; // 强制重置为0，确保scrollHeight计算准确
      
      // 获取真实的内容高度
      const contentHeight = textareaRef.current.scrollHeight;
      
      // 设置最小高度为24px，最大高度不做限制（让表格自然扩展）
      const newHeight = Math.max(contentHeight, 24);
      
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  // 处理点击事件，确保阻止冒泡
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e);
  }, [onClick]);

  // 处理键盘事件 - 先阻止冒泡，再调用外部处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 先阻止冒泡，构建事件防火墙，防止任何事件逃逸到父组件
    e.stopPropagation();
    
    // 再调用外部传入的 onKeyDown（它会处理单独 Enter 的默认行为阻止）
    onKeyDown(e);
    
    // 注意：默认行为由外部 onKeyDown 决定是否阻止
  }, [onKeyDown]);

  // 处理 KeyUp 事件 - 阻止冒泡
  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  // 处理 KeyPress 事件 - 阻止冒泡
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  // 处理变化事件
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // 内容变化时调整高度
  useEffect(() => {
    adjustHeight();
  }, [value]); // 移除 adjustHeight 依赖，避免循环调用

  // 组件挂载时调整高度
  useEffect(() => {
    adjustHeight();
  }, []); // 只在挂载时执行一次

  // 监听输入事件，实时调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const handleInputEvent = () => {
        adjustHeight();
      };
      textarea.addEventListener('input', handleInputEvent);
      return () => textarea.removeEventListener('input', handleInputEvent);
    }
  }, []); // 只在挂载时设置一次监听器

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onKeyPress={handleKeyPress}
      className="w-full border-0 outline-none resize-none overflow-hidden"
      style={{ 
        height: '24px', // 初始高度设为24px，由 adjustHeight 动态调整
        minHeight: '24px',
        backgroundColor: 'transparent',
        padding: '4px', // 稍微增加一点 padding，避免文本紧贴边缘
        boxSizing: 'border-box', // 确保 padding 包含在高度计算中
        lineHeight: '1.5', // 确保行高稳定
        ...style,
      }}
    />
  );
};
import { CanvasComponentNode } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { parseVariables } from '@/utils/variableParser';
import { VariableTextRenderer } from '@/components/VariableTextRenderer';
import { VARIABLE_CHIP_STYLES } from '@/utils/smartVariableRenderer';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { HoverToolbar } from '../table/HoverToolbar';
import { RowActionMenu } from '../table/RowActionMenu';
import { ColumnActionMenu } from '../table/ColumnActionMenu';

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
    records,
    fields,
  } = useEditorStore();

  // 获取预览用的记录（优先使用第一条记录）
  const previewRecord = (() => {
    if (records && records.length > 0) {
      const firstRecord = records[0] as any;
      // 将 BitableRecord 格式转换为普通对象
      const recordData: Record<string, unknown> = {};
      
      // 优先处理直接在记录对象上的字段（飞书SDK返回的格式）
      Object.entries(firstRecord).forEach(([key, value]) => {
        if (key !== 'fields' && key !== 'id' && key !== 'createdTime' && key !== 'lastModifiedTime' && key !== '__tableName__') {
          recordData[key] = value;
        }
      });
      
      // 同时处理 fields 格式（兼容性处理）
      if (firstRecord.fields && typeof firstRecord.fields === 'object') {
        Object.entries(firstRecord.fields as Record<string, unknown>).forEach(([key, value]) => {
          if (recordData[key] === undefined) {
            recordData[key] = value;
          }
        });
      }
      
      // 关键：同时添加字段名到值的映射（支持通过字段名查找）
      if (fields && fields.length > 0) {
        fields.forEach(field => {
          // 优先从直接字段中获取
          let value = recordData[field.id];
          // 如果没有，尝试从 fields 对象中获取
          if (value === undefined && firstRecord.fields) {
            const fieldsObj = firstRecord.fields as Record<string, unknown>;
            value = fieldsObj[field.id];
          }
          if (value !== undefined) {
            recordData[field.name] = value;
          }
        });
      }
      
      return recordData;
    }
    return {};
  })();
  
  // 添加全局键盘事件监听器来检测事件是否逃逸
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 如果这里能捕获到 Enter 或 Backspace，说明事件逃逸了！
      if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
        // 事件逃逸检测
      }
    };
    
    const handleGlobalKeyUp = (_e: KeyboardEvent) => {
      // 事件处理
    };
    
    const handleGlobalKeyPress = (_e: KeyboardEvent) => {
      // 事件处理
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown, true); // 捕获阶段监听
    document.addEventListener('keyup', handleGlobalKeyUp, true);
    document.addEventListener('keypress', handleGlobalKeyPress, true);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      document.removeEventListener('keyup', handleGlobalKeyUp, true);
      document.removeEventListener('keypress', handleGlobalKeyPress, true);
    };
  }, [component.id]);
  
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
  
  // 行/列操作菜单的悬停状态
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);
  // 菜单自身的悬停状态
  const [isRowMenuHovered, setIsRowMenuHovered] = useState(false);
  const [isColMenuHovered, setIsColMenuHovered] = useState(false);
  // 定时器引用，用于延迟关闭菜单
  const rowMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 拖动调整行高列宽的状态
  const [resizingRow, setResizingRow] = useState<{ rowIndex: number; startY: number; startHeight: number } | null>(null);
  const [resizingCol, setResizingCol] = useState<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (rowMenuTimeoutRef.current) {
        clearTimeout(rowMenuTimeoutRef.current);
      }
      if (colMenuTimeoutRef.current) {
        clearTimeout(colMenuTimeoutRef.current);
      }
    };
  }, []);

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
      // 关键修复：保留所有原始单元格属性，特别是 rowSpan 和 colSpan！
      const newCells = tableComp.tableConfig.cells.map((rowData: any[], rowIndex: number) =>
        rowData.map((originalCell: any, colIndex: number) => {
          // 如果是当前编辑的单元格，更新 content，其他属性完全保留！
          if (rowIndex === row && colIndex === col) {
            return {
              ...originalCell, // 保留所有原始属性！包括 rowSpan、colSpan 等！
              content: value, // 只更新 content 字段
            };
          }
          // 其他单元格完全不变，原样返回
          return originalCell;
        })
      );
      
      updateComponent(component.id, {
        tableConfig: {
          ...tableComp.tableConfig,
          cells: newCells,
        },
      });
    }
  };

  // ========== 表格行/列操作核心逻辑 ==========
  
  // 在指定行上方插入新行
  const addRowAbove = useCallback((rowIndex: number) => {
    const tableComp = component as any;
    if (!tableComp.tableConfig?.cells) return;
    
    const colCount = tableComp.tableConfig.cells[0]?.length || 3;
    const newRow = Array(colCount).fill(null).map((_, colIndex) => ({
      id: `cell-${Date.now()}-${colIndex}`,
      content: '',
      backgroundColor: undefined,
      verticalAlign: 'middle',
      border: undefined,
      style: {},
    }));
    
    const newCells = [
      ...tableComp.tableConfig.cells.slice(0, rowIndex),
      newRow,
      ...tableComp.tableConfig.cells.slice(rowIndex),
    ];
    
    // 同时更新 tableEditData
    const newEditData = [
      ...tableEditData.slice(0, rowIndex),
      Array(colCount).fill(''),
      ...tableEditData.slice(rowIndex),
    ];
    setTableEditData(newEditData);
    
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
  }, [component, tableEditData, updateComponent]);

  // 在指定行下方插入新行
  const addRowBelow = useCallback((rowIndex: number) => {
    addRowAbove(rowIndex + 1);
  }, [addRowAbove]);

  // 删除指定行
  const deleteRow = useCallback((rowIndex: number) => {
    const tableComp = component as any;
    if (!tableComp.tableConfig?.cells || tableComp.tableConfig.cells.length <= 1) return;
    
    const newCells = tableComp.tableConfig.cells.filter((_: any, index: number) => index !== rowIndex);
    const newEditData = tableEditData.filter((_: any, index: number) => index !== rowIndex);
    
    setTableEditData(newEditData);
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
  }, [component, tableEditData, updateComponent]);

  // 在指定列左侧插入新列
  const addColumnLeft = useCallback((colIndex: number) => {
    const tableComp = component as any;
    if (!tableComp.tableConfig?.cells) return;
    
    const newCells = tableComp.tableConfig.cells.map((row: any[], rowIdx: number) => [
      ...row.slice(0, colIndex),
      {
        id: `cell-${Date.now()}-${rowIdx}`,
        content: '',
        backgroundColor: undefined,
        verticalAlign: 'middle',
        border: undefined,
        style: {},
      },
      ...row.slice(colIndex),
    ]);
    
    const newEditData = tableEditData.map((row: any[]) => [
      ...row.slice(0, colIndex),
      '',
      ...row.slice(colIndex),
    ]);
    
    setTableEditData(newEditData);
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
  }, [component, tableEditData, updateComponent]);

  // 在指定列右侧插入新列
  const addColumnRight = useCallback((colIndex: number) => {
    addColumnLeft(colIndex + 1);
  }, [addColumnLeft]);

  // 删除指定列
  const deleteColumn = useCallback((colIndex: number) => {
    const tableComp = component as any;
    if (!tableComp.tableConfig?.cells || tableComp.tableConfig.cells[0]?.length <= 1) return;
    
    const newCells = tableComp.tableConfig.cells.map((row: any[]) => 
      row.filter((_: any, index: number) => index !== colIndex)
    );
    
    const newEditData = tableEditData.map((row: any[]) => 
      row.filter((_: any, index: number) => index !== colIndex)
    );
    
    setTableEditData(newEditData);
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
  }, [component, tableEditData, updateComponent]);

  // 🔥 拖动调整行高
  const handleRowResizeMouseDown = useCallback((rowIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const tableComp = component as any;
    const rowHeights = tableComp.tableConfig?.rowHeights || [];
    const startHeight = rowHeights[rowIndex] || 40; // 默认高度
    
    setResizingRow({
      rowIndex,
      startY: e.clientY,
      startHeight,
    });
  }, [component]);

  // 🔥 拖动调整列宽
  const handleColResizeMouseDown = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const tableComp = component as any;
    const colWidths = tableComp.tableConfig?.colWidths || [];
    const startWidth = colWidths[colIndex] || 100; // 默认宽度
    
    setResizingCol({
      colIndex,
      startX: e.clientX,
      startWidth,
    });
  }, [component]);

  // 🔥 处理全局鼠标移动（用于拖动调整）
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (resizingRow) {
        const deltaY = e.clientY - resizingRow.startY;
        const newHeight = Math.max(20, resizingRow.startHeight + deltaY); // 最小高度20px
        
        const tableComp = component as any;
        const rowHeights = [...(tableComp.tableConfig?.rowHeights || [])];
        rowHeights[resizingRow.rowIndex] = newHeight;
        
        updateComponent(component.id, {
          tableConfig: {
            ...tableComp.tableConfig,
            rowHeights,
          },
        });
      }
      
      if (resizingCol) {
        const deltaX = e.clientX - resizingCol.startX;
        const newWidth = Math.max(50, resizingCol.startWidth + deltaX); // 最小宽度50px
        
        const tableComp = component as any;
        const colWidths = [...(tableComp.tableConfig?.colWidths || [])];
        colWidths[resizingCol.colIndex] = newWidth;
        
        updateComponent(component.id, {
          tableConfig: {
            ...tableComp.tableConfig,
            colWidths,
          },
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setResizingRow(null);
      setResizingCol(null);
    };

    if (resizingRow || resizingCol) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [resizingRow, resizingCol, component, updateComponent]);

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
      // 🔥 使用变量替换后的内容生成二维码
      const content = parseVariables(qrcodeComponent.content || '', previewRecord, fields);
      QRCode.toCanvas(canvasRef.current, content, {
        width: Math.min(qrcodeComponent.size || 150, 200),
        margin: 1,
      }).catch(console.error);
    }
  }, [component, previewRecord, fields]);

  // 生成条形码
  useEffect(() => {
    if (component.type === 'barcode' && canvasRef.current) {
      const barcodeComponent = component as any;
      try {
        canvasRef.current.innerHTML = '';
        // 🔥 使用变量替换后的内容生成条形码
        const content = parseVariables(barcodeComponent.content || '', previewRecord, fields);
        JsBarcode(canvasRef.current, content, {
          format: barcodeComponent.format || 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [component, previewRecord, fields]);

  // 辅助函数：生成列标（A, B, C... AA, AB...）
  const getColumnLabel = (index: number): string => {
    let label = '';
    let remaining = index;
    while (true) {
      label = String.fromCharCode(65 + (remaining % 26)) + label;
      remaining = Math.floor(remaining / 26) - 1;
      if (remaining < 0) break;
    }
    return label;
  };

  // 辅助函数：判断行是否可见（只要这一行有任何可见的单元格就显示行号）
  const isRowVisible = (tableComp: any, rowIndex: number): boolean => {
    if (!tableComp.tableConfig?.cells) return true;
    const row = tableComp.tableConfig.cells[rowIndex];
    if (!row) return false;
    // 只要这一行有任何一个单元格的 rowSpan 不是 0，就显示行号
    return row.some((cell: any) => cell?.rowSpan !== 0);
  };

  // 辅助函数：判断列是否可见（只要这一列有任何可见的单元格就显示列标）
  const isColumnVisible = (tableComp: any, colIndex: number): boolean => {
    if (!tableComp.tableConfig?.cells) return true;
    // 只要这一列有任何一个单元格的 colSpan 不是 0，就显示列标
    return tableComp.tableConfig.cells.some((row: any[]) => {
      const cell = row[colIndex];
      return cell?.colSpan !== 0;
    });
  };

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

    const colCount = tableEditData[0]?.length || 0;
    const colWidths = tableComp.tableConfig?.colWidths || [];
    const rowHeights = tableComp.tableConfig?.rowHeights || [];

    return (
      <div 
        onMouseUp={handleCellMouseUp}
        onMouseLeave={handleTableMouseLeave}
      >
        {/* 注入变量芯片样式 */}
        <style dangerouslySetInnerHTML={{ __html: VARIABLE_CHIP_STYLES }} />
        <table className="w-full border-collapse">
          <tbody>
            {/* 列标行 */}
            {isCurrentTableEditing && (
              <tr>
                {/* 左上角角落单元格 */}
                <td 
                  style={{
                    width: '40px',
                    minWidth: '40px',
                    maxWidth: '40px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                  }}
                />
                {/* 列标单元格 - 只显示可见的列 */}
                {Array(colCount).fill(null).map((_, colIndex) => {
                  if (!isColumnVisible(tableComp, colIndex)) {
                    return null;
                  }
                  const colWidth = colWidths[colIndex];
                  return (
                    <td
                      key={`col-header-${colIndex}`}
                      className="relative group cursor-pointer select-none"
                      style={{
                        backgroundColor: hoveredColIndex === colIndex ? '#e5e7eb' : '#f9fafb',
                        border: '1px solid #e5e7eb',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        padding: '4px 8px',
                        fontWeight: 500,
                        fontSize: '12px',
                        color: '#374151',
                        width: colWidth ? `${colWidth}px` : undefined,
                        minWidth: colWidth ? `${colWidth}px` : undefined,
                      }}
                      onMouseEnter={() => {
                        // 清除之前的定时器
                        if (colMenuTimeoutRef.current) {
                          clearTimeout(colMenuTimeoutRef.current);
                          colMenuTimeoutRef.current = null;
                        }
                        setHoveredColIndex(colIndex);
                      }}
                      onMouseLeave={() => {
                        // 延迟 300ms 关闭，给用户时间移动鼠标到菜单上
                        colMenuTimeoutRef.current = setTimeout(() => {
                          if (!isColMenuHovered) {
                            setHoveredColIndex(null);
                          }
                        }, 300);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getColumnLabel(colIndex)}
                      {/* 列操作菜单 */}
                      {(hoveredColIndex === colIndex || isColMenuHovered) && hoveredColIndex === colIndex && (
                        <ColumnActionMenu
                          onAddLeft={() => addColumnLeft(colIndex)}
                          onAddRight={() => addColumnRight(colIndex)}
                          onDelete={() => deleteColumn(colIndex)}
                          position="top"
                          onMouseEnter={() => {
                            if (colMenuTimeoutRef.current) {
                              clearTimeout(colMenuTimeoutRef.current);
                              colMenuTimeoutRef.current = null;
                            }
                            setIsColMenuHovered(true);
                          }}
                          onMouseLeave={() => {
                            setIsColMenuHovered(false);
                            // 延迟 300ms 关闭
                            colMenuTimeoutRef.current = setTimeout(() => {
                              setHoveredColIndex(null);
                            }, 300);
                          }}
                        />
                      )}
                      {/* 🔥 列宽调整手柄 - 仅在编辑模式下显示 */}
                      {isCurrentTableEditing && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                          style={{ zIndex: 10 }}
                          onMouseDown={(e) => handleColResizeMouseDown(colIndex, e)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            )}
            
            {/* 数据行 */}
            {tableEditData.map((row: any[], rowIndex: number) => {
              const isHeader = rowIndex < (tableComp.tableConfig?.headerRows || 0);
              const isFooter = rowIndex >= tableEditData.length - (tableComp.tableConfig?.footerRows || 0);
              const isVisible = isRowVisible(tableComp, rowIndex);
              
              return (
                <tr 
                  key={rowIndex}
                  className={isHeader ? 'bg-gray-100 font-semibold' : isFooter ? 'bg-gray-50' : ''}
                >
                {/* 行号单元格 - 只显示可见的行 */}
                {isCurrentTableEditing && isVisible && (
                  <td
                    key={`row-header-${rowIndex}`}
                    className="relative group cursor-pointer select-none"
                    style={{
                      width: '40px',
                      minWidth: '40px',
                      maxWidth: '40px',
                      backgroundColor: hoveredRowIndex === rowIndex ? '#e5e7eb' : '#f9fafb',
                      border: '1px solid #e5e7eb',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      padding: '4px 8px',
                      fontWeight: 500,
                      fontSize: '12px',
                      color: '#374151',
                      height: rowHeights[rowIndex] ? `${rowHeights[rowIndex]}px` : undefined,
                    }}
                    onMouseEnter={() => {
                      // 清除之前的定时器
                      if (rowMenuTimeoutRef.current) {
                        clearTimeout(rowMenuTimeoutRef.current);
                        rowMenuTimeoutRef.current = null;
                      }
                      setHoveredRowIndex(rowIndex);
                    }}
                    onMouseLeave={() => {
                      // 延迟 300ms 关闭，给用户时间移动鼠标到菜单上
                      rowMenuTimeoutRef.current = setTimeout(() => {
                        if (!isRowMenuHovered) {
                          setHoveredRowIndex(null);
                        }
                      }, 300);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rowIndex + 1}
                    {/* 行操作菜单 */}
                    {(hoveredRowIndex === rowIndex || isRowMenuHovered) && hoveredRowIndex === rowIndex && (
                      <RowActionMenu
                        onAddAbove={() => addRowAbove(rowIndex)}
                        onAddBelow={() => addRowBelow(rowIndex)}
                        onDelete={() => deleteRow(rowIndex)}
                        position="left"
                        onMouseEnter={() => {
                          if (rowMenuTimeoutRef.current) {
                            clearTimeout(rowMenuTimeoutRef.current);
                            rowMenuTimeoutRef.current = null;
                          }
                          setIsRowMenuHovered(true);
                        }}
                        onMouseLeave={() => {
                          setIsRowMenuHovered(false);
                          // 延迟 300ms 关闭
                          rowMenuTimeoutRef.current = setTimeout(() => {
                            setHoveredRowIndex(null);
                          }, 300);
                        }}
                      />
                    )}
                    {/* 🔥 行高调整手柄 - 仅在编辑模式下显示 */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500"
                      style={{ zIndex: 10 }}
                      onMouseDown={(e) => handleRowResizeMouseDown(rowIndex, e)}
                    />
                  </td>
                )}
                
                {/* 数据单元格 */}
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
                  const borderWidth = cellBorder?.width || tableComp.tableConfig?.borderWidth || 2;
                  const borderColor = cellBorder?.color || tableComp.tableConfig?.borderColor || '#6b7280';
                  
                  // 🔥 获取列宽和行高
                  const colWidth = colWidths[colIndex];
                  const rowHeight = rowHeights[rowIndex];
                  
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
                      className={`p-1 text-sm cursor-pointer transition-colors select-none`}
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
                        width: colWidth ? `${colWidth}px` : undefined,
                        minWidth: colWidth ? `${colWidth}px` : undefined,
                        height: rowHeight ? `${rowHeight}px` : undefined,
                        // 强制添加默认边框，确保表格线明显
                        border: !hasCellBorder ? `${borderWidth}px solid ${borderColor}` : undefined,
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
                        
                        // 关键修复：容器 div 只做样式传递，不干扰高度计算
                        const containerStyles = {
                          // 只传递影响文本显示的样式，不传递可能影响高度的样式
                          fontSize: textStyles.fontSize,
                          fontWeight: textStyles.fontWeight,
                          fontStyle: textStyles.fontStyle,
                          color: textStyles.color,
                          textAlign: textStyles.textAlign,
                          lineHeight: textStyles.lineHeight,
                          textDecoration: textStyles.textDecoration,
                          textTransform: textStyles.textTransform,
                          backgroundColor: textStyles.backgroundColor,
                          // 确保容器不会限制高度
                          minHeight: undefined,
                          height: undefined,
                          overflow: 'visible',
                        };
                        
                        return (
                          <div 
                            className="w-full" 
                            style={containerStyles}
                            // 关键：防止容器 div 干扰键盘事件
                            onKeyDown={(e) => e.stopPropagation()}
                            onKeyUp={(e) => e.stopPropagation()}
                            onKeyPress={(e) => e.stopPropagation()}
                          >
                            <AutoResizingTextarea
                              value={cellContent || ''}
                              onChange={(value) => handleTableCellChange(rowIndex, colIndex, value)}
                              onClick={(e) => {}} // AutoResizingTextarea 内部已处理冒泡
                              onKeyDown={(e) => {
                                // 只有单独的 Enter（不带 Shift）才阻止默认行为
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                }
                                // Shift+Enter、Delete、Backspace 等键：不阻止默认行为，正常编辑
                                
                                // 注意：e.stopPropagation() 已经在 AutoResizingTextarea 内部先调用了
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
                              <VariableTextRenderer
                                text={cellContent || ''}
                                records={records || []}
                                fields={fields || []}
                                tagName="span"
                              />
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
                              <VariableTextRenderer
                                text={cellContent || ''}
                                records={records || []}
                                fields={fields || []}
                                tagName="span"
                              />
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
                                <VariableTextRenderer
                                  text={cellContent || ''}
                                  records={records || []}
                                  fields={fields || []}
                                  tagName="span"
                                />
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
                                <VariableTextRenderer
                                  text={cellContent || ''}
                                  records={records || []}
                                  fields={fields || []}
                                  tagName="span"
                                />
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
                              <VariableTextRenderer
                                text={cellContent || ''}
                                records={records || []}
                                fields={fields || []}
                                tagName="span"
                              />
                            </a>
                          );
                        }
                        // 默认文本样式
                        return (
                          <span style={baseTextStyle}>
                            <VariableTextRenderer
                              text={cellContent || ''}
                              records={records || []}
                              fields={fields || []}
                              tagName="span"
                            />
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
            <div
              className="w-full cursor-text whitespace-pre-wrap"
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
                whiteSpace: 'pre-wrap',
              }}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <textarea
                ref={textareaRef}
                className="w-full border-0 outline-none resize-none bg-transparent"
                style={{
                  all: 'unset', // 🔥 清除所有默认样式
                  fontSize: '1em',
                  fontWeight: 'inherit',
                  fontStyle: 'inherit',
                  color: 'inherit',
                  textAlign: 'inherit',
                  lineHeight: 'inherit',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: 'transparent',
                  minHeight: '1.5em',
                  padding: '0',
                  margin: '0',
                  textIndent: '0',
                  boxSizing: 'border-box',
                  border: 'none',
                  outline: 'none',
                  display: 'block', // 🔥 块级元素，整行显示
                  width: '100%', // 🔥 宽度100%，整行可用
                  fontFamily: 'inherit',
                  cursor: 'text',
                  overflow: 'visible',
                  resize: 'none',
                }}
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
            className="w-full cursor-text whitespace-pre-wrap"
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
              whiteSpace: 'pre-wrap',
            }}
            onDoubleClick={handleDoubleClickText}
          >
            {/* 注入变量芯片样式 */}
            <style dangerouslySetInnerHTML={{ __html: VARIABLE_CHIP_STYLES }} />
            
            {textComp.textStyle?.headingLevel === 1 && (
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem' 
              }}>
                <VariableTextRenderer
                  text={textComp.content || '显示'}
                  records={records || []}
                  fields={fields || []}
                  tagName="span"
                />
              </h1>
            )}
            {textComp.textStyle?.headingLevel === 2 && (
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem' 
              }}>
                <VariableTextRenderer
                  text={textComp.content || '显示'}
                  records={records || []}
                  fields={fields || []}
                  tagName="span"
                />
              </h2>
            )}
            {textComp.textStyle?.listType === 'unordered' && !textComp.textStyle?.headingLevel && (
              <ul style={{ marginLeft: '1.5rem', paddingLeft: 0 }}>
                <li>
                  <VariableTextRenderer
                    text={textComp.content || '显示'}
                    records={records || []}
                    fields={fields || []}
                    tagName="span"
                  />
                </li>
              </ul>
            )}
            {textComp.textStyle?.listType === 'ordered' && !textComp.textStyle?.headingLevel && (
              <ol style={{ marginLeft: '1.5rem', paddingLeft: 0 }}>
                <li>
                  <VariableTextRenderer
                    text={textComp.content || '显示'}
                    records={records || []}
                    fields={fields || []}
                    tagName="span"
                  />
                </li>
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
                    <VariableTextRenderer
                      text={textComp.content || '显示'}
                      records={records || []}
                      fields={fields || []}
                      tagName="span"
                    />
                  </a>
                ) : (
                  <VariableTextRenderer
                    text={textComp.content || '显示'}
                    records={records || []}
                    fields={fields || []}
                    tagName="span"
                  />
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
        const qrcodeComp = component as any;
        // 🔥 二维码内容也进行变量替换
        const qrcodeContent = parseVariables(qrcodeComp.content || '二维码内容', previewRecord, fields);
        return (
          <div className="w-full flex flex-col items-center justify-center p-4">
            <canvas ref={canvasRef} />
            <p className="text-xs text-muted-foreground mt-2">
              {qrcodeContent}
            </p>
          </div>
        );

      case 'barcode':
        const barcodeComp = component as any;
        // 🔥 条形码内容也进行变量替换
        const barcodeContent = parseVariables(barcodeComp.content || '条形码内容', previewRecord, fields);
        return (
          <div className="w-full flex flex-col items-center justify-center p-4">
            <canvas ref={canvasRef} />
            <p className="text-xs text-muted-foreground mt-2">
              {barcodeContent}
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
