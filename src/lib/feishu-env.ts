/**
 * 飞书 SDK 环境 - 增强版（整合新 SDK 逻辑）
 * 
 * 核心改进：
 * 1. 使用 bitable.bridge.onReady() 异步回调判断环境
 * 2. 不再依赖同步的 window.lark 检测
 * 3. 提供统一的状态管理和错误处理
 * 4. 添加回调移除机制，防止内存泄漏和重复调用
 * 5. 新增：选中变化监听器（onSelectionChange）
 * 6. 新增：详细的调试日志系统
 * 7. 新增：方案A实现（getTableById + getRecordById）
 */

import { bitable, base } from '@lark-base-open/js-sdk';

// ============================================
// 调试日志系统
// ============================================
const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  console.log(`[FeishuEnv][${timestamp}] ${message}`, data || '');
}

// ============================================
// 类型定义
// ============================================

// 字段信息接口
interface FieldInfo {
  id: string;
  name: string;
  type: string;
}

// 应用元数据接口
interface AppMetadata {
  appId: string;
  name: string;
  defaultTableId: string;
  description?: string;
}

// 全局上下文接口
export interface FeishuContext {
  appToken: string;
  targetTableId: string;
  fieldNameToIdMap: Record<string, string>;
  firstRecordData: Record<string, unknown> | null;
  appMetadata: AppMetadata | null;
}

// 选中信息接口
interface SelectionInfo {
  baseId: string | null;
  fieldId: string | null;
  recordId: string | null;
  tableId: string | null;
  viewId: string | null;
}

// 选中变化事件接口
interface SelectionChangeEvent {
  data: SelectionInfo;
}

// 环境状态类型
export type FeishuEnvStatus = 'checking' | 'ready' | 'not_feishu' | 'error';

// 记录类型
interface BitableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
  lastModifiedTime: string;
}

// ============================================
// 全局状态
// ============================================

let envStatus: FeishuEnvStatus = 'checking';
let envError: string | null = null;
let onReadyCallbacks: Set<() => void> = new Set();
let onNotFeishuCallbacks: Set<() => void> = new Set();
let onSelectionChangeCallbacks: Set<(event: SelectionChangeEvent) => void> = new Set();
let initPromise: Promise<boolean> | null = null;
let isInitialized = false;
let selectionUnsubscribe: (() => void) | null = null;

// 字段类型映射
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text', 2: 'number', 3: 'singleSelect', 4: 'multiSelect',
  5: 'date', 6: 'checkbox', 7: 'user', 8: 'url',
  9: 'phone', 10: 'email', 11: 'attachment', 12: 'formula',
  13: 'progress', 14: 'currency', 15: 'rating', 16: 'location',
  17: 'relation', 18: 'group', 19: 'barcode', 20: 'modifiedTime',
  21: 'createdTime', 22: 'modifiedUser', 23: 'createdUser', 24: 'autoNumber',
};

// ============================================
// 基础状态查询函数
// ============================================

export function getEnvStatus(): FeishuEnvStatus {
  return envStatus;
}

export function getEnvError(): string | null {
  return envError;
}

export function isFeishuEnvironment(): boolean {
  return envStatus === 'ready';
}

// ============================================
// 回调管理函数
// ============================================

export function onFeishuReady(callback: () => void): () => void {
  if (envStatus === 'ready') {
    callback();
    return () => {};
  }
  onReadyCallbacks.add(callback);
  return () => { onReadyCallbacks.delete(callback); };
}

export function offFeishuReady(callback: () => void): void {
  onReadyCallbacks.delete(callback);
}

export function onNotFeishu(callback: () => void): () => void {
  if (envStatus === 'not_feishu') {
    callback();
    return () => {};
  }
  onNotFeishuCallbacks.add(callback);
  return () => { onNotFeishuCallbacks.delete(callback); };
}

export function offNotFeishu(callback: () => void): void {
  onNotFeishuCallbacks.delete(callback);
}

// ============================================
// 新增：选中变化监听
// ============================================

export function onSelectionChange(callback: (event: SelectionChangeEvent) => void): () => void {
  debugLog('注册选中变化监听器');
  onSelectionChangeCallbacks.add(callback);
  
  // 如果还没设置监听器，现在设置
  if (!selectionUnsubscribe && envStatus === 'ready') {
    setupSelectionListener();
  }
  
  return () => {
    debugLog('移除选中变化监听器');
    onSelectionChangeCallbacks.delete(callback);
  };
}

