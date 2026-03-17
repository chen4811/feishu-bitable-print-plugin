/**
 * 复选框选中调试工具组件
 * 
 * 功能：
 * 1. 显示 SDK API 可用性
 * 2. 手动触发选中记录检查
 * 3. 显示当前选中状态
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { feishuEnv } from '@/lib/feishu-env';

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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[CheckboxDebug] ${message}`);
  }, []);

  // 检查 API 可用性
  const checkApiAvailability = useCallback(async () => {
    setIsLoading(true);
    addLog('开始检查 API 可用性...');
    
    try {
      // 动态导入 SDK
      const { bitable, base } = await import('@lark-base-open/js-sdk');
      
      const hasBitable = !!bitable;
      const hasBase = !!base;
      const hasUi = !!(bitable as any).ui;
      const hasGetSelectRecordIds = hasUi && typeof (bitable as any).ui?.getSelectRecordIds === 'function';
      const hasOnSelectRecordIdsChange = hasUi && typeof (bitable as any).ui?.onSelectRecordIdsChange === 'function';
      const hasGetSelection = typeof base.getSelection === 'function';
      const hasOnSelectionChange = typeof base.onSelectionChange === 'function';
      
      addLog(`bitable 存在: ${hasBitable}`);
      addLog(`base 存在: ${hasBase}`);
      addLog(`bitable.ui 存在: ${hasUi}`);
      addLog(`getSelectRecordIds 可用: ${hasGetSelectRecordIds}`);
      addLog(`onSelectRecordIdsChange 可用: ${hasOnSelectRecordIdsChange}`);
      addLog(`getSelection 可用: ${hasGetSelection}`);
      addLog(`onSelectionChange 可用: ${hasOnSelectionChange}`);
      
      setDebugInfo(prev => ({
        ...prev,
        hasBitable,
        hasBase,
        hasUi,
        hasGetSelectRecordIds,
        hasOnSelectRecordIdsChange,
        hasGetSelection,
        hasOnSelectionChange,
      }));
      
    } catch (error) {
      addLog(`检查失败: ${error}`);
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
      const records = await feishuEnv.getCheckboxSelectedRecords();
      addLog(`获取到 ${records.length} 条记录`);
      
      if (records.length > 0) {
        addLog(`第一条记录: ${JSON.stringify(records[0])}`);
      }
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
        
        // 2. 监听 bitable.ui.onSelectRecordIdsChange（复选框选中）
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
        
        // 3. 使用 feishuEnv 的监听器
        feishuEnv.onCheckboxSelectionChange((event) => {
          addLog(`🎯 feishuEnv.onCheckboxSelectionChange 触发: tableId=${event.tableId}, count=${event.count}`);
          setDebugInfo(prev => ({ 
            ...prev, 
            lastEvent: { type: 'checkboxSelectionChange', data: event },
            selectedRecordIds: event.recordIds
          }));
        });
        addLog('已注册 feishuEnv.onCheckboxSelectionChange 监听器');
        
      } catch (error) {
        addLog(`注册监听器失败: ${error}`);
      }
    };
    
    setupListeners();
  }, [addLog]);

  // 初始化检查
  useEffect(() => {
    checkApiAvailability();
  }, [checkApiAvailability]);

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
        
        {/* 当前选中状态 */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            当前选中记录: {debugInfo.selectedRecordIds.length} 条
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
          <Button size="sm" variant="outline" onClick={checkApiAvailability} disabled={isLoading}>
            检查 API
          </Button>
          <Button size="sm" variant="outline" onClick={checkCurrentSelection} disabled={isLoading}>
            检查选中状态
          </Button>
          <Button size="sm" variant="default" onClick={fetchSelectedRecords} disabled={isLoading}>
            获取选中记录
          </Button>
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
    </Card>
  );
}
