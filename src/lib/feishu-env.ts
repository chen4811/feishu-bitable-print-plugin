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

// 确保轮询函数可在外部控制
export { startPolling, stopPolling };
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
// 新增：复选框勾选变化监听
// ============================================

type RecordSelectChangeEvent = {
  data: {
    tableId: string;
    recordIds: string[];
    isSelectAll: boolean;
  };
};

const onRecordSelectChangeCallbacks = new Set<(event: RecordSelectChangeEvent) => void>();
let recordSelectUnsubscribe: (() => void) | null = null;

// ============================================
// 新增：调试和环境检查
// ============================================

async function debugEnvironment() {
  debugLog('🔍 ======== 环境调试开始 ========');
  
  try {
    // 检查SDK版本
    debugLog('SDK版本信息:', (bitable as any).version);
    
    // 测试1: 检查基础对象
    debugLog('bitable 对象:', typeof bitable);
    debugLog('bitable.ui 对象:', typeof (bitable as any).ui);
    debugLog('base 对象:', typeof base);
    
    // 测试2: 检查 bitable.ui 的所有方法
    if ((bitable as any).ui) {
      debugLog('bitable.ui 所有方法:', Object.keys((bitable as any).ui));
    }
    
    // 测试3: 检查方法是否存在（可能在初始化后才可用）
    debugLog('onRecordSelectChange 方法:', typeof (bitable as any).ui?.onRecordSelectChange);
    debugLog('getSelectRecordIds 方法:', typeof (bitable as any).ui?.getSelectRecordIds);
    debugLog('getSelection 方法:', typeof base.getSelection);
    
    // 测试4: 尝试直接调用 getSelectRecordIds（如果存在）
    if ((bitable as any).ui && typeof (bitable as any).ui.getSelectRecordIds === 'function') {
      try {
        const selectState = await (bitable as any).ui.getSelectRecordIds();
        debugLog('✅ 当前选中ID列表:', selectState);
      } catch (error) {
        debugLog('❌ 调用 getSelectRecordIds 失败:', error instanceof Error ? error.message : error);
      }
    } else {
      debugLog('⚠️ getSelectRecordIds 方法不存在');
    }
    
    // 测试5: 检查当前选择状态
    try {
      const selection = await base.getSelection();
      debugLog('当前 base.getSelection() 状态:', selection);
    } catch (error) {
      debugLog('获取 base.getSelection() 失败:', error instanceof Error ? error.message : error);
    }
    
  } catch (error) {
    debugLog('环境测试失败:', error);
  }
  
  debugLog('🔍 ======== 环境调试结束 ========');
}

function checkEnvironment() {
  debugLog('🌐 ======== 环境检查 ========');
  debugLog('URL:', typeof window !== 'undefined' ? window.location.href : 'unknown');
  debugLog('UserAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown');
  debugLog('是否在iframe中:', typeof window !== 'undefined' && window.self !== window.top);
  
  // 检查飞书环境特征
  const isFeishuEnv = typeof navigator !== 'undefined' && /lark|feishu/i.test(navigator.userAgent);
  debugLog('飞书环境:', isFeishuEnv);
  
  if (!isFeishuEnv) {
    debugLog('⚠️  可能不在飞书环境中运行');
  }
  
  debugLog('🌐 ======== 环境检查结束 ========');
}

// ============================================
// 新增：轮询检查作为备用方案
// ============================================

let pollingInterval: NodeJS.Timeout | null = null;
let lastPolledSelection: string[] = [];