function setupSelectionListener() {
  if (selectionUnsubscribe) {
    debugLog('选中监听器已存在，跳过');
    return;
  }
  
  try {
    debugLog('======== 设置选中变化监听器 ========');
    
    if (typeof (bitable.base as any).onSelectionChange === 'function') {
      selectionUnsubscribe = (bitable.base as any).onSelectionChange((event: SelectionChangeEvent) => {
        debugLog('🎯 选中变化事件触发! (回调方式)');
        debugLog('事件数据:', event);
        
        // 通知所有注册的回调
        onSelectionChangeCallbacks.forEach(cb => {
          try {
            cb(event);
          } catch (e) {
            console.error('[FeishuEnv] 选中变化回调执行失败:', e);
          }
        });
      });
      
      debugLog('✅ 选中监听器设置成功');
    } else if (typeof (bitable as any).onSelectionChange === 'function') {
      selectionUnsubscribe = (bitable as any).onSelectionChange((event: SelectionChangeEvent) => {
        debugLog('🎯 选中变化事件触发! (回调方式)');
        debugLog('事件数据:', event);
        
        onSelectionChangeCallbacks.forEach(cb => {
          try {
            cb(event);
          } catch (e) {
            console.error('[FeishuEnv] 选中变化回调执行失败:', e);
          }
        });
      });
      
      debugLog('✅ 选中监听器设置成功');
    } else {
      debugLog('⚠️  不支持 onSelectionChange');
    }
  } catch (error) {
    debugLog('❌ 设置选中监听器失败:', error);
  }
}

// ============================================
// 初始化飞书环境
// ============================================

export async function initFeishuEnv(): Promise<boolean> {
  if (isInitialized && initPromise) {
    return initPromise;
  }
  
  isInitialized = true;
  debugLog('======== 开始环境检测 ========');

  initPromise = (async () => {
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    debugLog('inIframe:', inIframe);

    if (!inIframe) {
      envStatus = 'not_feishu';
      envError = '不在 iframe 中';
      debugLog('不在 iframe 中，判定为非飞书环境');
      onNotFeishuCallbacks.forEach(cb => cb());
      return false;
    }

    try {
      debugLog('尝试初始化 SDK...');
      
      const timeout = 5000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('SDK 初始化超时')), timeout);
      });

      const initSdk = async () => {
        const selection = await base.getSelection();
        debugLog('getSelection() 成功:', selection);
        return selection;
      };

      await Promise.race([initSdk(), timeoutPromise]);

      envStatus = 'ready';
      debugLog('✅ SDK 初始化成功，飞书环境已就绪');
      
      // 立即设置选中监听器
      setupSelectionListener();
      
      onReadyCallbacks.forEach(cb => cb());
      return true;

    } catch (error) {
      debugLog('⚠️  SDK 初始化失败:', error);
      
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const urlHasFeishu = url.includes('feishu.cn') || 
                           url.includes('larksuite.com') ||
                           url.includes('bytedance');

      if (urlHasFeishu) {
        envStatus = 'error';
        envError = `SDK 初始化失败: ${error}`;
        debugLog('URL 包含飞书域名，但 SDK 未就绪');
        return false;
      }

      envStatus = 'not_feishu';
      envError = 'SDK 初始化失败';
      debugLog('判定为非飞书环境');
      
      onNotFeishuCallbacks.forEach(cb => cb());
      return false;
    }
  })();

  return initPromise;
}

// ============================================
// 数据获取函数（保持原有接口）
// ============================================

export async function fetchFields(): Promise<Array<{
  id: string;
  name: string;
  type: string;
}>> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法获取字段');
    return [];
  }

  try {
    const selection = await base.getSelection();
    debugLog('selection:', selection);
    
    if (!selection?.tableId) {
      debugLog('无法获取 tableId');
      return [];
    }
    
    const table = await base.getTable(selection.tableId);
    debugLog('table:', !!table);
    
    debugLog('开始获取字段数据...');
    const rawFields = await table.getFieldList();
    debugLog('原始字段数量:', rawFields.length);
    
    const fields: FieldInfo[] = [];
    for (let index = 0; index < rawFields.length; index++) {
      const field = rawFields[index];
      
      try {
        const name = await field.getName();
        const type = await field.getType();
        const meta = await field.getMeta();
        
        const mappedType = FIELD_TYPE_MAP[type] || 'text';
        
        fields.push({
          id: meta.id || `field_${index}`,
          name: name || `字段${index + 1}`,
          type: mappedType,
        });
      } catch (error) {
        debugLog(`获取字段 ${index} 信息失败:`, error);
        fields.push({
          id: `field_${index}`,
          name: `字段${index + 1}`,
          type: 'text',
        });
      }
    }
    
    debugLog('最终返回的字段列表:', fields);
    return fields;
  } catch (error) {
    debugLog('获取字段失败:', error);
    return [];
  }
}

