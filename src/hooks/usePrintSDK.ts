/**
 * 飞书排版打印 SDK 钩子
 * 专门用于排版打印插件的数据获取
 */

import { useState, useEffect, useCallback } from 'react';
import { feishuSDK, FeishuField, FeishuRecord } from '@/lib/feishu-sdk';
import { Field } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { mockBitableData } from '@/data/mockData';

interface UsePrintSDKResult {
  isLoading: boolean;
  error: string | null;
  isFeishuEnvironment: boolean;
  tableName: string;
  fields: Field[];
  records: Record<string, unknown>[];
  refreshData: () => Promise<void>;
}

export function usePrintSDK(): UsePrintSDKResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFeishuEnvironment, setIsFeishuEnvironment] = useState(false);
  const [tableName, setTableName] = useState('未命名表格');
  const [fields, setFields] = useState<Field[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);

  const { 
    setFields: setStoreFields, 
    setRecords: setStoreRecords, 
    setFeishuEnvironment 
  } = useEditorStore();

  // 刷新数据
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const inFeishu = feishuSDK.isFeishuEnvironment();
      setIsFeishuEnvironment(inFeishu);
      setFeishuEnvironment(inFeishu);

      if (inFeishu) {
        // 初始化 SDK
        const initialized = await feishuSDK.init();
        if (!initialized) {
          throw new Error('飞书 SDK 初始化失败');
        }

        // 获取表格名称
        const name = await feishuSDK.getTableName();
        setTableName(name);

        // 获取字段列表
        const feishuFields = await feishuSDK.getFields();
        const convertedFields: Field[] = feishuFields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type_name,
          placeholder: `[${f.name}]`,
          isSystem: false,
        }));
        setFields(convertedFields);
        setStoreFields(convertedFields);

        // 获取所有记录
        const feishuRecords = await feishuSDK.getAllRecords();
        const convertedRecords = feishuRecords.map(r => ({
          id: r.id,
          __tableName__: name,
          ...r.fields,
        }));
        setRecords(convertedRecords);
        setStoreRecords(convertedRecords);
      } else {
        // 使用模拟数据
        console.log('不在飞书环境中，使用模拟数据');
        setTableName(mockBitableData.name);

        const mockFields: Field[] = mockBitableData.fields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          placeholder: `[${f.name}]`,
          isSystem: false,
        }));
        setFields(mockFields);
        setStoreFields(mockFields);

        const mockRecords = mockBitableData.records.map(r => ({
          id: r.id,
          __tableName__: mockBitableData.name,
          ...r.fields,
        }));
        setRecords(mockRecords);
        setStoreRecords(mockRecords);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      setError(errorMsg);
      console.error('数据加载失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setFeishuEnvironment, setStoreFields, setStoreRecords]);

  // 初始化
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    isLoading,
    error,
    isFeishuEnvironment,
    tableName,
    fields,
    records,
    refreshData,
  };
}