function startPolling(interval = 2000) {
  if (pollingInterval) {
    debugLog('轮询已在运行，跳过');
    return;
  }
  
  debugLog(`🔁 启动轮询检查，间隔: ${interval}ms`);
  
  pollingInterval = setInterval(async () => {
    try {
      let currentSelection: string[] = [];
      let tableId = '';
      
      // ✅ 优先尝试使用 bitable.ui.getSelectRecordIds()
      if ((bitable as any).ui && typeof (bitable as any).ui.getSelectRecordIds === 'function') {
        try {
          currentSelection = await (bitable as any).ui.getSelectRecordIds();
          debugLog('✅ 使用 bitable.ui.getSelectRecordIds() 获取:', currentSelection);
        } catch (e) {
          debugLog('❌ bitable.ui.getSelectRecordIds() 调用失败:', e);
        }
      }
      
      // 如果上面的方法不可用或返回空，尝试使用 base.getSelection()
      if (currentSelection.length === 0) {
        const selection = await base.getSelection();
        if (selection?.recordId) {
          currentSelection = [selection.recordId];
          debugLog('⚠️ 使用 base.getSelection() 获取单条记录:', selection.recordId);
        }
        tableId = selection?.tableId || '';
      } else {
        // 如果从 ui.getSelectRecordIds 获取到数据，也要获取 tableId
        const selection = await base.getSelection();
        tableId = selection?.tableId || '';
      }
      
      // 检查是否有变化
      const hasChanged = JSON.stringify(currentSelection) !== JSON.stringify(lastPolledSelection);
      
      if (hasChanged) {
        debugLog('🔄 轮询检测到选择状态变化:', {
          recordIds: currentSelection,
          count: currentSelection.length,
          tableId,
        });
        
        // 构造事件对象
        const event: RecordSelectChangeEvent = {
          data: {
            tableId,
            recordIds: currentSelection,
            isSelectAll: false,
          },
        };
        
        // 通知所有回调
        onRecordSelectChangeCallbacks.forEach(cb => {
          try {
            cb(event);
          } catch (e) {
            console.error('[FeishuEnv] 轮询回调执行失败:', e);
          }
        });
        
        lastPolledSelection = currentSelection;
      }
      
    } catch (error) {
      debugLog('轮询检查失败:', error instanceof Error ? error.message : error);
    }
  }, interval);
  
  debugLog('✅ 轮询已启动');
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    lastPolledSelection = [];
    debugLog('🛑 轮询检查已停止');
  }
}

export function onRecordSelectChange(callback: (event: RecordSelectChangeEvent) => void): () => void {
  debugLog('注册复选框勾选变化监听器');
  onRecordSelectChangeCallbacks.add(callback);
  
  // 如果还没设置监听器，现在设置
  if (!recordSelectUnsubscribe && envStatus === 'ready') {
    setupRecordSelectListener();
  }
  
  return () => {
    debugLog('移除复选框勾选变化监听器');
    onRecordSelectChangeCallbacks.delete(callback);
  };
}

function setupRecordSelectListener() {
  if (recordSelectUnsubscribe) {
    debugLog('复选框勾选监听器已存在，跳过');
    return;
  }
  
  try {
    debugLog('🔄 ======== 设置复选框勾选变化监听器 ========');
    
    // 先进行环境检查和调试
    checkEnvironment();
    debugEnvironment();
    
    // 检查 bitable.ui 是否存在
    if ((bitable as any).ui && typeof (bitable as any).ui.onRecordSelectChange === 'function') {
      debugLog('✅ 找到 onRecordSelectChange 方法，设置事件监听器');
      
      recordSelectUnsubscribe = (bitable as any).ui.onRecordSelectChange((event: RecordSelectChangeEvent) => {
        debugLog('🎯 ======== 复选框勾选事件触发! ========');
        debugLog('事件数据:', event);
        debugLog('选中记录 IDs:', event.data.recordIds);
        debugLog('选中记录数量:', event.data.recordIds.length);
        debugLog('是否全选:', event.data.isSelectAll);
        debugLog('表格 ID:', event.data.tableId);
        debugLog('时间:', new Date().toISOString());
        
        // 通知所有注册的回调
        onRecordSelectChangeCallbacks.forEach(cb => {
          try {
            cb(event);
          } catch (e) {
            console.error('[FeishuEnv] 选中变化回调执行失败:', e);
          }
        });
        
        debugLog('🎯 ======== 事件处理完成 ========');
      });
      
      debugLog('✅ 事件监听器设置成功');
      
      // 同时启动轮询作为备用方案
      debugLog('🔁 同时启动轮询作为备用方案');
      startPolling(3000);
      
    } else {
      debugLog('⚠️  不支持 onRecordSelectChange，仅使用轮询方案');
      debugLog('bitable.ui:', typeof (bitable as any).ui);
      debugLog('onRecordSelectChange:', typeof (bitable as any).ui?.onRecordSelectChange);
      
      // 启动轮询作为主要方案
      startPolling(2000);
    }
    
    debugLog('🔄 ======== 监听器设置流程完成 ========');
    
  } catch (error) {
    debugLog('❌ 设置选中监听器失败:', error);
    debugLog('错误堆栈:', error instanceof Error ? error.stack : error);
    
    // 出错时也尝试启动轮询
    debugLog('🔁 出错时尝试启动轮询作为备用方案');
    startPolling(2000);
  }
}

// ============================================
// 新增：选中变化监听（点击行）
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

