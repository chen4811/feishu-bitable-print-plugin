'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
        heading: {
          levels: [1, 2],
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: content || `<p>${placeholder}</p>`,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm focus:outline-none min-h-[100px] w-full ${className}`,
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor">
      {/* 工具栏 */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 rounded-t-lg">
        <TooltipProvider>
          {/* 撤销/重做 */}
          <div className="flex gap-1 pr-2 border-r">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                >
                  ←
                </Button>
              </TooltipTrigger>
              <TooltipContent>撤销</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                >
                  →
                </Button>
              </TooltipTrigger>
              <TooltipContent>重做</TooltipContent>
            </Tooltip>
          </div>

          {/* 标题 */}
          <div className="flex gap-1 pr-2 border-r">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  data-state={editor.isActive('heading', { level: 1 }) ? 'active' : 'inactive'}
                >
                  <Heading1 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>标题 1</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  data-state={editor.isActive('heading', { level: 2 }) ? 'active' : 'inactive'}
                >
                  <Heading2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>标题 2</TooltipContent>
            </Tooltip>
          </div>

          {/* 文字样式 */}
          <div className="flex gap-1 pr-2 border-r">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  data-state={editor.isActive('bold') ? 'active' : 'inactive'}
                >
                  <Bold className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>粗体</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  data-state={editor.isActive('italic') ? 'active' : 'inactive'}
                >
                  <Italic className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>斜体</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  data-state={editor.isActive('underline') ? 'active' : 'inactive'}
                >
                  <UnderlineIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>下划线</TooltipContent>
            </Tooltip>
          </div>

          {/* 对齐方式 */}
          <div className="flex gap-1 pr-2 border-r">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  data-state={editor.isActive({ textAlign: 'left' }) ? 'active' : 'inactive'}
                >
                  <AlignLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>左对齐</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  data-state={editor.isActive({ textAlign: 'center' }) ? 'active' : 'inactive'}
                >
                  <AlignCenter className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>居中对齐</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  data-state={editor.isActive({ textAlign: 'right' }) ? 'active' : 'inactive'}
                >
                  <AlignRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>右对齐</TooltipContent>
            </Tooltip>
          </div>

          {/* 列表 */}
          <div className="flex gap-1 pr-2 border-r">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  data-state={editor.isActive('bulletList') ? 'active' : 'inactive'}
                >
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>无序列表</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  data-state={editor.isActive('orderedList') ? 'active' : 'inactive'}
                >
                  <ListOrdered className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>有序列表</TooltipContent>
            </Tooltip>
          </div>

          {/* 链接 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const url = window.prompt('请输入链接地址:');
                  if (url) {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                  }
                }}
                data-state={editor.isActive('link') ? 'active' : 'inactive'}
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>插入链接</TooltipContent>
          </Tooltip>

          {/* 颜色选择器 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#000000' }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'].map((color) => (
                <DropdownMenuItem
                  key={color}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                >
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </div>

      {/* 编辑区域 */}
      <div className="border border-t-0 rounded-b-lg bg-white p-4">
        <EditorContent editor={editor} className="min-h-[150px]" />
      </div>
    </div>
  );
}
