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
  debugInfo: Record<string, unknown> | null;
}

export function usePrintSDK(): UsePrintSDKResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFeishuEnvironment, setIsFeishuEnvironment] = useState(false);
  const [tableName, setTableName] = useState('未命名表格');
  const [fields, setFields] = useState<Field[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);

  const { 
    setFields: setStoreFields, 
    setRecords: setStoreRecords, 
    setFeishuEnvironment 
  } = useEditorStore();

  // 刷新数据
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    console.log('[PrintSDK] 开始刷新数据...');

    try {
      // 检查环境
      const inFeishu = feishuSDK.isFeishuEnvironment();
      console.log('[PrintSDK] 飞书环境:', inFeishu);
      setIsFeishuEnvironment(inFeishu);
      setFeishuEnvironment(inFeishu);

      if (inFeishu) {
        console.log('[PrintSDK] 在飞书环境中，初始化 SDK...');
        
        // 获取调试信息
        try {
          const debug = await feishuSDK.getDebugInfo();
          console.log('[PrintSDK] 调试信息:', debug);
          setDebugInfo(debug);
        } catch (e) {
          console.error('[PrintSDK] 获取调试信息失败:', e);
        }

        // 初始化 SDK
        const initialized = await feishuSDK.init();
        console.log('[PrintSDK] SDK 初始化结果:', initialized);
        
        if (!initialized) {
          throw new Error('飞书 SDK 初始化失败，无法获取表格信息');
        }

        // 获取表格名称
        const name = await feishuSDK.getTableName();
        console.log('[PrintSDK] 表格名称:', name);
        setTableName(name);

        // 获取字段列表
        console.log('[PrintSDK] 获取字段列表...');
        const feishuFields = await feishuSDK.getFields();
        console.log('[PrintSDK] 获取到字段:', feishuFields);
        
        if (!feishuFields || feishuFields.length === 0) {
          console.warn('[PrintSDK] 未获取到任何字段，可能需要检查权限');
        }
        
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
        console.log('[PrintSDK] 获取记录...');
        const feishuRecords = await feishuSDK.getAllRecords();
        console.log('[PrintSDK] 获取到记录数:', feishuRecords.length);
        
        const convertedRecords = feishuRecords.map(r => ({
          id: r.id,
          __tableName__: name,
          ...r.fields,
        }));
        setRecords(convertedRecords);
        setStoreRecords(convertedRecords);
      } else {
        // 使用模拟数据
        console.log('[PrintSDK] 不在飞书环境中，使用模拟数据');
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
      console.error('[PrintSDK] 数据加载失败:', err);
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
    debugInfo,
  };
}