// 新增：探索所有可用事件
function exploreAllEvents() {
  debugLog('======== 探索飞书 SDK 所有可用事件 ========');
  
  try {
    // 探索 bitable.base
    if (bitable.base) {
      debugLog('bitable.base 可用方法:', Object.keys(bitable.base));
      
      // 查找所有 on 开头的方法
      const allMethods = Object.keys(bitable.base);
      const eventMethods = allMethods.filter(key => key.startsWith('on'));
      debugLog('bitable.base 事件方法:', eventMethods);
    }
    
    // 探索 bitable
    if (bitable) {
      debugLog('bitable 可用方法:', Object.keys(bitable));
      
      const allMethods = Object.keys(bitable);
      const eventMethods = allMethods.filter(key => key.startsWith('on'));
      debugLog('bitable 事件方法:', eventMethods);
    }
  } catch (e) {
    debugLog('探索事件失败:', e);
  }
}

function setupSelectionListener() {
  if (selectionUnsubscribe) {
    debugLog('选中监听器已存在，跳过');
    return;
  }
  
  try {
    debugLog('======== 设置选中变化监听器 ========');
    
    // 先探索所有可用事件
    exploreAllEvents();
    
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
      
      // 立即设置两种监听器
      setupSelectionListener();      // 点击行选择
      setupRecordSelectListener();   // 复选框勾选
      
      // 初始化完成后进行一次完整的环境调试
      debugLog('初始化完成，执行环境调试...');
      await debugEnvironment();
      
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

// ============================================
// 新增：通过复选框勾选的记录 IDs 获取数据
// ============================================

export async function getRecordsByCheckboxIds(tableId: string, recordIds: string[]): Promise<BitableRecord[]> {
  debugLog('======== getRecordsByCheckboxIds() 开始 ========');
  debugLog('tableId:', tableId);
  debugLog('recordIds:', recordIds);
  
  if (envStatus !== 'ready') {
    debugLog('环境未就绪，返回空数组');
    return [];
  }

  if (!tableId || !Array.isArray(recordIds) || recordIds.length === 0) {
    debugLog('参数无效，返回空数组');
    return [];
  }

  try {
    debugLog('第一步：通过 tableId 获取表格...');
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
    
    debugLog('✅ 表格获取成功');
    
    // 第二步：获取字段元信息（只获取一次）
    debugLog('第二步：获取字段元信息...');
    let fieldMetaList: any[] = [];
    
    if (typeof table.getFieldMetaList === 'function') {
      fieldMetaList = await table.getFieldMetaList();
    } else if (typeof table.getFieldList === 'function') {
      fieldMetaList = await table.getFieldList();
    }
    
    // 第三步：批量获取记录
    debugLog('第三步：批量获取记录...');
    let recordsData: any[] = [];
    
    // 尝试使用 getRecordsByIds 批量获取
    if (typeof table.getRecordsByIds === 'function') {
      debugLog('使用 table.getRecordsByIds() 批量获取');
      try {
        recordsData = await table.getRecordsByIds(recordIds);
        debugLog(`✅ 批量获取到 ${recordsData.length} 条记录`);
      } catch (e) {
        debugLog('⚠️  getRecordsByIds 失败，回退到逐个获取:', e);
      }
    }
    
    // 如果批量获取失败或不可用，逐个获取
    if (recordsData.length === 0) {
      debugLog('逐个获取记录...');
      for (const recId of recordIds) {
        try {
          let recData: any = null;
          if (typeof table.getRecordById === 'function') {
            recData = await table.getRecordById(recId);
          } else {
            recData = await table.getRecord(recId);
          }
          
          if (recData) {
            recordsData.push(recData);
          }
        } catch (e) {
          debugLog(`获取记录 ${recId} 失败:`, e);
        }
      }
    }
    
    // 第四步：处理数据
    debugLog('第四步：处理数据...');
    const records: BitableRecord[] = [];
    
    for (const recData of recordsData) {
      const processedRecord = processRecordData(recData, fieldMetaList);
      records.push(processedRecord);
    }
    
    debugLog(`✅ 数据处理完成，共 ${records.length} 条记录`);
    debugLog('======== getRecordsByCheckboxIds() 结束 ========');
    
    return records;
  } catch (error) {
    debugLog('❌ getRecordsByCheckboxIds() 失败:', error);
    debugLog('错误堆栈:', error instanceof Error ? error.stack : error);
    debugLog('======== getRecordsByCheckboxIds() 结束 ========');
    return [];
  }
}

// ============================================
// 获取选中记录（点击行选择）
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
    
    // 至少需要 tableId
    if (!selection?.tableId) {
      debugLog('⚠️  没有 tableId，返回空数组');
      return [];
    }
    
    const { tableId, recordId } = selection;
    debugLog('✅ 获取到 tableId:', tableId);
    
    debugLog('第二步：通过 tableId 获取表格...');
    let table: any = null;
    
    if (typeof base.getTableById === 'function') {
      table = await base.getTableById(tableId);
    } else {
      table = await base.getTable(tableId);
    }
    
    if (!table) {
      debugLog('❌ 无法获取表格实例');
      return [];
    }
    
    debugLog('第三步：获取记录...');
    let targetRecordId: string | null = recordId;
    
    // 如果没有 recordId，获取第一条记录
    if (!targetRecordId) {
      debugLog('没有 recordId，获取第一条记录...');
      const recordIdList = await table.getRecordIdList();
      
      if (Array.isArray(recordIdList) && recordIdList.length > 0) {
        targetRecordId = recordIdList[0];
        debugLog('第一条记录 ID:', targetRecordId);
      } else {
        debugLog('⚠️  表格没有记录');
        return [];
      }
    }
    
    // 获取记录数据
    debugLog('获取记录数据，recordId:', targetRecordId);
    let recordData: any = null;
    
    if (typeof table.getRecordById === 'function') {
      recordData = await table.getRecordById(targetRecordId);
    } else {
      recordData = await table.getRecord(targetRecordId);
    }
    
    if (!recordData) {
      debugLog('❌ 无法获取记录数据');
      return [];
    }
    
    debugLog('第四步：获取字段元信息...');
    let fieldMetaList: any[] = [];
    
    if (typeof table.getFieldMetaList === 'function') {
      fieldMetaList = await table.getFieldMetaList();
    } else if (typeof table.getFieldList === 'function') {
      fieldMetaList = await table.getFieldList();
    }
    
    debugLog('第五步：处理数据...');
    const result = processRecordData(recordData, fieldMetaList);
    debugLog('✅ 数据处理完成');
    debugLog('======== getSelectedRecords() 结束 ========');
    
    return [result];
  } catch (error) {
    debugLog('❌ getSelectedRecords() 失败:', error);
    debugLog('错误堆栈:', error instanceof Error ? error.stack : error);
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
// 复选框选择管理器类 (CheckboxSelectionManager)
// ============================================

export class CheckboxSelectionManager {
  private selectedIds: string[] = [];
  private tableId: string | null = null;
  private unsubscribe: (() => void) | null = null;
  private onRecordsSelected: ((records: BitableRecord[]) => void) | null = null;

  constructor(onRecordsSelected?: (records: BitableRecord[]) => void) {
    this.onRecordsSelected = onRecordsSelected || null;
  }

  // 初始化
  async init(): Promise<CheckboxSelectionManager> {
    debugLog('🔄 初始化复选框选择管理器');

    if (envStatus !== 'ready') {
      debugLog('⚠️ 环境未就绪，等待环境就绪...');
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (envStatus === 'ready') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }

    // 获取初始选中状态
    await this.refreshSelection();

    // 设置监听器
    this.setupListener();

    debugLog('✅ 复选框选择管理器初始化完成');
    return this;
  }

  // 获取当前选中状态
  async refreshSelection(): Promise<void> {
    try {
      let recordIds: string[] = [];
      
      // ✅ 优先尝试使用 bitable.ui.getSelectRecordIds()
      if ((bitable as any).ui && typeof (bitable as any).ui.getSelectRecordIds === 'function') {
        try {
          recordIds = await (bitable as any).ui.getSelectRecordIds();
          debugLog('✅ 使用 bitable.ui.getSelectRecordIds() 获取:', recordIds);
        } catch (e) {
          debugLog('❌ bitable.ui.getSelectRecordIds() 调用失败:', e);
        }
      }
      
      // 获取选择状态（用于获取 tableId）
      const selection = await base.getSelection();
      this.tableId = selection?.tableId || null;
      
      // 如果上面的方法不可用或返回空，尝试使用 base.getSelection()
      if (recordIds.length === 0 && selection?.recordId) {
        recordIds = [selection.recordId];
        debugLog('⚠️ 使用 base.getSelection() 获取单条记录:', selection.recordId);
      }
      
      this.selectedIds = recordIds;

      debugLog('📊 当前选中状态:', {
        记录IDs: this.selectedIds,
        数量: this.selectedIds.length,
        表ID: this.tableId,
      });
    } catch (error) {
      debugLog('❌ 刷新选中状态失败:', error);
    }
  }

  // 设置监听器
  setupListener(): void {
    this.unsubscribe = onRecordSelectChange(async (event) => {
      const { data } = event;

      this.selectedIds = data.recordIds;
      this.tableId = data.tableId;

      debugLog('🎯 复选框选择变化:', {
        操作: data.isSelectAll ? '全选' : '手动选择',
        数量: data.recordIds.length,
      });

      if (data.recordIds.length > 0) {
        await this.loadSelectedData();
      } else {
        debugLog('📭 选择已清空');
        this.onRecordsSelected?.([]);
      }
    });

    debugLog('✅ 复选框监听器设置成功');
  }

  // 加载选中数据
  async loadSelectedData(): Promise<BitableRecord[]> {
    try {
      if (!this.tableId || this.selectedIds.length === 0) {
        debugLog('⚠️ 没有可加载的数据');
        return [];
      }

      const records = await getRecordsByCheckboxIds(this.tableId, this.selectedIds);

      debugLog(`✅ 数据加载成功: ${records.length} 条记录`);

      // 调用回调
      this.onRecordsSelected?.(records);

      return records;
    } catch (error) {
      debugLog('❌ 加载选中数据失败:', error);
      return [];
    }
  }

  // 获取当前选中IDs
  getSelectedIds(): string[] {
    return [...this.selectedIds];
  }

  // 获取当前选中数量
  getSelectedCount(): number {
    return this.selectedIds.length;
  }

  // 销毁
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    stopPolling();
    debugLog('🛑 复选框选择管理器已销毁');
  }
}

// ============================================
// 便捷函数：快速获取复选框选中记录
// ============================================

export async function getCheckboxSelectedRecords(): Promise<BitableRecord[]> {
  debugLog('📋 快速获取复选框选中记录');

  try {
    let selectedRecordIds: string[] = [];
    let tableId = '';

    // ✅ 优先尝试使用 bitable.ui.getSelectRecordIds()
    if ((bitable as any).ui && typeof (bitable as any).ui.getSelectRecordIds === 'function') {
      try {
        selectedRecordIds = await (bitable as any).ui.getSelectRecordIds();
        debugLog('✅ 使用 bitable.ui.getSelectRecordIds() 获取:', selectedRecordIds);
      } catch (e) {
        debugLog('❌ bitable.ui.getSelectRecordIds() 调用失败:', e);
      }
    }

    // 获取 tableId
    const selection = await base.getSelection();
    tableId = selection?.tableId || '';

    // 如果上面的方法不可用或返回空，尝试使用 base.getSelection()
    if (selectedRecordIds.length === 0 && selection?.recordId) {
      selectedRecordIds = [selection.recordId];
      debugLog('⚠️ 使用 base.getSelection() 获取单条记录:', selection.recordId);
    }

    if (selectedRecordIds.length === 0 || !tableId) {
      debugLog('⚠️ 没有选中的记录');
      return [];
    }

    debugLog('选中记录数量:', selectedRecordIds.length);

    // 获取选中记录的数据
    const records = await getRecordsByCheckboxIds(tableId, selectedRecordIds);

    debugLog(`✅ 获取到选中记录数据: ${records.length} 条`);
    return records;
  } catch (error) {
    debugLog('❌ 获取复选框选中数据失败:', error);
    return [];
  }
}

// ============================================
// 导出统一的 SDK 对象
// ============================================

export const feishuEnv = {
  // 基础状态
  getEnvStatus,
  getEnvError,
  isFeishuEnvironment,
  
  // 回调管理
  onFeishuReady,
  offFeishuReady,
  onNotFeishu,
  offNotFeishu,
  
  // 初始化
  init: initFeishuEnv,
  
  // 数据获取
  fetchFields,
  fetchRecords,
  fetchTableName,
  fetchAppMetadata,
  fetchFirstRecord,
  initFeishuContext,
  getDebugInfo,
  
  // 选中变化（点击行 - 用于编辑器）
  onSelectionChange,
  getSelectedRecords,
  
  // 复选框勾选（用于打印预览）
  onRecordSelectChange,
  getRecordsByCheckboxIds,
  getCheckboxSelectedRecords,
  
  // 管理器类
  CheckboxSelectionManager,
  
  // 轮询控制
  startPolling,
  stopPolling,
};

export default feishuEnv;
