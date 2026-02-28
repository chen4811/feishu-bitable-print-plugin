'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash2,
  Merge,
  Split,
  Table as TableIcon,
} from 'lucide-react';

interface TableEditorProps {
  content: string;
  onChange: (content: string) => void;
  onExitEdit?: () => void;
}

export function TableEditor({ content, onChange, onExitEdit }: TableEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用 StarterKit 自带的表格，使用我们的自定义表格
        table: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: content || getDefaultTableContent(),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // 默认表格内容
  function getDefaultTableContent() {
    return `
      <table>
        <tr>
          <th>标题1</th>
          <th>标题2</th>
          <th>标题3</th>
        </tr>
        <tr>
          <td>内容1</td>
          <td>内容2</td>
          <td>内容3</td>
        </tr>
        <tr>
          <td>内容4</td>
          <td>内容5</td>
          <td>内容6</td>
        </tr>
      </table>
    `;
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="table-editor-wrapper relative">
      {/* 表格编辑工具栏 */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/30 border-b rounded-t-lg mb-2">
        {/* 行操作 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="上方插入行"
        >
          <Plus className="w-4 h-4 rotate-90" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="下方插入行"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="删除行"
        >
          <Trash2 className="w-4 h-4 rotate-90" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* 列操作 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title="左侧插入列"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="右侧插入列"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="删除列"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* 合并/拆分 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().mergeCells().run()}
          title="合并单元格"
        >
          <Merge className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().splitCell().run()}
          title="拆分单元格"
        >
          <Split className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* 删除表格 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().deleteTable().run()}
          title="删除表格"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        {/* 退出编辑 */}
        {onExitEdit && (
          <Button variant="default" size="sm" onClick={onExitEdit}>
            完成编辑
          </Button>
        )}
      </div>

      {/* 编辑区域 */}
      <div className="border rounded-b-lg bg-white p-4 min-h-[200px]">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm w-full focus:outline-none"
        />
      </div>
    </div>
  );
}
