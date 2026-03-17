/**
 * 复选框选中记录 Hook
 * 
 * 使用场景：
 * 1. 模板编辑模式下，监听用户勾选行表头复选框
 * 2. 打印预览模式下，批量读取选中的记录数据
 * 
 * 实现原理：
 * 1. 使用 bitable.ui.getSelectRecordIds() 获取选中的记录 ID
 * 2. 使用 base.onSelectionChange() 监听选择变化
 * 3. 使用 table.getRecordById() 获取记录数据
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initCheckboxSelection,
  onCheckboxSelectionChange,
  onSelectedRecordsChange,
  getCheckboxSelectedIds,
  getCheckboxSelectedRecords,
  destroyCheckboxSelection,
  type CheckboxSelectionEvent,
} from '@/lib/feishu-service';

export interface UseCheckboxSelectionOptions {
  autoInit?: boolean;           // 是否自动初始化
  onSelectionChange?: (event: CheckboxSelectionEvent) => void;
  onRecordsChange?: (records: Record<string, unknown>[]) => void;
}

export interface UseCheckboxSelectionResult {
  isInitialized: boolean;
  isLoading: boolean;
  selectedRecordIds: string[];
  selectedRecords: Record<string, unknown>[];
  error: Error | null;
  init: () => Promise<boolean>;
  refresh: () => Promise<void>;
  getSelectedIds: () => Promise<string[]>;
  getSelectedRecords: () => Promise<Record<string, unknown>[]>;
}

/**
 * 复选框选中记录 Hook
 */
export function useCheckboxSelection(
  options: UseCheckboxSelectionOptions = {}
): UseCheckboxSelectionResult {
  const {
    autoInit = true,
    onSelectionChange,
    onRecordsChange,
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const cleanupRef = useRef<(() => void)[]>([]);

  // 初始化
  const init = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await initCheckboxSelection();
      setIsInitialized(success);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新选中记录
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [ids, records] = await Promise.all([
        getCheckboxSelectedIds(),
        getCheckboxSelectedRecords(),
      ]);

      setSelectedRecordIds(ids);
      setSelectedRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 获取选中 IDs
  const getSelectedIds = useCallback(async () => {
    return getCheckboxSelectedIds();
  }, []);

  // 获取选中记录
  const getSelectedRecordsCallback = useCallback(async () => {
    return getCheckboxSelectedRecords();
  }, []);

  // 注册回调
  useEffect(() => {
    if (!isInitialized) return;

    // 注册选中变化回调
    const unsubSelection = onCheckboxSelectionChange((event) => {
      setSelectedRecordIds(event.recordIds);
      onSelectionChange?.(event);
    });
    cleanupRef.current.push(unsubSelection);

    // 注册记录变化回调
    const unsubRecords = onSelectedRecordsChange((records) => {
      setSelectedRecords(records);
      onRecordsChange?.(records);
    });
    cleanupRef.current.push(unsubRecords);

    return () => {
      cleanupRef.current.forEach(fn => fn());
      cleanupRef.current = [];
    };
  }, [isInitialized, onSelectionChange, onRecordsChange]);

  // 自动初始化
  useEffect(() => {
    if (autoInit) {
      init();
    }

    return () => {
      destroyCheckboxSelection();
    };
  }, [autoInit, init]);

  return {
    isInitialized,
    isLoading,
    selectedRecordIds,
    selectedRecords,
    error,
    init,
    refresh,
    getSelectedIds,
    getSelectedRecords: getSelectedRecordsCallback,
  };
}

/**
 * 简化版 Hook：仅获取选中记录 IDs
 */
export function useSelectedRecordIds(): {
  recordIds: string[];
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [recordIds, setRecordIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const ids = await getCheckboxSelectedIds();
      setRecordIds(ids);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recordIds, isLoading, refresh };
}
