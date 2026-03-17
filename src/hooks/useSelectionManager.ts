/**
 * 复选框选择状态管理 Hook
 * 
 * 功能：
 * 1. 管理多选确认对话框状态
 * 2. 与 SelectionManager 集成
 * 3. 处理记录添加/移除/清空事件
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSelectionManager, SelectedRecord } from '@/lib/selection-manager';
import { useEditorStore } from '@/store/editorStore';

interface UseSelectionManagerResult {
  // 选中记录
  selectedRecords: SelectedRecord[];
  selectedCount: number;
  
  // 多选确认对话框
  showConfirmDialog: boolean;
  pendingRecordIds: string[];
  isLoading: boolean;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
  
  // 手动操作
  clearSelection: () => void;
  removeRecord: (recordId: string) => void;
  
  // 状态
  isMonitoring: boolean;
}

export function useSelectionManager(): UseSelectionManagerResult {
  const [selectedRecords, setSelectedRecords] = useState<SelectedRecord[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingRecordIds, setPendingRecordIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const managerRef = useRef(getSelectionManager());
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  
  const { 
    addCheckboxRecord, 
    removeCheckboxRecord, 
    clearCheckboxRecords,
    setCheckboxLoading 
  } = useEditorStore();

  // 处理多选确认
  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    setCheckboxLoading(true);
    
    try {
      // 触发确认，让 SelectionManager 继续加载
      if (resolveRef.current) {
        resolveRef.current(true);
        resolveRef.current = null;
      }
      
      // 等待数据加载完成
      await new Promise(resolve => setTimeout(resolve, 100));
    } finally {
      setIsLoading(false);
      setCheckboxLoading(false);
      setShowConfirmDialog(false);
      setPendingRecordIds([]);
    }
  }, [setCheckboxLoading]);

  // 处理取消
  const handleCancel = useCallback(() => {
    // 触发取消
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    
    setShowConfirmDialog(false);
    setPendingRecordIds([]);
  }, []);

  // 初始化监听
  useEffect(() => {
    const manager = managerRef.current;
    
    // 设置多选确认回调
    const unsubscribeConfirm = manager.onMultiSelectConfirm(async (recordIds) => {
      return new Promise<boolean>((resolve) => {
        // 显示确认对话框
        setPendingRecordIds(recordIds);
        setShowConfirmDialog(true);
        resolveRef.current = resolve;
      });
    });
    
    // 设置记录添加回调
    const unsubscribeAdd = manager.onRecordAdd((record) => {
      console.log('🎯 useSelectionManager: 记录添加', record.recordId);
      
      // 更新本地状态
      setSelectedRecords(prev => {
        if (prev.find(r => r.recordId === record.recordId)) {
          return prev;
        }
        return [...prev, record];
      });
      
      // 同步到 store
      addCheckboxRecord({
        id: record.recordId,
        data: record.data,
        timestamp: record.timestamp
      });
    });
    
    // 设置记录移除回调
    const unsubscribeRemove = manager.onRecordRemove((recordId) => {
      console.log('🎯 useSelectionManager: 记录移除', recordId);
      
      // 更新本地状态
      setSelectedRecords(prev => prev.filter(r => r.recordId !== recordId));
      
      // 同步到 store
      removeCheckboxRecord(recordId);
    });
    
    // 设置清空回调
    const unsubscribeClear = manager.onClear(() => {
      console.log('🎯 useSelectionManager: 清空所有记录');
      
      // 更新本地状态
      setSelectedRecords([]);
      
      // 同步到 store
      clearCheckboxRecords();
    });
    
    // 启动监控
    manager.startMonitoring();
    setIsMonitoring(true);
    
    return () => {
      unsubscribeConfirm();
      unsubscribeAdd();
      unsubscribeRemove();
      unsubscribeClear();
      manager.stopMonitoring();
      setIsMonitoring(false);
    };
  }, [addCheckboxRecord, removeCheckboxRecord, clearCheckboxRecords]);

  // 清空选择
  const clearSelection = useCallback(() => {
    const manager = managerRef.current;
    // 直接清空本地状态
    setSelectedRecords([]);
    clearCheckboxRecords();
  }, [clearCheckboxRecords]);

  // 移除单条记录
  const removeRecord = useCallback((recordId: string) => {
    setSelectedRecords(prev => prev.filter(r => r.recordId !== recordId));
    removeCheckboxRecord(recordId);
  }, [removeCheckboxRecord]);

  return {
    selectedRecords,
    selectedCount: selectedRecords.length,
    showConfirmDialog,
    pendingRecordIds,
    isLoading,
    handleConfirm,
    handleCancel,
    clearSelection,
    removeRecord,
    isMonitoring,
  };
}