export async function fetchRecords(): Promise<Array<{
  id: string;
  fields: Record<string, unknown>;
}>> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法获取记录');
    return [];
  }

  try {
    const selection = await base.getSelection();
    if (!selection?.tableId) {
      debugLog('无法获取 tableId');
      return [];
    }
    
    const table = await base.getTable(selection.tableId);
    
    const recordIdList = await table.getRecordIdList();
    debugLog('获取到记录 ID 数量:', recordIdList?.length || 0);
    
    if (!Array.isArray(recordIdList) || recordIdList.length === 0) {
      return [];
    }

    const limit = Math.min(recordIdList.length, 100);
    const records: Array<{ id: string; fields: Record<string, unknown> }> = [];
    
    for (let i = 0; i < limit; i++) {
      try {
        const recordId = recordIdList[i];
        const record = await table.getRecordById(recordId);
        if (record) {
          records.push({
            id: recordId,
            fields: record.fields || {},
          });
        }
      } catch (e) {
        debugLog(`获取第 ${i} 条记录失败:`, e);
      }
    }

    debugLog('成功获取记录数:', records.length);
    return records;
  } catch (error) {
    debugLog('获取记录失败:', error);
    return [];
  }
}

// ============================================
// 新增：获取选中记录（方案A实现）
// ============================================

export async function getSelectedRecords(): Promise<BitableRecord[]> {
  debugLog('======== getSelectedRecords() 开始 ========');
  
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，返回空数组');
    return [];
  }

  try {
    debugLog('第一步：获取选中信息...');
    const selection = await base.getSelection();
    debugLog('选中信息:', selection);
    
    if (!selection?.tableId || !selection?.recordId) {
      debugLog('⚠️  没有 tableId 或 recordId，返回空数组');
      return [];
    }
    
    const { tableId, recordId } = selection;
    debugLog('✅ 获取到 tableId 和 recordId:', { tableId, recordId });
    
    debugLog('第二步：通过 tableId 获取表格...');
    let table: any = null;
    
    if (typeof base.getTableById === 'function') {
      debugLog('使用 base.getTableById()');
      table = await base.getTableById(tableId);
    } else {
      debugLog('回退到 base.getTable()');
      table = await base.getTable(tableId);
    }
    
    if (!table) {
      debugLog('❌ 无法获取表格实例');
      return [];
    }
    
    debugLog('第三步：通过 recordId 获取记录...');
    let recordData: any = null;
    
    if (typeof table.getRecordById === 'function') {
      debugLog('使用 table.getRecordById()');
      recordData = await table.getRecordById(recordId);
    } else {
      debugLog('回退到 table.getRecord()');
      recordData = await table.getRecord(recordId);
    }
    
    if (!recordData) {
      debugLog('❌ 无法获取记录数据');
      return [];
    }
    
    debugLog('第四步：获取字段元信息...');
    let fieldMetaList: any[] = [];
    
    if (typeof table.getFieldMetaList === 'function') {
      debugLog('使用 table.getFieldMetaList()');
      fieldMetaList = await table.getFieldMetaList();
    } else if (typeof table.getFieldList === 'function') {
      debugLog('回退到 getFieldList()');
      fieldMetaList = await table.getFieldList();
    }
    
    debugLog('第五步：处理数据...');
    const result = processRecordData(recordData, fieldMetaList);
    debugLog('✅ 数据处理完成:', result);
    debugLog('======== getSelectedRecords() 结束 ========');
    
    return [result];
  } catch (error) {
    debugLog('❌ getSelectedRecords() 失败:', error);
    debugLog('======== getSelectedRecords() 结束 ========');
    return [];
  }
}

function processRecordData(recordData: any, fieldMetaList: any[]): BitableRecord {
  debugLog('processRecordData 被调用');
  
  const { fields } = recordData;
  
  const fieldMap: Record<string, string> = {};
  fieldMetaList.forEach(field => {
    fieldMap[field.id] = field.name;
  });
  
  const formattedData: Record<string, unknown> = {};
  
  Object.keys(fields).forEach(fieldId => {
    const fieldName = fieldMap[fieldId] || fieldId;
    const fieldValue = fields[fieldId];
    formattedData[fieldName] = formatFieldValue(fieldValue);
  });
  
  debugLog('processRecordData 处理完成:', formattedData);
  
  return {
    id: recordData.id || recordData.recordId || '',
    fields: formattedData,
    createdTime: recordData.createdTime || new Date().toISOString(),
    lastModifiedTime: recordData.modifiedTime || new Date().toISOString(),
  };
}

