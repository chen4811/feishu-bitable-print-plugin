'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const { updateComponent, styleConfig, duplicateComponent, deleteComponent } = useEditorStore();
  
  // 通用状态
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [editContent, setEditContent] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 文本组件编辑
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (component.type === 'text') {
      setIsEditing(true);
      setEditContent((component as any).content);
    }
  }, [component]);

  const handleTextBlur = useCallback(() => {
    setIsEditing(false);
    if (component.type === 'text') {
      updateComponent(component.id, { content: editContent });
    }
  }, [component.id, component.type, editContent, updateComponent]);

  // 表格编辑
  const handleEditTable = useCallback((e?: React.MouseEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    alert('表格编辑功能开发中...');
  }, []);

  // 复制组件
  const handleCopyComponent = useCallback((e?: React.MouseEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    duplicateComponent(component.id);
  }, [component.id, duplicateComponent]);

  // 删除组件
  const handleDeleteComponent = useCallback((e?: React.MouseEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    deleteComponent(component.id);
  }, [component.id, deleteComponent]);

  // 鼠标事件
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

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

  // 自动聚焦到编辑框
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

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
            onDoubleClick={handleDoubleClick}
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
            {/* 悬停工具栏 - 只在 hover 且未选中或未编辑时显示 */}
            {(isHovered || isSelected) && !isEditing && (
              <HoverToolbar
                onEdit={handleEditTable}
                onDelete={handleDeleteComponent}
                onCopy={handleCopyComponent}
              />
            )}
            
            {tableComp.tableConfig?.cells ? (
              <div className="border overflow-hidden">
                <table className="w-full border-collapse">
                  <tbody>
                    {tableComp.tableConfig.cells.map((row: any[], rowIndex: number) => (
                      <tr key={rowIndex}>
                        {row.map((cell: any, colIndex: number) => (
                          <td
                            key={cell?.id || colIndex}
                            className="border p-2 text-sm"
                            style={{
                              backgroundColor: cell?.backgroundColor || 'transparent',
                            }}
                          >
                            {cell?.content || ''}
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
            )}
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
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-full"
    >
      {renderContent()}
    </div>
  );
}
