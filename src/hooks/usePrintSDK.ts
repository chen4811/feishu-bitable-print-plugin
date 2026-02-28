/**
 * 飞书排版打印 SDK 钩子
 * 使用新的异步环境检测逻辑
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  feishuEnv, 
  FeishuEnvStatus,
  onFeishuReady,
  onNotFeishu
} from '@/lib/feishu-env';
import { Field } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { mockBitableData } from '@/data/mockData';

interface UsePrintSDKResult {
  isLoading: boolean;
  error: string | null;
  isFeishuEnvironment: boolean;
  envStatus: FeishuEnvStatus;
  tableName: string;
  fields: Field[];
  records: Record<string, unknown>[];
  refreshData: () => Promise<void>;
  debugInfo: Record<string, unknown> | null;
}

export function usePrintSDK(): UsePrintSDKResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envStatus, setEnvStatus] = useState<FeishuEnvStatus>('checking');
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

  // 加载模拟数据
  const loadMockData = useCallback(() => {
    console.log('[PrintSDK] 加载模拟数据...');
    
    setTableName(mockBitableData.name);
    setIsFeishuEnvironment(false);
    setFeishuEnvironment(false);

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

    setDebugInfo({
      ...feishuEnv.getDebugInfo(),
      dataSource: 'mock',
    });

    setIsLoading(false);
  }, [setFeishuEnvironment, setStoreFields, setStoreRecords]);

  // 加载真实数据
  const loadRealData = useCallback(async () => {
    console.log('[PrintSDK] 加载真实数据...');
    setIsLoading(true);

    try {
      // 获取表格名称
      const name = await feishuEnv.fetchTableName();
      setTableName(name);
      setIsFeishuEnvironment(true);
      setFeishuEnvironment(true);

      // 获取字段
      const feishuFields = await feishuEnv.fetchFields();
      console.log('[PrintSDK] 获取到字段:', feishuFields.length);

      if (feishuFields.length === 0) {
        console.warn('[PrintSDK] 未获取到字段');
        setError('未获取到字段数据，请检查权限配置');
      }

      const convertedFields: Field[] = feishuFields.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        placeholder: `[${f.name}]`,
        isSystem: false,
      }));
      setFields(convertedFields);
      setStoreFields(convertedFields);

      // 获取记录
      const feishuRecords = await feishuEnv.fetchRecords();
      console.log('[PrintSDK] 获取到记录:', feishuRecords.length);

      const convertedRecords = feishuRecords.map(r => ({
        id: r.id,
        __tableName__: name,
        ...r.fields,
      }));
      setRecords(convertedRecords);
      setStoreRecords(convertedRecords);

      setDebugInfo({
        ...feishuEnv.getDebugInfo(),
        dataSource: 'feishu',
        fieldsCount: feishuFields.length,
        recordsCount: feishuRecords.length,
      });

      setError(null);
    } catch (err) {
      console.error('[PrintSDK] 加载真实数据失败:', err);
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [setFeishuEnvironment, setStoreFields, setStoreRecords]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const status = feishuEnv.getEnvStatus();
    setEnvStatus(status);

    if (status === 'ready') {
      await loadRealData();
    } else {
      loadMockData();
    }
  }, [loadRealData, loadMockData]);

  // 初始化
  useEffect(() => {
    console.log('[PrintSDK] 初始化...');

    // 注册回调
    const handleReady = () => {
      console.log('[PrintSDK] 飞书环境就绪回调');
      setEnvStatus('ready');
      loadRealData();
    };

    const handleNotFeishu = () => {
      console.log('[PrintSDK] 非飞书环境回调');
      setEnvStatus('not_feishu');
      loadMockData();
    };

    onFeishuReady(handleReady);
    onNotFeishu(handleNotFeishu);

    // 检查当前状态
    const currentStatus = feishuEnv.getEnvStatus();
    setEnvStatus(currentStatus);

    if (currentStatus === 'ready') {
      loadRealData();
    } else if (currentStatus === 'not_feishu') {
      loadMockData();
    } else if (currentStatus === 'error') {
      setError(feishuEnv.getEnvError() || '环境初始化失败');
      loadMockData();
    }
    // 如果是 'checking'，等待回调触发

    // 设置超时，防止一直等待
    const timeout = setTimeout(() => {
      if (feishuEnv.getEnvStatus() === 'checking') {
        console.warn('[PrintSDK] 环境检测超时，使用模拟数据');
        setEnvStatus('not_feishu');
        loadMockData();
      }
    }, 8000);

    return () => {
      clearTimeout(timeout);
    };
  }, [loadRealData, loadMockData]);

  return {
    isLoading,
    error,
    isFeishuEnvironment,
    envStatus,
    tableName,
    fields,
    records,
    refreshData,
    debugInfo,
  };
}