function formatFieldValue(fieldValue: any): string {
  if (!fieldValue) return '';
  
  if (!Array.isArray(fieldValue)) {
    return String(fieldValue);
  }
  
  if (fieldValue[0] && fieldValue[0].text) {
    return fieldValue[0].text;
  }
  
  if (fieldValue[0] && fieldValue[0].id) {
    return fieldValue.map((item: any) => item.id || item.name || '').filter(Boolean).join(', ');
  }
  
  if (fieldValue[0] && fieldValue[0].name) {
    return fieldValue.map((item: any) => item.name || item.id || '').filter(Boolean).join(', ');
  }
  
  return JSON.stringify(fieldValue);
}

// ============================================
// 其他原有函数
// ============================================

export async function fetchAppMetadata(): Promise<AppMetadata | null> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法获取元数据');
    return null;
  }

  try {
    const selection = await base.getSelection();
    debugLog('selection:', selection);
    
    if (!selection?.tableId) {
      debugLog('无法获取 tableId');
      return null;
    }
    
    return {
      appId: (selection as any).appId || 'unknown',
      name: '多维表格',
      defaultTableId: selection.tableId,
      description: '从上下文获取',
    };
  } catch (error) {
    debugLog('获取元数据失败:', error);
    return null;
  }
}

export async function fetchFirstRecord(): Promise<Record<string, unknown> | null> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法获取首条记录');
    return null;
  }

  try {
    const selection = await base.getSelection();
    if (!selection?.tableId) {
      debugLog('无法获取 tableId');
      return null;
    }
    
    const table = await base.getTable(selection.tableId);
    
    const recordIdList = await table.getRecordIdList();
    debugLog('首条记录 - 获取到记录 ID 数量:', recordIdList?.length || 0);
    
    if (!Array.isArray(recordIdList) || recordIdList.length === 0) {
      debugLog('表格为空，没有记录');
      return null;
    }

    try {
      const firstRecordId = recordIdList[0];
      const record = await table.getRecordById(firstRecordId);
      if (record) {
        debugLog('成功获取首条记录:', !!record);
        return record.fields || {};
      }
    } catch (e) {
      debugLog('获取首条记录失败:', e);
    }

    return null;
  } catch (error) {
    debugLog('获取首条记录失败:', error);
    return null;
  }
}

export async function fetchTableName(): Promise<string> {
  if (envStatus !== 'ready') {
    return '未命名表格';
  }

  try {
    const selection = await base.getSelection();
    if (!selection?.tableId) {
      return '多维表格';
    }
    
    const table = await base.getTable(selection.tableId);
    return (table as any).name || '多维表格';
  } catch {
    return '多维表格';
  }
}

export async function initFeishuContext(): Promise<FeishuContext | null> {
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，无法初始化上下文');
    return null;
  }

  try {
    debugLog('开始初始化飞书上下文...');
    
    const appMetadata = await fetchAppMetadata();
    if (!appMetadata) {
      debugLog('无法获取元数据');
      return null;
    }
    
    const fields = await fetchFields();
    
    const fieldNameToIdMap: Record<string, string> = {};
    fields.forEach(field => {
      fieldNameToIdMap[field.name] = field.id;
    });
    debugLog('字段映射:', fieldNameToIdMap);
    
    const firstRecordData = await fetchFirstRecord();
    debugLog('首条记录数据:', !!firstRecordData);
    
    const context: FeishuContext = {
      appToken: appMetadata.appId,
      targetTableId: appMetadata.defaultTableId,
      fieldNameToIdMap,
      firstRecordData,
      appMetadata,
    };
    
    debugLog('飞书上下文初始化完成:', context);
    return context;
  } catch (error) {
    debugLog('初始化上下文失败:', error);
    return null;
  }
}

export function getDebugInfo(): Record<string, unknown> {
  return {
    envStatus,
    envError,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    inIframe: typeof window !== 'undefined' && window.self !== window.top,
  };
}

// ============================================
// 导出统一的 SDK 对象
// ============================================

export const feishuEnv = {
  getEnvStatus,
  getEnvError,
  isFeishuEnvironment,
  onFeishuReady,
  offFeishuReady,
  onNotFeishu,
  offNotFeishu,
  init: initFeishuEnv,
  fetchFields,
  fetchRecords,
  fetchTableName,
  fetchAppMetadata,
  fetchFirstRecord,
  initFeishuContext,
  getDebugInfo,
  // 新增
  onSelectionChange,
  getSelectedRecords,
};

export default feishuEnv;
