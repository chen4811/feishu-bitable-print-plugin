/**
 * 飞书 SDK 钩子
 * 用于管理飞书多维表格 SDK 的初始化和数据获取
 */

import { useState, useEffect, useCallback } from 'react';
import { feishuSDK, BitableRecord } from '@/lib/feishu-sdk-real';
import { mockBitableData } from '@/data/mockData';
import { BitableRecord as AppBitableRecord } from '@/types/bitable';

interface UseFeishuSDKResult {
  isLoading: boolean;
  error: string | null;
  isFeishuEnvironment: boolean;
  records: AppBitableRecord[];
  fetchRecords: () => Promise<void>;
  addRecord: (fields: Record<string, any>) => Promise<void>;
  updateRecord: (recordId: string, fields: Record<string, any>) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
}

export function useFeishuSDK(): UseFeishuSDKResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AppBitableRecord[]>([]);
  const [isFeishuEnvironment, setIsFeishuEnvironment] = useState(false);

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
            await fetchRecords();
          } else {
            setError('飞书 SDK 初始化失败');
          }
        } else {
          // 使用模拟数据
          console.log('不在飞书环境中，使用模拟数据');
          setRecords(mockBitableData.records);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // 获取记录
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await feishuSDK.getRecords();
      setRecords(result.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取记录失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 添加记录
  const addRecord = useCallback(async (fields: Record<string, any>) => {
    setIsLoading(true);
    setError(null);

    try {
      const record = await feishuSDK.addRecord(fields);
      if (record) {
        setRecords((prev) => [...prev, record]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加记录失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 更新记录
  const updateRecord = useCallback(async (
    recordId: string,
    fields: Record<string, any>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const record = await feishuSDK.updateRecord(recordId, fields);
      if (record) {
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? record : r))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新记录失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 删除记录
  const deleteRecord = useCallback(async (recordId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await feishuSDK.deleteRecord(recordId);
      if (success) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除记录失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    isFeishuEnvironment,
    records,
    fetchRecords,
    addRecord,
    updateRecord,
    deleteRecord,
  };
}
