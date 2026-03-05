'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { onSelectionChange, getTableInfo } from '@/lib/feishu-env';
import { Field } from '@/types/editor';
import { toast } from 'sonner';

/**
 * 表格切换时同步数据源字段的 Hook
 * 用于模板编辑器和模板预览组件
 */
export function useTableFieldSync() {
  const { setFields, setFeishuEnvironment, setFeishuContext, feishuContext } = useEditorStore();
  const currentTableIdRef = useRef<string | null>(null);

  // 获取表格字段信息
  const fetchTableFields = useCallback(async (tableId: string) => {
    try {
      console.log('[TableFieldSync] 获取表格字段:', tableId);
      
      const { base } = await import('@lark-base-open/js-sdk');
      const table = await base.getTable(tableId);
      
      // 获取字段列表
      const fieldList = await table.getFieldMetaList();
      console.log('[TableFieldSync] 字段列表:', fieldList);

      // 转换为编辑器字段格式
      const fields: Field[] = fieldList.map((field: any) => ({
        id: field.id,
        name: field.name,
        type: field.type || 'text',
        placeholder: `[${field.name}]`,
      }));

      // 更新编辑器字段
      setFields(fields);
      console.log('[TableFieldSync] 字段已同步:', fields.length, '个字段');

      // 更新飞书上下文
      const tableInfo = await getTableInfo(tableId);
      setFeishuContext({
        appToken: '',
        targetTableId: tableId,
        fieldNameToIdMap: fields.reduce((acc, field) => {
          acc[field.name] = field.id;
          return acc;
        }, {} as Record<string, string>),
        firstRecordData: null,
        appMetadata: null,
      });

      toast.success(`已切换到表格: ${(table as any).name || tableId}`, {
        description: `同步了 ${fields.length} 个字段`,
      });

      return fields;
    } catch (error) {
      console.error('[TableFieldSync] 获取表格字段失败:', error);
      toast.error('获取表格字段失败');
      return [];
    }
  }, [setFields, setFeishuContext]);

  // 初始化飞书环境并监听表格切换
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        // 初始化飞书环境
        const { feishuEnv } = await import('@/lib/feishu-env');
        const isReady = await feishuEnv.init();
        
        if (isReady) {
          setFeishuEnvironment(true);
          console.log('[TableFieldSync] 飞书环境已就绪');

          // 获取当前表格信息
          const tableInfo = await getTableInfo();
          if (tableInfo.tableId) {
            currentTableIdRef.current = tableInfo.tableId;
            await fetchTableFields(tableInfo.tableId);
          }

          // 监听表格切换
          unsubscribe = onSelectionChange((event) => {
            const { tableId } = event?.data || {};
            
            if (tableId && tableId !== currentTableIdRef.current) {
              console.log('[TableFieldSync] 检测到表格切换:', tableId);
              currentTableIdRef.current = tableId;
              fetchTableFields(tableId);
            }
          });
        } else {
          setFeishuEnvironment(false);
          console.log('[TableFieldSync] 非飞书环境');
        }
      } catch (error) {
        console.error('[TableFieldSync] 初始化失败:', error);
        setFeishuEnvironment(false);
      }
    };

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchTableFields, setFeishuEnvironment]);

  return {
    currentTableId: currentTableIdRef.current,
    refreshFields: fetchTableFields,
  };
}
