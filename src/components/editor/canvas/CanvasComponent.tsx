'use client';

import { useState, useRef, useEffect } from 'react';
import { CanvasComponentNode } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { HoverToolbar } from '../table/HoverToolbar';
import { AdvancedToolbar } from '../table/AdvancedToolbar';
import { Portal } from '@/components/common/Portal';

interface CanvasComponentProps {
  component: CanvasComponentNode;
  isSelected: boolean;
  onSelect: () => void;
}

export function CanvasComponent({ component, isSelected, onSelect }: CanvasComponentProps) {
  const { updateComponent, styleConfig, duplicateComponent, deleteComponent } = useEditorStore();
  
  // 通用状态
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 表格编辑状态
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [tableEditData, setTableEditData] = useState<any[][]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);

  // 文本组件编辑
  const handleDoubleClickText = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (component.type === 'text') {
      setIsEditing(true);
      // 如果有实际内容则编辑实际内容，否则为空
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
  const handleEditTable = (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    setIsTableEditing(prev => !prev);
  };

  // 双击表格进入编辑
  const handleDoubleClickTable = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTableEditing(true);
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

  // 高级工具栏处理函数
  const handleMergeCells = () => {
    if (component.type !== 'table') return;
    
    const tableComp = component as any;
    if (selectedCells.length < 2) return;
    
    // 简单实现：合并第一个和第二个选中的单元格
    // 实际应用中需要更复杂的合并逻辑
    console.log('合并单元格:', selectedCells);
    setSelectedCells([]);
  };

  const handleHeaderFooterChange = (headerRows: number, footerRows: number) => {
    if (component.type !== 'table') return;
    
    const tableComp = component as any;
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        headerRows,
        footerRows,
      },
    });
  };

  const handleBorderChange = (hasBorder: boolean) => {
    if (component.type !== 'table') return;
    
    const tableComp = component as any;
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        showOuterBorder: hasBorder,
        showInnerBorder: hasBorder,
        borderWidth: hasBorder ? 1 : 0,
      },
    });
  };

  const handleAlignmentChange = (alignment: 'left' | 'center' | 'right') => {
    if (component.type !== 'table') return;
    
    const tableComp = component as any;
    // 更新选中单元格的对齐方式
    if (selectedCells.length > 0) {
      const newCells = tableComp.tableConfig.cells.map((row: any[]) =>
        row.map((cell: any) => {
          if (selectedCells.includes(cell.id)) {
            return {
              ...cell,
              style: {
                ...cell.style,
                align: alignment,
              },
            };
          }
          return cell;
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

  const handleColorChange = (color: string) => {
    if (component.type !== 'table') return;
    
    const tableComp = component as any;
    // 更新选中单元格的背景色
    if (selectedCells.length > 0) {
      const newCells = tableComp.tableConfig.cells.map((row: any[]) =>
        row.map((cell: any) => {
          if (selectedCells.includes(cell.id)) {
            return {
              ...cell,
              backgroundColor: color,
            };
          }
          return cell;
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

  const handleInsertLink = () => {
    if (component.type !== 'table') return;
    
    // 简单实现：在选中的单元格中插入链接
    // 实际应用中应该弹出对话框让用户输入链接
    const tableComp = component as any;
    if (selectedCells.length > 0) {
      const newCells = tableComp.tableConfig.cells.map((row: any[]) =>
        row.map((cell: any) => {
          if (selectedCells.includes(cell.id)) {
            return {
              ...cell,
              content: cell.content + ' [链接]',
            };
          }
          return cell;
        })
      );
      updateComponent(component.id, {
        tableConfig: {
          ...tableComp.tableConfig,
          cells: newCells,
        },
      });
      // 更新编辑数据
      setTableEditData(newCells.map((row: any[]) => row.map((cell: any) => cell.content)));
    }
  };

  const handleInsertQRCode = () => {
    // 在编辑器中插入二维码组件
    // 实际应用中应该在旁边插入新的二维码组件
    console.log('插入二维码');
  };

  const handleInsertBarcode = () => {
    // 在编辑器中插入条形码组件
    console.log('插入条形码');
  };

  const handleInsertImage = () => {
    // 在编辑器中插入图片组件
    console.log('插入图片');
  };

  const handleInsertArticle = () => {
    // 在编辑器中插入文章组件
    console.log('插入文章');
  };

  const handleInsertAttachment = () => {
    // 在编辑器中插入附件组件
    console.log('插入附件');
  };

  const handleAdvancedConfig = () => {
    // 打开循环字段高级配置对话框
    console.log('循环字段高级配置');
  };

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

  // 渲染表格内容（独立函数，避免代码重复）
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
                const cellId = tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex]?.id || `cell-${rowIndex}-${colIndex}`;
                const isCellSelected = selectedCells.includes(cellId);
                
                return (
                  <td
                    key={`${rowIndex}-${colIndex}`}
                    className={`border p-1 text-sm cursor-pointer transition-colors ${isCellSelected ? 'bg-blue-100' : ''}`}
                    style={{
                      backgroundColor: isCellSelected ? '#dbeafe' : (tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex]?.backgroundColor || 'transparent'),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isTableEditing) {
                        // 编辑模式下，点击选择单元格
                        setSelectedCells(prev => {
                          if (e.shiftKey) {
                            // Shift + 点击：多选
                            return [...prev, cellId];
                          } else {
                            // 普通点击：单选
                            return prev.includes(cellId) 
                              ? prev.filter(id => id !== cellId) 
                              : [cellId];
                          }
                        });
                      }
                    }}
                  >
                    {isTableEditing ? (
                      <input
                        type="text"
                        value={cellContent || ''}
                        onChange={(e) => handleTableCellChange(rowIndex, colIndex, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full border-0 bg-transparent outline-none p-1"
                      />
                    ) : (
                      <span className="p-1 block min-h-[20px]">
                        {cellContent}
                      </span>
                    )}
                  </td>
                );
              })}
              </tr>
            );
          })}
        </tbody>
      </table>
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
            {/* 标题样式渲染 */}
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
            {/* 列表样式渲染 */}
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
            {/* 普通文本 */}
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
        
        // 编辑状态：使用 Portal 将工具栏渲染到 body 根节点，完全独立于表格
        if (isTableEditing) {
          return (
            <>
              {/* 使用 Portal 将工具栏渲染到 body，完全独立于表格 */}
              <Portal>
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
                  <AdvancedToolbar
                    onMergeCells={handleMergeCells}
                    selectedCellCount={selectedCells.length}
                    onHeaderFooterChange={handleHeaderFooterChange}
                    onBorderChange={handleBorderChange}
                    onAlignmentChange={handleAlignmentChange}
                    onColorChange={handleColorChange}
                    onInsertLink={handleInsertLink}
                    onInsertQRCode={handleInsertQRCode}
                    onInsertBarcode={handleInsertBarcode}
                    onInsertImage={handleInsertImage}
                    onInsertArticle={handleInsertArticle}
                    onInsertAttachment={handleInsertAttachment}
                    onAdvancedConfig={handleAdvancedConfig}
                    onFinishEdit={handleEditTable}
                  />
                </div>
              </Portal>
              
              {/* 表格内容 - 纯粹的原生表格，没有任何包裹 */}
              <div className="mt-16" onDoubleClick={handleDoubleClickTable}>
                {renderTableContent(tableComp)}
              </div>
            </>
          );
        }
        
        // 非编辑状态：工具栏在右上角悬浮，表格就是纯粹的原生表格
        return (
          <div className="relative group" onDoubleClick={handleDoubleClickTable}>
            {/* 非编辑状态下，悬浮工具栏在右上角 */}
            <div className="absolute -top-9 right-0 z-10">
              <HoverToolbar
                onEdit={handleEditTable}
                onDelete={handleDeleteComponent}
                onCopy={handleCopyComponent}
                isSelected={isSelected}
              />
            </div>
            
            {/* 表格内容 - 纯粹的原生表格，没有任何包裹 */}
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
          <div className="w-full p-4 text-center text-muted-foreground border">
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
