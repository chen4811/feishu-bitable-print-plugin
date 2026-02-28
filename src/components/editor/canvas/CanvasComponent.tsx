'use client';

import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { EditorComponent, TextComponent, QRCodeComponent, BarcodeComponent, LineComponent } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Move, ChevronDown, ChevronRight } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

interface CanvasComponentProps {
  component: EditorComponent;
  isSelected: boolean;
  onSelect: () => void;
}

export function CanvasComponent({ component, isSelected, onSelect }: CanvasComponentProps) {
  const { updateComponent, removeComponent, styleConfig } = useEditorStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 文本组件编辑
  const handleDoubleClick = () => {
    if (component.type === 'text') {
      setIsEditing(true);
      setEditContent((component as TextComponent).content);
    }
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (component.type === 'text') {
      updateComponent(component.id, { content: editContent });
    }
  };

  // 生成二维码
  useEffect(() => {
    if (component.type === 'qrcode' && canvasRef.current) {
      const qrcodeComponent = component as QRCodeComponent;
      QRCode.toCanvas(canvasRef.current, qrcodeComponent.content, {
        width: qrcodeComponent.size,
        margin: 1,
      });
    }
  }, [component]);

  // 生成条形码
  useEffect(() => {
    if (component.type === 'barcode' && canvasRef.current) {
      const barcodeComponent = component as BarcodeComponent;
      try {
        JsBarcode(canvasRef.current, barcodeComponent.content, {
          format: barcodeComponent.format,
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
        const textComp = component as TextComponent;
        if (isEditing) {
          return (
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={handleTextBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleTextBlur()}
              className="h-auto min-h-[40px] resize-none"
              autoFocus
            />
          );
        }
        return (
          <div
            style={{
              fontSize: `${textComp.fontSize || styleConfig.fontSize}pt`,
              fontWeight: textComp.fontWeight,
              textAlign: textComp.textAlign,
              lineHeight: textComp.lineHeight || styleConfig.lineHeight,
              fontFamily: styleConfig.fontFamily,
            }}
          >
            {textComp.content}
          </div>
        );

      case 'qrcode':
        const qrcodeComp = component as QRCodeComponent;
        return (
          <div className="flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={qrcodeComp.size}
              height={qrcodeComp.size}
            />
          </div>
        );

      case 'barcode':
        const barcodeComp = component as BarcodeComponent;
        return (
          <div className="flex items-center justify-center">
            <canvas ref={canvasRef} />
          </div>
        );

      case 'line':
        const lineComp = component as LineComponent;
        return (
          <div
            style={{
              width: '100%',
              height: `${lineComp.thickness}px`,
              backgroundColor: lineComp.color,
              borderTop: lineComp.style === 'dashed' ? '2px dashed ' + lineComp.color : undefined,
            }}
          />
        );

      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted rounded">
            <span className="text-xs text-muted-foreground">图片占位</span>
          </div>
        );

      case 'table':
        return (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-muted">
                <th className="border border-gray-300 p-2 text-xs">列1</th>
                <th className="border border-gray-300 p-2 text-xs">列2</th>
                <th className="border border-gray-300 p-2 text-xs">列3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 text-xs">数据</td>
                <td className="border border-gray-300 p-2 text-xs">数据</td>
                <td className="border border-gray-300 p-2 text-xs">数据</td>
              </tr>
            </tbody>
          </table>
        );

      case 'autoTable':
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded border-2 border-dashed">
            <span className="text-xs text-muted-foreground">自动表格（拖拽字段配置）</span>
          </div>
        );

      case 'freeElement':
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded border-2 border-dashed">
            <span className="text-xs text-muted-foreground">自由元素</span>
          </div>
        );

      case 'article':
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded border-2 border-dashed">
            <span className="text-xs text-muted-foreground">文章区块</span>
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted rounded">
            <span className="text-xs text-muted-foreground">{(component as EditorComponent).type}</span>
          </div>
        );
    }
  };

  return (
    <div
      className={`absolute cursor-move group ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      style={{
        left: `${component.x}px`,
        top: `${component.y}px`,
        width: `${component.width}px`,
        minHeight: `${component.height}px`,
        zIndex: component.zIndex,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* 选中时的控制按钮 */}
      {isSelected && (
        <div className="absolute -top-8 left-0 flex items-center gap-1 bg-background border rounded px-1 py-0.5 shadow-sm">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Move className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              removeComponent(component.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* 组件内容 */}
      <div className="w-full h-full overflow-hidden">
        {renderContent()}
      </div>

      {/* hover 效果 */}
      {!isSelected && (
        <div className="absolute inset-0 border border-transparent hover:border-primary/50 pointer-events-none transition-colors" />
      )}
    </div>
  );
}
