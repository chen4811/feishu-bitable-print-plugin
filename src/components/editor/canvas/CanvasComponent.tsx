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
      setEditContent((component as any).content);
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
    console.log('合并单元格');
  };

  const handleHeaderFooterChange = (headerRows: number, footerRows: number) => {
    console.log('设置表头/表尾', headerRows, footerRows);
  };

  const handleBorderChange = (hasBorder: boolean) => {
    console.log('设置边框', hasBorder);
  };

  const handleAlignmentChange = (alignment: 'left' | 'center' | 'right') => {
    console.log('设置对齐', alignment);
  };

  const handleColorChange = (color: string) => {
    console.log('设置颜色', color);
  };

  const handleInsertLink = () => {
    console.log('插入链接');
  };

  const handleInsertQRCode = () => {
    console.log('插入二维码');
  };

  const handleInsertBarcode = () => {
    console.log('插入条形码');
  };

  const handleInsertImage = () => {
    console.log('插入图片');
  };

  const handleInsertArticle = () => {
    console.log('插入文章');
  };

  const handleInsertAttachment = () => {
    console.log('插入附件');
  };

  const handleAdvancedConfig = () => {
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
                {textComp.content || '双击编辑文本'}
              </h1>
            )}
            {textComp.textStyle?.headingLevel === 2 && (
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem' 
              }}>
                {textComp.content || '双击编辑文本'}
              </h2>
            )}
            {/* 列表样式渲染 */}
            {textComp.textStyle?.listType === 'unordered' && !textComp.textStyle?.headingLevel && (
              <ul style={{ marginLeft: '1.5rem', paddingLeft: 0 }}>
                <li>{textComp.content || '双击编辑文本'}</li>
              </ul>
            )}
            {textComp.textStyle?.listType === 'ordered' && !textComp.textStyle?.headingLevel && (
              <ol style={{ marginLeft: '1.5rem', paddingLeft: 0 }}>
                <li>{textComp.content || '双击编辑文本'}</li>
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
                    {textComp.content || '双击编辑文本'}
                  </a>
                ) : (
                  textComp.content || '双击编辑文本'
                )}
              </span>
            )}
          </div>
        );

      case 'table':
        const tableComp = component as any;
        
        return (
          <div className="w-full relative">
            {/* 高级编辑工具栏 - 编辑状态时显示 */}
            {isTableEditing && (
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
              />
            )}
            
            <div className="w-full relative group" onDoubleClick={handleDoubleClickTable}>
              {/* 悬停工具栏 - 非编辑状态时显示 */}
              {!isTableEditing && (
                <HoverToolbar
                  onEdit={handleEditTable}
                  onDelete={handleDeleteComponent}
                  onCopy={handleCopyComponent}
                  isSelected={isSelected}
                />
              )}
              
              {tableComp.tableConfig?.cells ? (
                <div className="border overflow-hidden">
                  <table className="w-full border-collapse">
                    <tbody>
                      {tableEditData.map((row: any[], rowIndex: number) => (
                        <tr key={rowIndex}>
                          {row.map((cellContent: any, colIndex: number) => (
                            <td
                              key={`${rowIndex}-${colIndex}`}
                              className="border p-1 text-sm"
                              style={{
                                backgroundColor: tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex]?.backgroundColor || 'transparent',
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
                                  {cellContent || ''}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground border">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Pencil className="w-4 h-4" />
                    <span>表格组件</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="default" size="sm" onClick={handleEditTable}>
                      {isTableEditing ? '完成编辑' : '编辑表格'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleCopyComponent}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDeleteComponent}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* 编辑状态提示 */}
              {isTableEditing && (
                <div className="text-xs text-center text-muted-foreground mt-1">
                  点击单元格编辑内容，点击"完成编辑"退出
                </div>
              )}
            </div>
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
