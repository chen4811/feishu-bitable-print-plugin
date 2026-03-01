/**
 * 飞书 SDK 钩子
 * 用于管理飞书多维表格 SDK 的初始化和数据获取
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { feishuSDK, BitableRecord } from '@/lib/feishu-sdk-real';
import { mockBitableData } from '@/data/mockData';
import { BitableRecord as AppBitableRecord } from '@/types/bitable';

interface UseFeishuSDKResult {
  isLoading: boolean;
  error: string | null;
  isFeishuEnvironment: boolean;
  records: AppBitableRecord[];
  fields: any[];
  selectedRecordIds: string[];
  fetchRecords: () => Promise<void>;
  fetchFields: () => Promise<void>;
  addRecord: (fields: Record<string, any>) => Promise<void>;
  updateRecord: (recordId: string, fields: Record<string, any>) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  onSelectionChange: (callback: (recordIds: string[]) => void) => (() => void);
  getRecordsByIds: (recordIds: string[]) => Promise<BitableRecord[]>;
}

export function useFeishuSDK(): UseFeishuSDKResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AppBitableRecord[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isFeishuEnvironment, setIsFeishuEnvironment] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 初始化
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 检查是否在飞书环境中
        const inFeishu = feishuSDK.isFeishuEnvironment();
        setIsFeishuEnvironment(inFeishu);

        if (inFeishu) {
          // 初始化飞书 SDK
          const initialized = await feishuSDK.init();
          if (initialized) {
            // 获取字段和所有记录
            await Promise.all([
              fetchFields(),
              fetchAllRecordsAndSetFirstAsDefault()
            ]);
          } else {
            setError('飞书 SDK 初始化失败');
          }
        } else {
          // 使用模拟数据
          console.log('[useFeishuSDK] 不在飞书环境中，使用模拟数据');
          setRecords(mockBitableData.records);
          setFields(mockBitableData.fields);
          // 默认选中第一条记录
          if (mockBitableData.records.length > 0) {
            setSelectedRecordIds([mockBitableData.records[0].id]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // 清理函数
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // 获取所有记录并默认选中第一条
  const fetchAllRecordsAndSetFirstAsDefault = useCallback(async () => {
    try {
      const allRecords = await feishuSDK.getAllRecords();
      console.log('[useFeishuSDK] 获取到所有记录:', allRecords);
      
      // 转换为应用格式
      const appRecords: AppBitableRecord[] = allRecords.map((record, index) => ({
        id: record.id,
        ...record.fields,
        _rowIndex: index,
      }));
      
      setRecords(appRecords as unknown as any);
      
      // 默认选中第一条记录
      if (appRecords.length > 0) {
        console.log('[useFeishuSDK] 默认选中第一条记录:', appRecords[0].id);
        setSelectedRecordIds([appRecords[0].id]);
      }
    } catch (err) {
      console.error('[useFeishuSDK] 获取记录失败:', err);
    }
  }, []);

  // 获取字段列表
  const fetchFields = useCallback(async () => {
    try {
      const result = await feishuSDK.getFields();
      console.log('[useFeishuSDK] 获取到字段列表:', result);
      setFields(result);
    } catch (err) {
      console.error('[useFeishuSDK] 获取字段失败:', err);
    }
  }, []);

  // 获取记录
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchAllRecordsAndSetFirstAsDefault();
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllRecordsAndSetFirstAsDefault]);

  // 监听选中变化
  const onSelectionChange = useCallback((callback: (recordIds: string[]) => void) => {
    if (!isFeishuEnvironment) {
      console.log('[useFeishuSDK] 不在飞书环境，不注册监听');
      return () => {};
    }

    console.log('[useFeishuSDK] 注册选中变化监听');
    
    const unsubscribe = feishuSDK.onSelectionChange((newRecordIds) => {
      console.log('[useFeishuSDK] 监听到选中变化:', newRecordIds);
      setSelectedRecordIds(newRecordIds);
      callback(newRecordIds);
    });

    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [isFeishuEnvironment]);

  // 根据ID获取记录
  const getRecordsByIds = useCallback(async (recordIds: string[]): Promise<BitableRecord[]> => {
    if (!isFeishuEnvironment) {
      // 在非飞书环境中，从本地记录中查找
      return records
        .filter(r => recordIds.includes(r.id))
        .map(r => ({
          id: r.id,
          fields: r as unknown as Record<string, unknown>,
          createdTime: new Date().toISOString(),
          lastModifiedTime: new Date().toISOString(),
        }));
    }

    return await feishuSDK.getRecordsByIds(recordIds);
  }, [isFeishuEnvironment, records]);

  // 占位函数（保持接口兼容）
  const addRecord = useCallback(async () => {}, []);
  const updateRecord = useCallback(async () => {}, []);
  const deleteRecord = useCallback(async () => {}, []);

  return {
    isLoading,
    error,
    isFeishuEnvironment,
    records,
    fields,
    selectedRecordIds,
    fetchRecords,
    fetchFields,
    addRecord,
    updateRecord,
    deleteRecord,
    onSelectionChange,
    getRecordsByIds,
  };
}
