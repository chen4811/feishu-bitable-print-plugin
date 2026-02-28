'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = '在这里输入文字...',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: false,
        link: false, // 禁用 Link 扩展，避免 linkifyjs 构建错误
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={`rich-text-editor border rounded-lg overflow-hidden ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-state={editor.isActive('bold') ? 'active' : 'inactive'}
        >
          <BoldIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-state={editor.isActive('italic') ? 'active' : 'inactive'}
        >
          <ItalicIcon className="w-4 h-4" />
        </Button>
      </div>
      
      {/* 编辑区域 */}
      <EditorContent editor={editor} className="p-4 min-h-[100px]" />
    </div>
  );
}
