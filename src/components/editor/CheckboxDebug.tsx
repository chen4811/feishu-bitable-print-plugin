/**
 * 复选框选中调试工具组件
 * 
 * 功能：
 * 1. 显示 SDK API 可用性
 * 2. 手动触发选中记录检查
 * 3. 显示当前选中状态
 * 4. 完整的插件环境验证
 * 5. 集成 SelectionManager 显示选中记录
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { feishuEnv } from '@/lib/feishu-env';
import { getSelectionManager, SelectedRecord } from '@/lib/selection-manager';
import { SelectionConfirmDialog } from './SelectionConfirmDialog';
import { useEditorStore } from '@/store/editorStore';

interface DebugInfo {
  hasBitable: boolean;
  hasBase: boolean;
  hasUi: boolean;
  hasGetSelectRecordIds: boolean;
  hasOnSelectRecordIdsChange: boolean;
  hasGetSelection: boolean;
  hasOnSelectionChange: boolean;
  currentSelection: any;
  selectedRecordIds: string[];
  lastEvent: any;
  // 环境验证
  permission: any;
  tableList: any[];
  firstTableFields: any[];
}

export function CheckboxDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    hasBitable: false,
    hasBase: false,
    hasUi: false,
    hasGetSelectRecordIds: false,
    hasOnSelectRecordIdsChange: false,
    hasGetSelection: false,
    hasOnSelectionChange: false,
    currentSelection: null,
    selectedRecordIds: [],
    lastEvent: null,
    permission: null,
    tableList: [],
    firstTableFields: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // 🔥 多选确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingRecordIds, setPendingRecordIds] = useState<string[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  
  // 🔥 选中的记录（来自 SelectionManager）
  const [managedRecords, setManagedRecords] = useState<SelectedRecord[]>([]);
  
  // 🔥 Store 中的记录
  const checkboxRecords = useEditorStore(state => state.checkboxRecords);
  const addCheckboxRecord = useEditorStore(state => state.addCheckboxRecord);
  const removeCheckboxRecord = useEditorStore(state => state.removeCheckboxRecord);
  const clearCheckboxRecords = useEditorStore(state => state.clearCheckboxRecords);
  const setCheckboxLoading = useEditorStore(state => state.setCheckboxLoading);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[CheckboxDebug] ${message}`);
  }, []);

  // 🔥 完整的插件环境验证（按照用户提供的脚本）
  const validatePluginEnvironment = useCallback(async () => {
    setIsLoading(true);
    addLog('🧪 ========== 开始完整环境验证 ==========');
    
    try {
      const { bitable, base } = await import('@lark-base-open/js-sdk');
      
      // 1. 验证 bitable 对象
      addLog('--- 1. 验证 bitable 对象 ---');
      const hasBitable = typeof bitable !== 'undefined';
      const hasBase = typeof bitable?.base !== 'undefined';
      addLog(`Bitable 对象: ${typeof bitable}`);
      addLog(`Bitable.base: ${typeof bitable?.base}`);
      
      // 打印 bitable 的所有属性和方法
      if (bitable) {
        addLog(`bitable 可用属性: ${Object.keys(bitable).join(', ')}`);
      }
      
      setDebugInfo(prev => ({ ...prev, hasBitable, hasBase }));
      
      // 2. 验证权限
      addLog('--- 2. 验证权限 ---');
      try {
        // getPermission 可能需要参数或不存在
        if (typeof (base as any).getPermission === 'function') {
          const permission = await (base as any).getPermission();
          addLog(`权限状态: ${JSON.stringify(permission)}`);
          setDebugInfo(prev => ({ ...prev, permission }));
        } else {
          addLog('getPermission 方法不存在');
        }
      } catch (error) {
        addLog(`权限验证失败: ${error}`);
      }
      
      // 3. 验证表格访问
      addLog('--- 3. 验证表格访问 ---');
      try {
        const tableList = await base.getTableList();
        addLog(`表格列表数量: ${tableList?.length || 0}`);
        if (tableList && tableList.length > 0) {
          tableList.forEach((table: any, index: number) => {
            addLog(`  表格${index + 1}: id=${table.id}, name=${table.name}`);
          });
        }
        setDebugInfo(prev => ({ ...prev, tableList: tableList || [] }));
        
        if (tableList && tableList.length > 0) {
          const table = await base.getTableById(tableList[0].id);
          const fields = await table.getFieldList();
          addLog(`第一个表格的字段数量: ${fields?.length || 0}`);
          if (fields && fields.length > 0) {
            fields.slice(0, 5).forEach((field: any, index: number) => {
              addLog(`  字段${index + 1}: id=${field.id}, name=${field.name}`);
            });
            if (fields.length > 5) {
              addLog(`  ... 共 ${fields.length} 个字段`);
            }
          }
          setDebugInfo(prev => ({ ...prev, firstTableFields: fields || [] }));
        }
      } catch (error) {
        addLog(`表格访问验证失败: ${error}`);
      }
      
      // 4. 🔥 验证 bitable.ui（复选框选中关键 API）
      addLog('--- 4. 验证 bitable.ui（复选框选中关键 API）---');
      const hasUi = !!(bitable as any).ui;
      addLog(`bitable.ui 存在: ${hasUi}`);
      
      if (hasUi) {
        const ui = (bitable as any).ui;
        addLog(`bitable.ui 可用方法: ${Object.keys(ui).join(', ')}`);
        
        // 检查 getSelectRecordIds
        const hasGetSelectRecordIds = typeof ui.getSelectRecordIds === 'function';
        addLog(`bitable.ui.getSelectRecordIds 可用: ${hasGetSelectRecordIds}`);
        
        // 检查 onSelectRecordIdsChange
        const hasOnSelectRecordIdsChange = typeof ui.onSelectRecordIdsChange === 'function';
        addLog(`bitable.ui.onSelectRecordIdsChange 可用: ${hasOnSelectRecordIdsChange}`);
        
        // 🔥 尝试调用 getSelectRecordIds
        if (hasGetSelectRecordIds) {
          try {
            const selectedIds = await ui.getSelectRecordIds();
            addLog(`当前复选框选中的记录 ID: ${JSON.stringify(selectedIds)}`);
            addLog(`选中数量: ${selectedIds?.length || 0}`);
            setDebugInfo(prev => ({ 
              ...prev, 
              selectedRecordIds: selectedIds || [],
              hasGetSelectRecordIds: true,
              hasUi: true
            }));
          } catch (e) {
            addLog(`调用 getSelectRecordIds 失败: ${e}`);
            setDebugInfo(prev => ({ ...prev, hasGetSelectRecordIds: false, hasUi: true }));
          }
        } else {
          setDebugInfo(prev => ({ ...prev, hasGetSelectRecordIds: false, hasUi: true }));
        }
        
        setDebugInfo(prev => ({ ...prev, hasOnSelectRecordIdsChange }));
      } else {
        addLog('⚠️ bitable.ui 不存在！这是复选框选中功能不可用的原因');
        setDebugInfo(prev => ({ ...prev, hasUi: false, hasGetSelectRecordIds: false }));
      }
      
      // 5. 验证 base.getSelection 和 onSelectionChange
      addLog('--- 5. 验证 base.getSelection ---');
      const hasGetSelection = typeof base.getSelection === 'function';
      const hasOnSelectionChange = typeof base.onSelectionChange === 'function';
      addLog(`base.getSelection 可用: ${hasGetSelection}`);
      addLog(`base.onSelectionChange 可用: ${hasOnSelectionChange}`);
      
      if (hasGetSelection) {
        try {
          const selection = await base.getSelection();
          addLog(`当前选择信息: ${JSON.stringify(selection)}`);
          setDebugInfo(prev => ({ ...prev, currentSelection: selection }));
        } catch (e) {
          addLog(`调用 getSelection 失败: ${e}`);
        }
      }
      
      setDebugInfo(prev => ({ ...prev, hasGetSelection, hasOnSelectionChange }));
      
      addLog('✅ ========== 环境验证完成 ==========');
      
    } catch (error) {
      addLog(`❌ 环境验证失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  // 获取当前选择状态
  const checkCurrentSelection = useCallback(async () => {
    setIsLoading(true);
    addLog('开始检查当前选择状态...');
    
    try {
      const { bitable, base } = await import('@lark-base-open/js-sdk');
      
      // 1. 检查 base.getSelection()
      if (typeof base.getSelection === 'function') {
        const selection = await base.getSelection();
        addLog(`base.getSelection() 返回: ${JSON.stringify(selection)}`);
        setDebugInfo(prev => ({ ...prev, currentSelection: selection }));
      }
      
      // 2. 检查 bitable.ui.getSelectRecordIds()
      if ((bitable as any).ui && typeof (bitable as any).ui.getSelectRecordIds === 'function') {
        const recordIds = await (bitable as any).ui.getSelectRecordIds();
        addLog(`bitable.ui.getSelectRecordIds() 返回: ${JSON.stringify(recordIds)}`);
        addLog(`选中记录数量: ${recordIds?.length || 0}`);
        setDebugInfo(prev => ({ ...prev, selectedRecordIds: recordIds || [] }));
      }
      
    } catch (error) {
      addLog(`检查失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  // 手动获取选中记录数据
  const fetchSelectedRecords = useCallback(async () => {
    setIsLoading(true);
    addLog('开始获取选中记录数据...');
    
    try {
      // 🔥 优先使用轮询获取的当前状态
      const currentSelection = feishuEnv.getCurrentPolledSelection();
      if (currentSelection.recordIds.length > 0) {
        addLog(`当前轮询状态: ${currentSelection.count} 条记录`);
        
        // 使用 SDK 获取记录数据
        const { bitable, base } = await import('@lark-base-open/js-sdk');
        const tableId = currentSelection.tableId;
        
        if (tableId) {
          const table = await base.getTableById(tableId);
          
          // 尝试批量获取
          if (typeof (table as any).getRecordsByIds === 'function') {
            const records = await (table as any).getRecordsByIds(currentSelection.recordIds);
            addLog(`获取到 ${records?.length || 0} 条记录数据`);
            if (records && records.length > 0) {
              addLog(`第一条记录字段: ${Object.keys(records[0].fields || {}).slice(0, 5).join(', ')}...`);
            }
          } else {
            addLog('getRecordsByIds 方法不可用');
          }
        }
      } else {
        addLog('当前没有选中记录');
      }
      
      // 也尝试使用原有方法
      const records = await feishuEnv.getCheckboxSelectedRecords();
      addLog(`getCheckboxSelectedRecords 返回: ${records.length} 条记录`);
      
    } catch (error) {
      addLog(`获取失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  // 注册事件监听器
  useEffect(() => {
    const setupListeners = async () => {
      try {
        const { bitable, base } = await import('@lark-base-open/js-sdk');
        
        // 1. 监听 base.onSelectionChange（单元格选择）
        if (typeof base.onSelectionChange === 'function') {
          base.onSelectionChange((event: any) => {
            addLog(`🎯 base.onSelectionChange 触发: ${JSON.stringify(event)}`);
            setDebugInfo(prev => ({ ...prev, lastEvent: { type: 'selectionChange', data: event } }));
          });
          addLog('已注册 base.onSelectionChange 监听器');
        }
        
        // 2. 监听 bitable.ui.onSelectRecordIdsChange（复选框选中 - 可能不可用）
        if ((bitable as any).ui && typeof (bitable as any).ui.onSelectRecordIdsChange === 'function') {
          (bitable as any).ui.onSelectRecordIdsChange((event: any) => {
            addLog(`🎯 bitable.ui.onSelectRecordIdsChange 触发: ${JSON.stringify(event)}`);
            setDebugInfo(prev => ({ 
              ...prev, 
              lastEvent: { type: 'selectRecordIdsChange', data: event },
              selectedRecordIds: event.data?.recordIds || []
            }));
          });
          addLog('已注册 bitable.ui.onSelectRecordIdsChange 监听器');
        }
        
        // 🔥 3. 使用轮询方式监听复选框选择变化（主要方案）
        const unsubscribe = feishuEnv.onCheckboxPollingChange((event) => {
          addLog(`🎯 [轮询检测] 复选框选择状态变化! tableId=${event.tableId}, count=${event.count}`);
          setDebugInfo(prev => ({ 
            ...prev, 
            lastEvent: { type: 'pollingChange', data: event },
            selectedRecordIds: event.recordIds
          }));
        });
        addLog('🔥 已启动复选框选择状态轮询监听');
        
        // 🔥 4. 初始化 SelectionManager
        const manager = getSelectionManager();
        
        // 设置多选确认回调
        const unsubscribeConfirm = manager.onMultiSelectConfirm(async (recordIds) => {
          return new Promise<boolean>((resolve) => {
            setPendingRecordIds(recordIds);
            setShowConfirmDialog(true);
            // resolve 会在 handleConfirm/handleCancel 中调用
            (window as any).__selectionResolve = resolve;
          });
        });
        
        // 设置记录添加回调
        const unsubscribeAdd = manager.onRecordAdd((record) => {
          addLog(`✅ 记录添加到画布: ${record.recordId}`);
          setManagedRecords(prev => {
            if (prev.find(r => r.recordId === record.recordId)) return prev;
            return [...prev, record];
          });
          addCheckboxRecord({
            id: record.recordId,
            data: record.data,
            timestamp: record.timestamp
          });
        });
        
        // 设置记录移除回调
        const unsubscribeRemove = manager.onRecordRemove((recordId) => {
          addLog(`➖ 记录从画布移除: ${recordId}`);
          setManagedRecords(prev => prev.filter(r => r.recordId !== recordId));
          removeCheckboxRecord(recordId);
        });
        
        // 设置清空回调
        const unsubscribeClear = manager.onClear(() => {
          addLog(`🗑️ 清空所有选中记录`);
          setManagedRecords([]);
          clearCheckboxRecords();
        });
        
        // 启动监控
        manager.startMonitoring();
        addLog('🔥 SelectionManager 已启动');
        
        // 清理函数
        return () => {
          unsubscribe();
          unsubscribeConfirm();
          unsubscribeAdd();
          unsubscribeRemove();
          unsubscribeClear();
          manager.stopMonitoring();
        };
      } catch (error) {
        addLog(`注册监听器失败: ${error}`);
      }
    };
    
    setupListeners();
  }, [addLog, addCheckboxRecord, removeCheckboxRecord, clearCheckboxRecords]);
  
  // 🔥 处理多选确认
  const handleConfirm = useCallback(async () => {
    setIsLoadingRecords(true);
    setCheckboxLoading(true);
    
    // 触发确认
    if ((window as any).__selectionResolve) {
      (window as any).__selectionResolve(true);
      (window as any).__selectionResolve = null;
    }
    
    // 等待数据加载
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsLoadingRecords(false);
    setCheckboxLoading(false);
    setShowConfirmDialog(false);
    setPendingRecordIds([]);
  }, [setCheckboxLoading]);
  
  // 🔥 处理取消
  const handleCancel = useCallback(() => {
    if ((window as any).__selectionResolve) {
      (window as any).__selectionResolve(false);
      (window as any).__selectionResolve = null;
    }
    setShowConfirmDialog(false);
    setPendingRecordIds([]);
  }, []);

  // 初始化检查
  useEffect(() => {
    validatePluginEnvironment();
  }, [validatePluginEnvironment]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          🔍 复选框选中调试
          {isLoading && <Badge variant="secondary">加载中...</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API 可用性状态 */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">API 可用性</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <Badge variant={debugInfo.hasBitable ? "default" : "destructive"} className="text-[10px]">
                {debugInfo.hasBitable ? '✓' : '✗'}
              </Badge>
              <span>bitable</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={debugInfo.hasBase ? "default" : "destructive"} className="text-[10px]">
                {debugInfo.hasBase ? '✓' : '✗'}
              </Badge>
              <span>bitable.base</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={debugInfo.hasUi ? "default" : "destructive"} className="text-[10px]">
                {debugInfo.hasUi ? '✓' : '✗'}
              </Badge>
              <span>bitable.ui</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={debugInfo.hasGetSelectRecordIds ? "default" : "destructive"} className="text-[10px]">
                {debugInfo.hasGetSelectRecordIds ? '✓' : '✗'}
              </Badge>
              <span>getSelectRecordIds</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={debugInfo.hasOnSelectRecordIdsChange ? "default" : "destructive"} className="text-[10px]">
                {debugInfo.hasOnSelectRecordIdsChange ? '✓' : '✗'}
              </Badge>
              <span>onSelectRecordIdsChange</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={debugInfo.hasGetSelection ? "default" : "destructive"} className="text-[10px]">
                {debugInfo.hasGetSelection ? '✓' : '✗'}
              </Badge>
              <span>getSelection</span>
            </div>
          </div>
        </div>
        
        {/* 权限状态 */}
        {debugInfo.permission && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">权限状态</div>
            <div className="text-xs bg-muted p-2 rounded">
              <pre className="text-[10px] overflow-auto max-h-20">
                {JSON.stringify(debugInfo.permission, null, 2)}
              </pre>
            </div>
          </div>
        )}
        
        {/* 表格列表 */}
        {debugInfo.tableList.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">表格列表 ({debugInfo.tableList.length} 个)</div>
            <div className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
              {debugInfo.tableList.map((table, index) => (
                <div key={table.id} className="truncate">{index + 1}. {table.name} ({table.id})</div>
              ))}
            </div>
          </div>
        )}
        
        {/* 当前选中状态 */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <span>🔥 轮询检测选中记录: {debugInfo.selectedRecordIds.length} 条</span>
            <Badge variant="outline" className="text-[10px]">每秒轮询</Badge>
          </div>
          <div className="text-[10px] text-muted-foreground">
            飞书多维表格表头复选框选择不会触发标准事件，使用轮询方式检测
          </div>
          {debugInfo.selectedRecordIds.length > 0 && (
            <div className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
              {debugInfo.selectedRecordIds.slice(0, 5).map((id, index) => (
                <div key={id} className="truncate">{index + 1}. {id}</div>
              ))}
              {debugInfo.selectedRecordIds.length > 5 && (
                <div className="text-muted-foreground">... 共 {debugInfo.selectedRecordIds.length} 条</div>
              )}
            </div>
          )}
        </div>
        
        {/* 最后事件 */}
        {debugInfo.lastEvent && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">最后事件</div>
            <div className="text-xs bg-muted p-2 rounded">
              <div>类型: {debugInfo.lastEvent.type}</div>
              <pre className="text-[10px] overflow-auto max-h-20">
                {JSON.stringify(debugInfo.lastEvent.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={validatePluginEnvironment} disabled={isLoading}>
            完整环境验证
          </Button>
          <Button size="sm" variant="outline" onClick={checkCurrentSelection} disabled={isLoading}>
            检查选中状态
          </Button>
          <Button size="sm" variant="default" onClick={fetchSelectedRecords} disabled={isLoading}>
            获取选中记录
          </Button>
        </div>
        
        {/* 🔥 选中记录管理（SelectionManager） */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <span>📋 已加载到画布的记录: {managedRecords.length} 条</span>
            {isLoadingRecords && <Badge variant="secondary">加载中...</Badge>}
          </div>
          <div className="text-[10px] text-muted-foreground">
            SelectionManager 管理：首次单选自动载入，多选弹出确认，取消选中自动移除
          </div>
          {managedRecords.length > 0 && (
            <div className="text-xs bg-green-50 border border-green-200 p-2 rounded max-h-32 overflow-auto">
              {managedRecords.map((record, index) => (
                <div key={record.recordId} className="flex items-center justify-between truncate py-0.5 border-b border-green-100 last:border-0">
                  <span className="text-green-700">{index + 1}. {record.recordId}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(record.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 日志 */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">日志</div>
          <div className="text-xs bg-black text-green-400 p-2 rounded max-h-40 overflow-auto font-mono">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">暂无日志</div>
            ) : (
              logs.slice(-20).map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>
      </CardContent>
      
      {/* 🔥 多选确认对话框 */}
      <SelectionConfirmDialog
        open={showConfirmDialog}
        selectedCount={pendingRecordIds.length}
        isLoading={isLoadingRecords}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Card>
  );
}
