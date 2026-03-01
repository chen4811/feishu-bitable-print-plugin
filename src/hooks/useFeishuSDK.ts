/**
 * 飞书 SDK 钩子
 * 用于管理飞书多维表格 SDK 的初始化和数据获取
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { feishuSDK, BitableRecord, SelectionChangeEvent } from '@/lib/feishu-sdk-real';
import { mockBitableData } from '@/data/mockData';
import { BitableRecord as AppBitableRecord } from '@/types/bitable';

interface UseFeishuSDKResult {
  isLoading: boolean;
  error: string | null;
  isFeishuEnvironment: boolean;
  records: AppBitableRecord[];
  fields: any[];
  selectedRecords: BitableRecord[];
  fetchRecords: () => Promise<void>;
  fetchFields: () => Promise<void>;
  fetchSelectedRecords: () => Promise<void>;
  addRecord: (fields: Record<string, any>) => Promise<void>;
  updateRecord: (recordId: string, fields: Record<string, any>) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  onSelectionChange: (callback: (event: SelectionChangeEvent) => void) => (() => void);
}

export function useFeishuSDK(): UseFeishuSDKResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AppBitableRecord[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<BitableRecord[]>([]);
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
              fetchAllRecordsAndSetFirstAsSelected()
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
            setSelectedRecords([{
              id: mockBitableData.records[0].id,
              fields: mockBitableData.records[0] as unknown as Record<string, unknown>,
              createdTime: new Date().toISOString(),
              lastModifiedTime: new Date().toISOString(),
            }]);
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
  const fetchAllRecordsAndSetFirstAsSelected = useCallback(async () => {
    try {
      const allRecords = await feishuSDK.getAllRecords();
      console.log('[useFeishuSDK] 获取到所有记录:', allRecords);
      
      // 转换为应用格式
      const appRecords = allRecords.map((record, index) => ({
        id: record.id,
        ...record.fields,
        _rowIndex: index,
      }));
      
      setRecords(appRecords as any);
      
      // 默认选中第一条记录
      if (allRecords.length > 0) {
        console.log('[useFeishuSDK] 默认选中第一条记录:', allRecords[0].id);
        setSelectedRecords([allRecords[0]]);
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
      await fetchAllRecordsAndSetFirstAsSelected();
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllRecordsAndSetFirstAsSelected]);

  // 获取选中的记录
  const fetchSelectedRecords = useCallback(async () => {
    try {
      console.log('[useFeishuSDK] 主动获取选中记录...');
      const selRecords = await feishuSDK.getSelectedRecords();
      console.log('[useFeishuSDK] 获取到选中记录:', selRecords);
      
      if (selRecords.length > 0) {
        setSelectedRecords(selRecords);
        
        // 同时更新 records（如果需要）
        const appRecords = selRecords.map((record, index) => ({
          id: record.id,
          ...record.fields,
          _rowIndex: index,
        }));
        setRecords(appRecords as any);
      }
    } catch (err) {
      console.error('[useFeishuSDK] 获取选中记录失败:', err);
    }
  }, []);

  // 监听选中变化
  const onSelectionChange = useCallback((callback: (event: SelectionChangeEvent) => void) => {
    if (!isFeishuEnvironment) {
      console.log('[useFeishuSDK] 不在飞书环境，不注册监听');
      return () => {};
    }

    console.log('[useFeishuSDK] 注册选中变化监听');
    
    const unsubscribe = feishuSDK.onSelectionChange(async (event) => {
      console.log('[useFeishuSDK] 监听到选中变化事件:', event);
      
      // 先调用用户回调
      callback(event);
      
      // 然后获取新的选中记录
      await fetchSelectedRecords();
    });

    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [isFeishuEnvironment, fetchSelectedRecords]);

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
    selectedRecords,
    fetchRecords,
    fetchFields,
    fetchSelectedRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    onSelectionChange,
  };
}
