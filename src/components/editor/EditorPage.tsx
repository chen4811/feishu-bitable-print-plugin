'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEditorStore } from '@/store/editorStore';
import { ComponentType, PAGE_SIZES, TextComponent } from '@/types/editor';
import {
  Database,
  LayoutGrid,
  Settings,
  Printer,
  Trash2,
  Undo2,
  Redo2,
  FileText,
  Pencil,
  Save,
  Download,
  Eye,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { TextToolbar } from './TextToolbar';
import { AdvancedToolbar } from './table/AdvancedToolbar';
import { HeaderFooterSettingsDialog } from './dialogs/HeaderFooterSettingsDialog';
import { ComponentTextStyle, TextCanvasNode } from '@/types/editor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataSourcePanel } from './panels/DataSourcePanel';
import { ComponentPanel } from './panels/ComponentPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { CanvasArea } from './canvas/CanvasArea';
import { PageSettingsDialog } from './dialogs/PageSettingsDialog';
import { PrintPreviewDialog } from './dialogs/PrintPreviewDialog';
import { usePrintSDK } from '@/hooks/usePrintSDK';

interface EditorPageProps {
  onExit: () => void;
}

// 左侧面板标签
type LeftPanelTab = 'data' | 'components' | 'settings';

export function EditorPage({ onExit }: EditorPageProps) {
  const [activeTab, setActiveTab] = useState<LeftPanelTab>('data');
  const [isPageSettingsOpen, setIsPageSettingsOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: string; data?: unknown } | null>(null);

  const {
    templateName,
    setTemplateName,
    pageConfig,
    styleConfig,
    components,
    selectedComponentId,
    addComponent,
    updateComponent,
    undo,
    redo,
    clearCanvas,
    history,
    historyIndex,
    tableEditing,
    setTableEditing,
    tableCellEditing,
    setTableCellEditing,
  } = useEditorStore();

  // 获取当前正在编辑的表格
  const currentEditingTable = tableEditing.tableId 
    ? components.find(comp => comp.id === tableEditing.tableId) as any 
    : null;

  // 获取所有选中单元格的位置
  const getSelectedCellPositions = (): { row: number; col: number }[] => {
    if (!currentEditingTable) return [];
    
    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];
    const positions: { row: number; col: number }[] = [];
    
    cells.forEach((row: any[], rowIndex: number) => {
      row.forEach((cell: any, colIndex: number) => {
        const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
        if (tableEditing.selectedCells.includes(cellId)) {
          positions.push({ row: rowIndex, col: colIndex });
        }
      });
    });
    
    // 如果没有选中的单元格，使用当前正在编辑的单元格
    if (positions.length === 0 && tableCellEditing.rowIndex !== null && tableCellEditing.colIndex !== null) {
      positions.push({ row: tableCellEditing.rowIndex, col: tableCellEditing.colIndex });
    }
    
    return positions;
  };

  // 获取当前选中单元格的文本样式（取第一个选中单元格的样式）
  const getCurrentTableCellTextStyle = (): ComponentTextStyle => {
    // 默认样式 - 包含所有必需属性
    const defaultStyle: ComponentTextStyle = {
      fontSize: styleConfig.fontSize,
      color: '#000000',
      bold: false,
      italic: false,
      underline: false,
      align: 'left',
      lineHeight: styleConfig.lineHeight,
      backgroundColor: undefined,
      headingLevel: null,
      listType: null,
      textDecoration: 'none',
      textTransform: 'none',
    };

    if (!currentEditingTable) {
      return defaultStyle;
    }

    const positions = getSelectedCellPositions();
    if (positions.length === 0) {
      return defaultStyle;
    }

    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];
    const cell = cells[positions[0].row]?.[positions[0].col];

    if (cell?.style) {
      return {
        ...defaultStyle,
        ...cell.style,
      };
    }

    return defaultStyle;
  };

  // 更新表格单元格文本样式
  const updateTableCellTextStyle = (updates: Partial<ComponentTextStyle>) => {
    if (!currentEditingTable) {
      return;
    }

    const positions = getSelectedCellPositions();
    if (positions.length === 0) {
      return;
    }

    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];

    // 创建新的单元格数据
    const newCells = cells.map((row: any[]) => 
      row.map((cell: any) => ({ ...cell }))
    );

    // 更新所有选中单元格的样式
    positions.forEach(({ row, col }) => {
      if (!newCells[row][col].style) {
        newCells[row][col].style = {};
      }

      newCells[row][col].style = {
        ...newCells[row][col].style,
        ...updates,
      };
    });

    updateComponent(currentEditingTable.id, {
      tableConfig: {
        ...tableConfig,
        cells: newCells,
      },
    });
  };

  // 合并单元格
  const handleMergeCells = useCallback(() => {
    if (!currentEditingTable || tableEditing.selectedCells.length < 2) {
      return;
    }

    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];
    
    // 获取所有选中单元格的位置
    const selectedPositions: { row: number; col: number; cell: any }[] = [];
    
    cells.forEach((row: any[], rowIndex: number) => {
      row.forEach((cell: any, colIndex: number) => {
        const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
        if (tableEditing.selectedCells.includes(cellId)) {
          selectedPositions.push({ row: rowIndex, col: colIndex, cell });
        }
      });
    });

    if (selectedPositions.length < 2) return;

    // 找出选中区域的边界
    const minRow = Math.min(...selectedPositions.map(p => p.row));
    const maxRow = Math.max(...selectedPositions.map(p => p.row));
    const minCol = Math.min(...selectedPositions.map(p => p.col));
    const maxCol = Math.max(...selectedPositions.map(p => p.col));

    // 检查是否是矩形区域
    const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (selectedPositions.length !== expectedCount) {
      alert('请选择一个矩形区域来合并单元格');
      return;
    }

    // 创建新的单元格数据
    const newCells = cells.map((row: any[]) => 
      row.map((cell: any) => ({ ...cell }))
    );

    // 收集所有选中单元格的内容，用换行符连接
    const allContents = selectedPositions
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .map(p => p.cell?.content || '')
      .filter(Boolean)
      .join('\n');

    // 设置左上角单元格为合并后的单元格
    newCells[minRow][minCol] = {
      ...newCells[minRow][minCol],
      rowSpan: maxRow - minRow + 1,
      colSpan: maxCol - minCol + 1,
      content: allContents,
    };

    // 标记其他被合并的单元格（设置 rowSpan: 0, colSpan: 0 来表示被合并）
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row !== minRow || col !== minCol) {
          newCells[row][col] = {
            ...newCells[row][col],
            rowSpan: 0,
            colSpan: 0,
          };
        }
      }
    }

    updateComponent(currentEditingTable.id, {
      tableConfig: {
        ...tableConfig,
        cells: newCells,
      },
    });

    // 清除选中状态，只保留合并后的单元格选中
    const mergedCellId = newCells[minRow][minCol].id || `cell-${minRow}-${minCol}`;
    setTableEditing({
      selectedCells: [mergedCellId],
    });
  }, [currentEditingTable, tableEditing.selectedCells, updateComponent, setTableEditing]);

  // 表格字体大小增减
  const increaseTableCellFontSize = () => {
    const currentStyle = getCurrentTableCellTextStyle();
    updateTableCellTextStyle({ fontSize: Math.min(72, currentStyle.fontSize + 2) });
  };

  const decreaseTableCellFontSize = () => {
    const currentStyle = getCurrentTableCellTextStyle();
    updateTableCellTextStyle({ fontSize: Math.max(8, currentStyle.fontSize - 2) });
  };

  // 处理表头表尾弹窗打开
  const handleOpenHeaderFooterDialog = () => {
    setTableEditing({
      headerFooterDialogOpen: true,
      onOpenHeaderFooterDialog: handleOpenHeaderFooterDialog,
    });
  };

  // 处理表头行变化
  const handleHeaderRowsChange = (rows: number) => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...currentEditingTable.tableConfig,
          headerRows: rows,
        },
      });
    }
  };

  // 处理表尾行变化
  const handleFooterRowsChange = (rows: number) => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...currentEditingTable.tableConfig,
          footerRows: rows,
        },
      });
    }
  };

  // 处理弹窗关闭
  const handleHeaderFooterDialogClose = () => {
    setTableEditing({
      headerFooterDialogOpen: false,
    });
  };

  // 处理边框变化
  const handleBorderChange = (borderType: string) => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      const tableConfig = currentEditingTable.tableConfig;
      const cells = tableConfig?.cells || [];
      const borderWidth = tableConfig?.borderWidth || 1;
      
      // 获取选中的单元格位置
      const selectedPositions: { row: number; col: number }[] = [];
      
      cells.forEach((row: any[], rowIndex: number) => {
        row.forEach((cell: any, colIndex: number) => {
          const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
          if (tableEditing.selectedCells.includes(cellId)) {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          }
        });
      });
      
      // 如果没有选中单元格，使用整个表格
      if (selectedPositions.length === 0) {
        cells.forEach((row: any[], rowIndex: number) => {
          row.forEach((cell: any, colIndex: number) => {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          });
        });
      }
      
      // 创建新的单元格数据
      const newCells = cells.map((row: any[]) => 
        row.map((cell: any) => ({ ...cell }))
      );
      
      // 根据边框类型设置
      selectedPositions.forEach(({ row, col }) => {
        if (!newCells[row][col].border) {
          newCells[row][col].border = {};
        }
        
        switch (borderType) {
          case 'left':
            newCells[row][col].border.left = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'right':
            newCells[row][col].border.right = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'top':
            newCells[row][col].border.top = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'bottom':
            newCells[row][col].border.bottom = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'all':
            newCells[row][col].border.top = true;
            newCells[row][col].border.right = true;
            newCells[row][col].border.bottom = true;
            newCells[row][col].border.left = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'outer':
            // 设置外边框
            const isFirstRow = row === 0;
            const isLastRow = row === cells.length - 1;
            const isFirstCol = col === 0;
            const isLastCol = col === (cells[0]?.length || 0) - 1;
            
            if (isFirstRow) newCells[row][col].border.top = true;
            if (isLastRow) newCells[row][col].border.bottom = true;
            if (isFirstCol) newCells[row][col].border.left = true;
            if (isLastCol) newCells[row][col].border.right = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'none':
            newCells[row][col].border.top = false;
            newCells[row][col].border.right = false;
            newCells[row][col].border.bottom = false;
            newCells[row][col].border.left = false;
            break;
        }
      });
      
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...tableConfig,
          cells: newCells,
        },
      });
    }
  };

  // 处理边框粗细变化
  const handleBorderWidthChange = (width: number) => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      const tableConfig = currentEditingTable.tableConfig;
      const cells = tableConfig?.cells || [];
      
      // 获取选中的单元格位置
      const selectedPositions: { row: number; col: number }[] = [];
      
      cells.forEach((row: any[], rowIndex: number) => {
        row.forEach((cell: any, colIndex: number) => {
          const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
          if (tableEditing.selectedCells.includes(cellId)) {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          }
        });
      });
      
      // 如果没有选中单元格，使用整个表格
      if (selectedPositions.length === 0) {
        cells.forEach((row: any[], rowIndex: number) => {
          row.forEach((cell: any, colIndex: number) => {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          });
        });
      }
      
      // 创建新的单元格数据
      const newCells = cells.map((row: any[]) => 
        row.map((cell: any) => ({ ...cell }))
      );
      
      // 更新选中单元格的边框粗细
      selectedPositions.forEach(({ row, col }) => {
        if (!newCells[row][col].border) {
          newCells[row][col].border = {};
        }
        newCells[row][col].border.width = width;
      });
      
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...tableConfig,
          borderWidth: width,
          cells: newCells,
        },
      });
    }
  };

  // 处理垂直对齐变化
  const handleAlignmentChange = (align: 'top' | 'middle' | 'bottom') => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      const tableConfig = currentEditingTable.tableConfig;
      const cells = tableConfig?.cells || [];
      
      // 获取选中的单元格位置
      const selectedPositions: { row: number; col: number }[] = [];
      
      cells.forEach((row: any[], rowIndex: number) => {
        row.forEach((cell: any, colIndex: number) => {
          const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
          if (tableEditing.selectedCells.includes(cellId)) {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          }
        });
      });
      
      // 如果没有选中单元格，使用整个表格
      if (selectedPositions.length === 0) {
        cells.forEach((row: any[], rowIndex: number) => {
          row.forEach((cell: any, colIndex: number) => {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          });
        });
      }
      
      // 创建新的单元格数据
      const newCells = cells.map((row: any[]) => 
        row.map((cell: any) => ({ ...cell }))
      );
      
      // 更新选中单元格的垂直对齐
      selectedPositions.forEach(({ row, col }) => {
        newCells[row][col].verticalAlign = align;
      });
      
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...tableConfig,
          cells: newCells,
        },
      });
    }
  };

  // 当进入表格编辑模式时，设置回调函数
  useEffect(() => {
    if (tableEditing.isEditing && tableEditing.tableId && !tableEditing.onMergeCells) {
      // 只在第一次进入编辑模式且回调函数未设置时才设置
      setTableEditing({
        onMergeCells: handleMergeCells,
        onOpenHeaderFooterDialog: handleOpenHeaderFooterDialog,
        onBorderChange: handleBorderChange,
        onBorderWidthChange: handleBorderWidthChange,
        onColorChange: (colorType: 'text' | 'fill', color: string) => {
          console.log('颜色变化:', colorType, color);
        },
        onFinishEdit: () => {
          setTableEditing({
            isEditing: false,
            tableId: null,
            selectedCells: [],
            headerFooterDialogOpen: false,
          });
        },
      });
    }
  }, [tableEditing.isEditing, tableEditing.tableId, tableEditing.onMergeCells, setTableEditing]);

  // 智能聚焦：选中组件时自动切换到数据源面板
  useEffect(() => {
    if (selectedComponentId) {
      const selectedComponent = components.find(c => c.id === selectedComponentId);
      if (selectedComponent && (selectedComponent.type === 'text' || selectedComponent.type === 'table')) {
        setActiveTab('data');
      }
    }
  }, [selectedComponentId, components, setActiveTab]);

  // 获取当前选中的文本组件
  const selectedTextComponent = components.find(
    (c) => c.id === selectedComponentId && c.type === 'text'
  ) as TextCanvasNode | undefined;

  // 文字编辑操作 - 更新 textStyle
  const updateTextStyle = (updates: Partial<ComponentTextStyle>) => {
    if (selectedTextComponent) {
      updateComponent(selectedTextComponent.id, {
        textStyle: {
          ...selectedTextComponent.textStyle,
          ...updates,
        },
      });
    }
  };

  // 字体大小增减
  const increaseFontSize = () => {
    if (selectedTextComponent) {
      const currentSize = selectedTextComponent.textStyle?.fontSize || styleConfig.fontSize;
      updateTextStyle({ fontSize: Math.min(72, currentSize + 2) });
    }
  };

  const decreaseFontSize = () => {
    if (selectedTextComponent) {
      const currentSize = selectedTextComponent.textStyle?.fontSize || styleConfig.fontSize;
      updateTextStyle({ fontSize: Math.max(8, currentSize - 2) });
    }
  };

  const { isLoading, isFeishuEnvironment, tableName, fields, records } = usePrintSDK();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.id as string;
    setDraggedItem({ type });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (over && over.id === 'canvas') {
      const type = active.id as ComponentType;
      addComponent(type);
    }
  };

  const handleAddComponent = useCallback((type: ComponentType) => {
    addComponent(type);
  }, [addComponent]);

  const handlePrint = () => {
    setIsPrintPreviewOpen(true);
  };

  const handleExport = async () => {
    // TODO: 实现 PDF 导出
    alert('PDF 导出功能开发中...');
  };

  // 纸张尺寸显示
  const pageSizeDisplay = `${pageConfig.size}/${pageConfig.orientation === 'portrait' ? '纵向' : '横向'}`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-background">
        {/* 顶部工具栏 */}
        <header className="border-b bg-background/95 backdrop-blur z-50">
          <div className="flex items-center justify-between px-4 py-3">
            {/* 左侧 */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onExit}>
                ← 退出
              </Button>
              
              {/* 模板名称 */}
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                    className="w-48 h-8"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="font-medium">{templateName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
              
              {/* 数据源状态 */}
              {isLoading ? (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  加载数据...
                </Badge>
              ) : isFeishuEnvironment ? (
                <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {tableName} · {records.length} 条
                </Badge>
              ) : null}
            </div>

            {/* 右侧 */}
            <div className="flex items-center gap-2">
              {/* 纸张设置 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPageSettingsOpen(true)}
              >
                {pageSizeDisplay}
              </Button>

              {/* 撤销/重做 */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none border-r"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>

              {/* 清空 */}
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                disabled={components.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                清空
              </Button>

              {/* 打印 */}
              <Button size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                打印
              </Button>
            </div>
          </div>
        </header>

        {/* 文字编辑工具栏 - 仅在选中文本组件且不在编辑表格时显示 */}
        {selectedTextComponent && !tableEditing.isEditing && (
          <div className="border-b bg-background/95 backdrop-blur px-4 py-2">
            <TextToolbar
              textStyle={{
                fontSize: selectedTextComponent.textStyle?.fontSize || styleConfig.fontSize,
                color: selectedTextComponent.textStyle?.color || '#000000',
                bold: selectedTextComponent.textStyle?.bold || false,
                italic: selectedTextComponent.textStyle?.italic || false,
                underline: selectedTextComponent.textStyle?.underline || false,
                align: selectedTextComponent.textStyle?.align || 'left',
                backgroundColor: selectedTextComponent.textStyle?.backgroundColor,
                lineHeight: selectedTextComponent.textStyle?.lineHeight || styleConfig.lineHeight,
                paragraphSpacing: selectedTextComponent.textStyle?.paragraphSpacing,
                linkUrl: selectedTextComponent.textStyle?.linkUrl,
                headingLevel: selectedTextComponent.textStyle?.headingLevel,
                listType: selectedTextComponent.textStyle?.listType,
                textDecoration: selectedTextComponent.textStyle?.textDecoration,
                textTransform: selectedTextComponent.textStyle?.textTransform,
              }}
              onChange={updateTextStyle}
              onIncreaseFontSize={increaseFontSize}
              onDecreaseFontSize={decreaseFontSize}
            />
          </div>
        )}

        {/* 表格内容编辑工具栏 - 仅在编辑表格且选中单元格时显示 */}
        {tableEditing.isEditing && (
          <div className="border-b bg-background/95 backdrop-blur px-4 py-2">
            <TextToolbar
              textStyle={getCurrentTableCellTextStyle()}
              onChange={updateTableCellTextStyle}
              onIncreaseFontSize={increaseTableCellFontSize}
              onDecreaseFontSize={decreaseTableCellFontSize}
            />
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧面板 */}
          <aside className="w-64 border-r flex flex-col bg-muted/30">
            {/* 标签切换 */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as LeftPanelTab)}
              className="w-full"
            >
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="data"
                  className="flex-col gap-1 py-2 px-4 rounded-none data-[state=active]:bg-background"
                >
                  <Database className="w-4 h-4" />
                  <span className="text-xs">数据源</span>
                </TabsTrigger>
                <TabsTrigger
                  value="components"
                  className="flex-col gap-1 py-2 px-4 rounded-none data-[state=active]:bg-background"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-xs">组件</span>
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex-col gap-1 py-2 px-4 rounded-none data-[state=active]:bg-background"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-xs">设置</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto">
                <TabsContent value="data" className="m-0">
                  <DataSourcePanel onAddField={(field) => {
                    // 添加文本组件并设置内容为字段变量
                    addComponent('text');
                  }} />
                </TabsContent>
                <TabsContent value="components" className="m-0">
                  <ComponentPanel onAddComponent={handleAddComponent} />
                </TabsContent>
                <TabsContent value="settings" className="m-0">
                  <SettingsPanel />
                </TabsContent>
              </div>
            </Tabs>

            {/* 快速指南 */}
            <div className="border-t p-3 bg-background">
              <p className="text-xs font-medium mb-2">快速指南</p>
              <div className="space-y-1">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground">
                  如何创建新模板
                </Button>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground block">
                  基本排版操作
                </Button>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground block">
                  在排版中引用明细表
                </Button>
              </div>
            </div>
          </aside>

          {/* 右侧画布区 */}
          <main className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900">
            {/* 表格编辑工具栏 - 仅在编辑表格时显示，在画布上方 */}
            {tableEditing.isEditing && (
              <div className="bg-background border-b px-4 py-2">
                <AdvancedToolbar
                  onMergeCells={tableEditing.onMergeCells}
                  selectedCellCount={tableEditing.selectedCells.length}
                  onOpenHeaderFooterDialog={handleOpenHeaderFooterDialog}
                  onBorderChange={handleBorderChange}
                  onBorderWidthChange={handleBorderWidthChange}
                  borderWidth={currentEditingTable?.tableConfig?.borderWidth || 1}
                  onAlignmentChange={handleAlignmentChange}
                  verticalAlign={(() => {
                    if (!currentEditingTable?.tableConfig?.cells) return 'middle';
                    const cells = currentEditingTable.tableConfig.cells;
                    
                    // 获取第一个选中的单元格的对齐状态
                    for (let row = 0; row < cells.length; row++) {
                      for (let col = 0; col < cells[row].length; col++) {
                        const cellId = cells[row][col]?.id || `cell-${row}-${col}`;
                        if (tableEditing.selectedCells.includes(cellId)) {
                          return cells[row][col]?.verticalAlign || 'middle';
                        }
                      }
                    }
                    return 'middle';
                  })()}
                  onColorChange={tableEditing.onColorChange}
                  onFinishEdit={() => {
                    tableEditing.onFinishEdit();
                    handleHeaderFooterDialogClose();
                  }}
                />
              </div>
            )}

            {/* 表头表尾设置弹窗 */}
            {currentEditingTable && (
              <HeaderFooterSettingsDialog
                open={tableEditing.headerFooterDialogOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    handleHeaderFooterDialogClose();
                  } else {
                    setTableEditing({ headerFooterDialogOpen: true });
                  }
                }}
                headerRows={currentEditingTable.tableConfig?.headerRows || 0}
                footerRows={currentEditingTable.tableConfig?.footerRows || 0}
                onHeaderRowsChange={handleHeaderRowsChange}
                onFooterRowsChange={handleFooterRowsChange}
                maxRows={currentEditingTable.tableConfig?.cells?.length || 0}
              />
            )}
            {/* 画布区域 */}
            <div className="p-6">
              <CanvasArea />
            </div>
          </main>
        </div>

        {/* 底部状态栏 */}
        <footer className="border-t px-4 py-2 bg-background text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>* 改动将自动保存</span>
          </div>
          <div className="flex items-center gap-4">
            <span>组件: {components.length}</span>
            <span>|</span>
            <span>纸张: {PAGE_SIZES[pageConfig.size]?.width}×{PAGE_SIZES[pageConfig.size]?.height}mm</span>
          </div>
        </footer>
      </div>

      {/* 弹窗 */}
      <PageSettingsDialog
        open={isPageSettingsOpen}
        onOpenChange={setIsPageSettingsOpen}
      />
      <PrintPreviewDialog
        open={isPrintPreviewOpen}
        onOpenChange={setIsPrintPreviewOpen}
      />

      {/* 拖拽预览 */}
      <DragOverlay>
        {draggedItem && (
          <div className="p-3 bg-background border rounded-lg shadow-lg">
            <span className="text-sm">{draggedItem.type}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
