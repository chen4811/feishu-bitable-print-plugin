import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

interface SimpleTableEditorProps {
  content: any; // TipTap JSON 或 HTML
  onChange: (content: any) => void;
}

export const SimpleTableEditor: React.FC<SimpleTableEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用一些不需要的功能
        dropcursor: false,
        link: false, // 禁用 Link 扩展，避免 linkifyjs 构建错误
      }),
      Table.configure({
        resizable: true, // 允许拖拽调整列宽
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      // 关键：每次内容变化，都通知父组件保存
      onChange(editor.getJSON()); 
    },
    immediatelyRender: false, // 避免 SSR 警告
  });

  // 如果内容为空，自动创建一个 3x3 的表格
  useEffect(() => {
    if (editor && !editor.state.doc.content.size) {
      editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="simple-table-editor" style={{ border: '1px solid #ddd', padding: '8px' }}>
      {/* 这里可以添加简单的工具栏按钮，例如添加行/列 */}
      <div className="toolbar" style={{ marginBottom: '8px' }}>
        <button onClick={() => editor.chain().focus().addRowAfter().run()}>下行</button>
        <button onClick={() => editor.chain().focus().addColumnAfter().run()}>右列</button>
        <button onClick={() => editor.chain().focus().deleteSelection().run()}>删除选中</button>
      </div>
      
      {/* 编辑器区域 */}
      <EditorContent editor={editor} className="prose max-w-none" />
      
      <style>{`
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 0;
          overflow: hidden;
          table-layout: fixed;
        }
        .ProseMirror td, .ProseMirror th {
          border: 1px solid #ddd;
          padding: 8px;
          box-sizing: border-box;
          position: relative;
          min-width: 1em;
        }
        .ProseMirror th {
          background-color: #f3f4f6;
          font-weight: bold;
          text-align: left;
        }
        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(200, 200, 255, 0.4);
          pointer-events: none;
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px; top: 0; bottom: -2px;
          width: 4px;
          cursor: col-resize;
          background: #adf;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};
