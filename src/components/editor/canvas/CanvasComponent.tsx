'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { EditorComponent, TextComponent, QRCodeComponent, BarcodeComponent, LineComponent, AutoTableComponent } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { ResizableWrapper } from './ResizableWrapper';
import { Button } from '@/components/ui/button';
import { Trash2, Move, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Type, FileText } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { isElement, preventDefaultSafe } from '@/utils/domUtils';
import { 
  containsVariables, 
  replaceVariablesWithChips, 
  extractVariableNames 
} from '@/utils/variableUtils';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import '@/styles/variable-chip.css';

interface CanvasComponentProps {
  component: EditorComponent;
  isSelected: boolean;
  onSelect: () => void;
}

export function CanvasComponent({ component, isSelected, onSelect }: CanvasComponentProps) {
  const { updateComponent, removeComponent, styleConfig, components, moveComponentUp, moveComponentDown, bringToFront, sendToBack, feishuContext } = useEditorStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [useRichTextEditor, setUseRichTextEditor] = useState(false);
  const [showStyleSettings, setShowStyleSettings] = useState(false);
  const [componentStyle, setComponentStyle] = useState({
    showBorder: false,
    borderColor: '#000000',
    borderWidth: 1,
    backgroundColor: 'transparent',
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 文本组件编辑
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // 安全检查
    if (!isElement(e.target)) return;
    
    if (component.type === 'text') {
      setIsEditing(true);
      setEditContent((component as TextComponent).content);
    }
  }, [component]);

  const handleTextBlur = useCallback(() => {
    setIsEditing(false);
    if (component.type === 'text') {
      updateComponent(component.id, { content: editContent });
    }
  }, [component.id, component.type, editContent, updateComponent]);

  // 富文本编辑器内容变更处理
  const handleRichTextChange = useCallback((content: string) => {
    if (component.type === 'text') {
      updateComponent(component.id, { content });
    }
  }, [component.id, component.type, updateComponent]);

  // 粘贴事件处理
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (component.type !== 'text') return;
    
    const pastedText = e.clipboardData.getData('text');
    
    // 检查是否包含变量
    if (containsVariables(pastedText)) {
      preventDefaultSafe(e);
      
      console.log('[CanvasComponent] 检测到变量粘贴:', pastedText);
      console.log('[CanvasComponent] 当前飞书上下文:', feishuContext);
      
      // 替换变量为芯片 HTML
      const processedHtml = replaceVariablesWithChips(pastedText, feishuContext);
      
      console.log('[CanvasComponent] 处理后的 HTML:', processedHtml);
      
      // 获取当前光标位置
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        // 由于 textarea 不支持 HTML，我们直接插入处理后的文本
        // 如果有芯片，我们会在保存到 store 时保留原始格式
        const newContent = 
          editContent.substring(0, start) + 
          pastedText + 
          editContent.substring(end);
        
        setEditContent(newContent);
        
        console.log('[CanvasComponent] 更新编辑内容:', newContent);
      } else {
        // 如果无法获取光标位置，直接追加
        setEditContent(editContent + pastedText);
      }
    }
  }, [component.type, editContent, feishuContext, preventDefaultSafe]);

  // 生成二维码
  useEffect(() => {
    if (component.type === 'qrcode' && canvasRef.current) {
      const qrcodeComponent = component as QRCodeComponent;
      QRCode.toCanvas(canvasRef.current, qrcodeComponent.content, {
        width: Math.min(qrcodeComponent.size, component.width),
        margin: 1,
      }).catch(console.error);
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
          height: 40,
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
        
        // 如果选中，显示编辑模式切换和样式设置
        if (isSelected && !isEditing) {
          return (
            <div className="w-full h-full relative">
              {/* 编辑器模式切换 */}
              <div className="absolute -top-8 right-0 flex items-center gap-1 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <FileText className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setUseRichTextEditor(false)}>
                      <Type className="w-4 h-4 mr-2" />
                      简单文本
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setUseRichTextEditor(true)}>
                      <FileText className="w-4 h-4 mr-2" />
                      富文本编辑
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* 样式设置按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowStyleSettings(!showStyleSettings)}
                >
                  🎨
                </Button>
              </div>
              
              {/* 样式设置面板 */}
              {showStyleSettings && (
                <div className="absolute -top-32 right-0 bg-background border rounded-lg p-3 shadow-lg z-20 w-64">
                  <h4 className="text-sm font-medium mb-2">组件样式</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showBorder"
                        checked={componentStyle.showBorder}
                        onChange={(e) => setComponentStyle({ ...componentStyle, showBorder: e.target.checked })}
                      />
                      <label htmlFor="showBorder" className="text-xs">显示边框</label>
                    </div>
                    {componentStyle.showBorder && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">边框颜色:</span>
                          <input
                            type="color"
                            value={componentStyle.borderColor}
                            onChange={(e) => setComponentStyle({ ...componentStyle, borderColor: e.target.value })}
                            className="w-8 h-6"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">边框宽度:</span>
                          <input
                            type="number"
                            value={componentStyle.borderWidth}
                            onChange={(e) => setComponentStyle({ ...componentStyle, borderWidth: parseInt(e.target.value) || 1 })}
                            className="w-16 h-6 text-xs border rounded px-1"
                            min="1"
                            max="10"
                          />
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs">背景色:</span>
                      <input
                        type="color"
                        value={componentStyle.backgroundColor === 'transparent' ? '#ffffff' : componentStyle.backgroundColor}
                        onChange={(e) => setComponentStyle({ ...componentStyle, backgroundColor: e.target.value })}
                        className="w-8 h-6"
                      />
                      {componentStyle.backgroundColor !== 'transparent' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setComponentStyle({ ...componentStyle, backgroundColor: 'transparent' })}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* 编辑器内容区域 */}
              {useRichTextEditor ? (
                <RichTextEditor
                  content={textComp.content}
                  onChange={handleRichTextChange}
                  placeholder="在这里输入文字..."
                  className="w-full h-full"
                />
              ) : (
                <div
                  className="whitespace-pre-wrap w-full h-full cursor-pointer"
                  style={{
                    fontSize: `${textComp.fontSize || styleConfig.fontSize}pt`,
                    fontWeight: textComp.fontWeight,
                    textAlign: textComp.textAlign,
                    lineHeight: textComp.lineHeight || styleConfig.lineHeight,
                    fontFamily: styleConfig.fontFamily,
                    border: componentStyle.showBorder ? `${componentStyle.borderWidth}px solid ${componentStyle.borderColor}` : 'none',
                    backgroundColor: componentStyle.backgroundColor,
                    borderRadius: '4px',
                    padding: componentStyle.showBorder ? '8px' : '0',
                  }}
                  onDoubleClick={handleDoubleClick}
                  dangerouslySetInnerHTML={{ 
                    __html: containsVariables(textComp.content) && feishuContext 
                      ? replaceVariablesWithChips(textComp.content, feishuContext)
                      : textComp.content 
                  }}
                />
              )}
            </div>
          );
        }
        
        if (isEditing) {
          return (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={handleTextBlur}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextBlur();
                }
              }}
              className="w-full h-full min-h-[40px] p-1 border-0 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-primary pointer-events-auto"
              style={{
                fontSize: `${textComp.fontSize || styleConfig.fontSize}pt`,
                fontFamily: styleConfig.fontFamily,
              }}
              autoFocus
            />
          );
        }
        
        // 渲染非编辑状态，尝试解析变量
        const displayContent = containsVariables(textComp.content) && feishuContext 
          ? replaceVariablesWithChips(textComp.content, feishuContext)
          : textComp.content;
          
        return (
          <div
            className="whitespace-pre-wrap"
            style={{
              fontSize: `${textComp.fontSize || styleConfig.fontSize}pt`,
              fontWeight: textComp.fontWeight,
              textAlign: textComp.textAlign,
              lineHeight: textComp.lineHeight || styleConfig.lineHeight,
              fontFamily: styleConfig.fontFamily,
              border: componentStyle.showBorder ? `${componentStyle.borderWidth}px solid ${componentStyle.borderColor}` : 'none',
              backgroundColor: componentStyle.backgroundColor,
              borderRadius: '4px',
              padding: componentStyle.showBorder ? '8px' : '0',
            }}
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        );

      case 'qrcode':
        const qrcodeComp = component as QRCodeComponent;
        return (
          <div className="flex items-center justify-center w-full h-full">
            <canvas
              ref={canvasRef}
              width={Math.min(qrcodeComp.size, component.width - 10)}
              height={Math.min(qrcodeComp.size, component.height - 10)}
            />
          </div>
        );

      case 'barcode':
        return (
          <div className="flex items-center justify-center w-full h-full">
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
              marginTop: `${(component.height - lineComp.thickness) / 2}px`,
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
        const autoTableComp = component as AutoTableComponent;
        return (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded border-2 border-dashed">
            <div className="text-center">
              <span className="text-xs text-muted-foreground">自动表格</span>
              {autoTableComp.selectedFields.length > 0 && (
                <span className="text-xs text-muted-foreground block mt-1">
                  已选择 {autoTableComp.selectedFields.length} 个字段
                </span>
              )}
            </div>
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

  // 层级控制面板
  const renderLayerControls = () => {
    if (!isSelected) return null;
    
    const maxZIndex = Math.max(...components.map(c => c.zIndex));
    const minZIndex = Math.min(...components.map(c => c.zIndex));
    const isAtTop = component.zIndex === maxZIndex;
    const isAtBottom = component.zIndex === minZIndex;

    // 安全的事件处理
    const handleStopPropagation = (e: React.MouseEvent) => {
      e.stopPropagation();
    };

    return (
      <div className="absolute -top-10 left-0 flex items-center gap-1 bg-background border rounded px-1 py-0.5 shadow-sm">
        <span className="text-xs text-muted-foreground px-1">层级</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="置顶"
          onClick={(e) => {
            e.stopPropagation();
            bringToFront(component.id);
          }}
          disabled={isAtTop && components.length === 1}
        >
          <ChevronUp className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="上移一层"
          onClick={(e) => {
            e.stopPropagation();
            moveComponentUp(component.id);
          }}
          disabled={isAtTop}
        >
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="下移一层"
          onClick={(e) => {
            e.stopPropagation();
            moveComponentDown(component.id);
          }}
          disabled={isAtBottom}
        >
          <ArrowDown className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="置底"
          onClick={(e) => {
            e.stopPropagation();
            sendToBack(component.id);
          }}
          disabled={isAtBottom && components.length === 1}
        >
          <ChevronDown className="w-3 h-3" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          title="删除"
          onClick={(e) => {
            e.stopPropagation();
            removeComponent(component.id);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  return (
    <ResizableWrapper
      component={component}
      isSelected={isSelected}
      onSelect={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      {renderLayerControls()}
      {renderContent()}
    </ResizableWrapper>
  );
}
