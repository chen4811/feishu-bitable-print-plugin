'use client';

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { mockBitableData } from '@/data/mockData';
import { Field } from '@/types/editor';
import { HomePage } from '@/components/editor/HomePage';
import { EditorPage } from '@/components/editor/EditorPage';
import { PresetTemplate } from '@/types/editor';

type AppView = 'home' | 'editor' | 'preview';

export default function PrintPluginApp() {
  const [view, setView] = useState<AppView>('home');
  const { setFields, setSystemFields } = useEditorStore();

  // 初始化字段数据
  useEffect(() => {
    // 从模拟数据或真实数据中获取字段
    const fields: Field[] = mockBitableData.fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      placeholder: `[${field.name}]`,
      isSystem: false,
    }));

    const systemFields: Field[] = [
      { id: 'sys_table_name', name: '表格名', type: 'text', placeholder: '[表格名]', isSystem: true },
      { id: 'sys_print_time', name: '打印时间', type: 'text', placeholder: '[打印时间]', isSystem: true },
      { id: 'sys_page_number', name: '页码', type: 'text', placeholder: '[页码]', isSystem: true },
      { id: 'sys_total_pages', name: '总页数', type: 'text', placeholder: '[总页数]', isSystem: true },
    ];

    setFields(fields);
    setSystemFields(systemFields);
  }, [setFields, setSystemFields]);

  // 处理创建新排版
  const handleCreateNew = () => {
    setView('editor');
  };

  // 处理选择模板
  const handleSelectTemplate = (template: PresetTemplate) => {
    // TODO: 加载模板配置
    setView('editor');
  };

  // 处理退出编辑器
  const handleExitEditor = () => {
    setView('home');
  };

  return (
    <>
      {view === 'home' && (
        <HomePage
          onCreateNew={handleCreateNew}
          onSelectTemplate={handleSelectTemplate}
        />
      )}
      {view === 'editor' && (
        <EditorPage onExit={handleExitEditor} />
      )}
    </>
  );
}
