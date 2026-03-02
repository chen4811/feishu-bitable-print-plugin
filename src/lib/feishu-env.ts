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


// ============================================
// 新增：调试和环境检查
// ============================================

async function debugEnvironment() {
  // 简化日志输出，只在初始化时输出一次关键信息
  try {
    const hasUiApi = !!(bitable as any).ui;
    const hasGetSelectRecordIds = hasUiApi && typeof (bitable as any).ui?.getSelectRecordIds === 'function';
    
    debugLog('SDK 检查:', {
      hasUiApi,
      hasGetSelectRecordIds,
      hasGetSelection: typeof base.getSelection === 'function',
    });
  } catch (error) {
    // 静默处理错误
  }
}

function checkEnvironment() {
  // 简化环境检查，只输出关键信息
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isFeishuEnv = typeof navigator !== 'undefined' && /lark|feishu/i.test(navigator.userAgent);
  
  debugLog('环境检查:', { inIframe, isFeishuEnv });
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
      
      // 优先尝试使用 bitable.ui.getSelectRecordIds()
      if ((bitable as any).ui && typeof (bitable as any).ui.getSelectRecordIds === 'function') {
        try {
          currentSelection = await (bitable as any).ui.getSelectRecordIds();
        } catch (e) {
          // 静默处理，避免频繁日志
        }
      }
      
      // 如果上面的方法不可用或返回空，尝试使用 base.getSelection()
      if (currentSelection.length === 0) {
        const selection = await base.getSelection();
        if (selection?.recordId) {
          currentSelection = [selection.recordId];
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
        
        lastPolledSelection = currentSelection;
      }
      
    } catch (error) {
      // 静默处理轮询错误，避免频繁日志输出
      // debugLog('轮询检查失败:', error instanceof Error ? error.message : error);
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
        debugLog('📍 初始化中调用 base.getSelection()...');
        const selection = await base.getSelection();
        
        // 🔍 输出完整的返回对象
        debugLog('📍 base.getSelection() 完整返回:');
        debugLog('  - baseId:', selection?.baseId);
        debugLog('  - tableId:', selection?.tableId);
        debugLog('  - viewId:', selection?.viewId);
        debugLog('  - recordId:', selection?.recordId);
        debugLog('  - fieldId:', selection?.fieldId);
        debugLog('📍 原始对象:', JSON.stringify(selection, null, 2));
        
        return selection;
      };

      await Promise.race([initSdk(), timeoutPromise]);

      envStatus = 'ready';
      debugLog('✅ SDK 初始化成功，飞书环境已就绪');
      
      // 设置选中变化监听器
      setupSelectionListener();
      
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
    debugLog('第一步：调用 base.getSelection() 获取选中信息...');
    const selection = await base.getSelection();
    
    // 🔍 输出完整的返回对象
    debugLog('📍 base.getSelection() 完整返回:');
    debugLog('  - baseId:', selection?.baseId);
    debugLog('  - tableId:', selection?.tableId);
    debugLog('  - viewId:', selection?.viewId);
    debugLog('  - recordId:', selection?.recordId);
    debugLog('  - fieldId:', selection?.fieldId);
    debugLog('📍 原始对象:', JSON.stringify(selection, null, 2));
    
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
    
    try {
      if (typeof table.getFieldMetaList === 'function') {
        fieldMetaList = await table.getFieldMetaList();
        debugLog('通过 getFieldMetaList 获取到字段数:', fieldMetaList.length);
      } else if (typeof table.getFieldList === 'function') {
        fieldMetaList = await table.getFieldList();
        debugLog('通过 getFieldList 获取到字段数:', fieldMetaList.length);
      }
      
      // 打印每个字段的详细信息以便调试
      debugLog('字段元信息详情:');
      fieldMetaList.forEach((field, index) => {
        debugLog(`  [${index}] ID: ${field.id}, Name: ${field.name}, Type: ${field.type}, Typeof: ${typeof field.type}`);
      });
    } catch (e) {
      debugLog('获取字段元信息失败:', e);
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

// 字段类型常量（根据飞书开放平台文档）
const FIELD_TYPES = {
  TEXT: 1,           // 文本
  NUMBER: 2,         // 数字
  SINGLE_SELECT: 3,   // 单选
  MULTI_SELECT: 4,    // 多选
  DATETIME: 5,       // 日期
  CHECKBOX: 7,       // 复选框
  USER: 11,          // 人员
  PHONE: 13,         // 电话号码
  URL: 15,           // 超链接
  ATTACHMENT: 17,     // 附件
  SINGLE_LINK: 18,    // 单向关联
  FORMULA: 20,       // 公式
  DUPLEX_LINK: 21,    // 双向关联
  LOCATION: 22,      // 地理位置
  GROUP_CHAT: 23,     // 群组
  CREATED_TIME: 1001, // 创建时间
  MODIFIED_TIME: 1002, // 最后更新时间
  CREATED_USER: 1003, // 创建人
  MODIFIED_USER: 1004, // 修改人
  AUTO_NUMBER: 1005   // 自动编号
};

function processRecordData(recordData: any, fieldMetaList: any[]): BitableRecord {
  debugLog('processRecordData 被调用');
  debugLog('fieldMetaList:', JSON.stringify(fieldMetaList.map(f => ({ id: f.id, name: f.name, type: f.type, typeOf: typeof f.type }))));
  
  const { fields } = recordData;
  
  // 创建字段名称映射和字段类型映射
  const fieldMap: Record<string, string> = {};
  const fieldTypeMap: Record<string, number> = {};
  fieldMetaList.forEach(field => {
    fieldMap[field.id] = field.name;
    // 确保类型是数字
    fieldTypeMap[field.id] = typeof field.type === 'string' ? parseInt(field.type, 10) : field.type;
  });
  
  debugLog('fieldTypeMap:', JSON.stringify(fieldTypeMap));
  
  const formattedData: Record<string, unknown> = {};
  
  Object.keys(fields).forEach(fieldId => {
    const fieldName = fieldMap[fieldId] || fieldId;
    const fieldValue = fields[fieldId];
    const fieldType = fieldTypeMap[fieldId];
    debugLog(`处理字段 ${fieldName} (ID: ${fieldId}), 类型: ${fieldType}, 原始值:`, JSON.stringify(fieldValue));
    formattedData[fieldName] = formatFieldValue(fieldValue, fieldType);
    debugLog(`  -> 格式化后:`, formattedData[fieldName]);
  });
  
  debugLog('processRecordData 处理完成:', formattedData);
  
  return {
    id: recordData.id || recordData.recordId || '',
    fields: formattedData,
    createdTime: recordData.createdTime || new Date().toISOString(),
    lastModifiedTime: recordData.modifiedTime || new Date().toISOString(),
  };
}

/**
 * 根据字段类型格式化字段值
 * @param fieldValue - 字段值
 * @param fieldType - 字段类型
 * @returns 格式化后的值
 */
function formatFieldValue(fieldValue: any, fieldType?: number): any {
  debugLog(`formatFieldValue 被调用, fieldType=${fieldType}, typeof=${typeof fieldType}`);
  
  if (!fieldValue) {
    debugLog('  fieldValue 为空，返回默认值');
    return getDefaultValue(fieldType);
  }
  
  if (!Array.isArray(fieldValue)) {
    debugLog(`  fieldValue 不是数组，直接转字符串: ${String(fieldValue)}`);
    return String(fieldValue);
  }
  
  if (fieldValue.length === 0) {
    debugLog('  fieldValue 为空数组，返回默认值');
    return getDefaultValue(fieldType);
  }
  
  // 确保 fieldType 是数字
  const numericFieldType = typeof fieldType === 'string' ? parseInt(fieldType, 10) : fieldType;
  debugLog(`  数值化后的 fieldType: ${numericFieldType}`);
  
  try {
    switch (numericFieldType) {
      case FIELD_TYPES.TEXT: // 文本 = 1
        debugLog('  匹配到 TEXT 类型');
        return formatTextValue(fieldValue);
      case FIELD_TYPES.NUMBER: // 数字 = 2
        debugLog('  匹配到 NUMBER 类型');
        return formatNumberValue(fieldValue);
      case FIELD_TYPES.SINGLE_SELECT: // 单选 = 3
        debugLog('  匹配到 SINGLE_SELECT 类型，调用 formatSingleSelectValue');
        return formatSingleSelectValue(fieldValue);
      case FIELD_TYPES.MULTI_SELECT: // 多选 = 4
        debugLog('  匹配到 MULTI_SELECT 类型');
        return formatMultiSelectValue(fieldValue);
      case FIELD_TYPES.DATETIME: // 日期 = 5
      case FIELD_TYPES.CREATED_TIME: // 创建时间 = 1001
      case FIELD_TYPES.MODIFIED_TIME: // 修改时间 = 1002
        debugLog('  匹配到 DATETIME 类型');
        return formatDateTimeValue(fieldValue);
      case FIELD_TYPES.CHECKBOX: // 复选框 = 7
        debugLog('  匹配到 CHECKBOX 类型');
        return formatCheckboxValue(fieldValue);
      case FIELD_TYPES.USER: // 人员 = 11
      case FIELD_TYPES.CREATED_USER: // 创建人 = 1003
      case FIELD_TYPES.MODIFIED_USER: // 修改人 = 1004
        debugLog('  匹配到 USER 类型');
        return formatUserValue(fieldValue);
      case FIELD_TYPES.PHONE: // 电话 = 13
        debugLog('  匹配到 PHONE 类型');
        return formatTextValue(fieldValue);
      case FIELD_TYPES.URL: // 超链接 = 15
        debugLog('  匹配到 URL 类型');
        return formatUrlValue(fieldValue);
      case FIELD_TYPES.ATTACHMENT: // 附件 = 17
        debugLog('  匹配到 ATTACHMENT 类型');
        return formatAttachmentValue(fieldValue);
      case FIELD_TYPES.SINGLE_LINK: // 单向关联 = 18
      case FIELD_TYPES.DUPLEX_LINK: // 双向关联 = 21
        debugLog('  匹配到 LINK 类型');
        return formatLinkValue(fieldValue);
      case FIELD_TYPES.FORMULA: // 公式 = 20
        debugLog('  匹配到 FORMULA 类型');
        return formatFormulaValue(fieldValue);
      case FIELD_TYPES.LOCATION: // 地理位置 = 22
        debugLog('  匹配到 LOCATION 类型');
        return formatLocationValue(fieldValue);
      case FIELD_TYPES.GROUP_CHAT: // 群组 = 23
        debugLog('  匹配到 GROUP_CHAT 类型');
        return formatGroupChatValue(fieldValue);
      case FIELD_TYPES.AUTO_NUMBER: // 自动编号 = 1005
        debugLog('  匹配到 AUTO_NUMBER 类型');
        return formatTextValue(fieldValue);
      default:
        // 未知类型，尝试智能推断
        debugLog(`  未知类型 ${numericFieldType}，尝试智能推断...`);
        return inferAndFormatValue(fieldValue);
    }
  } catch (error) {
    console.error('[FeishuEnv] 字段值格式化错误:', error, numericFieldType, fieldValue);
    return fieldValue;
  }
}

// 文本类型处理（1, 13, 1005）
function formatTextValue(fieldValue: any[]): string {
  return fieldValue[0]?.text || '';
}

// 数字类型处理（2）
function formatNumberValue(fieldValue: any[]): number {
  const value = fieldValue[0]?.text;
  return value ? parseFloat(value) : 0;
}

// 单选类型处理（3）
function formatSingleSelectValue(fieldValue: any[]): string {
  debugLog('formatSingleSelectValue 被调用，原始值:', JSON.stringify(fieldValue));
  
  if (!fieldValue || !Array.isArray(fieldValue) || fieldValue.length === 0) {
    debugLog('  空值，返回空字符串');
    return '';
  }
  
  // 单选字段的值是数组，第一个元素包含选项信息
  const selectedOption = fieldValue[0];
  debugLog('  第一个选项:', JSON.stringify(selectedOption));
  
  if (selectedOption && typeof selectedOption === 'object') {
    if (selectedOption.text) {
      debugLog(`  返回 text: ${selectedOption.text}`);
      return String(selectedOption.text);
    }
    if (selectedOption.name) {
      debugLog(`  返回 name: ${selectedOption.name}`);
      return String(selectedOption.name);
    }
    // 如果对象有 id 但没有 text/name，尝试其他常见属性
    const possibleKeys = ['label', 'title', 'value', 'display', 'content'];
    for (const key of possibleKeys) {
      if (selectedOption[key]) {
        debugLog(`  返回 ${key}: ${selectedOption[key]}`);
        return String(selectedOption[key]);
      }
    }
  }
  
  // 如果直接是字符串或数字
  if (typeof selectedOption === 'string' || typeof selectedOption === 'number') {
    debugLog(`  返回原始值: ${selectedOption}`);
    return String(selectedOption);
  }
  
  debugLog('  无法识别的格式，返回 JSON:', JSON.stringify(fieldValue));
  return JSON.stringify(fieldValue);
}

// 多选类型处理（4）
function formatMultiSelectValue(fieldValue: any[]): string {
  return fieldValue
    .map(item => item.text || item.name || '')
    .filter(text => text)
    .join(', ');
}

// 日期时间类型处理（5, 1001, 1002）
function formatDateTimeValue(fieldValue: any[]): string {
  if (typeof fieldValue[0] === 'number') {
    // 时间戳格式
    return new Date(fieldValue[0]).toLocaleString();
  }
  if (fieldValue[0]?.text) {
    // 文本格式
    return fieldValue[0].text;
  }
  return '';
}

// 复选框类型处理（7）
function formatCheckboxValue(fieldValue: any[]): boolean {
  return fieldValue[0] === true || fieldValue[0]?.text === 'true';
}

// 人员类型处理（11, 1003, 1004）
function formatUserValue(fieldValue: any[]): string {
  return fieldValue
    .map(user => user.name || user.id || '')
    .filter(name => name)
    .join(', ');
}

// 超链接类型处理（15）
function formatUrlValue(fieldValue: any[]): string | { text: string; url: string } {
  if (fieldValue[0]?.link && fieldValue[0]?.text) {
    return {
      text: fieldValue[0].text,
      url: fieldValue[0].link
    };
  }
  return fieldValue[0]?.text || '';
}

// 附件类型处理（17）
function formatAttachmentValue(fieldValue: any[]): any[] {
  return fieldValue.map(file => ({
    name: file.name,
    url: file.url,
    token: file.file_token,
    size: file.size,
    type: file.type
  }));
}

// 关联字段处理（18, 21）
function formatLinkValue(fieldValue: any[]): string[] {
  if (fieldValue[0]?.link_record_ids) {
    return fieldValue[0].link_record_ids;
  }
  return fieldValue.map(item => item.text || item.id || '').filter(Boolean);
}

// 公式字段处理（20）
function formatFormulaValue(fieldValue: any[]): string {
  if (fieldValue[0]?.value) {
    // 公式字段的特殊结构
    return Array.isArray(fieldValue[0].value) ? 
      fieldValue[0].value[0]?.text : 
      fieldValue[0].value;
  }
  return fieldValue[0]?.text || '';
}

// 地理位置处理（22）
function formatLocationValue(fieldValue: any[]): string | { address: string; location: any; name: string } {
  if (fieldValue[0]?.location) {
    return {
      address: fieldValue[0].address,
      location: fieldValue[0].location,
      name: fieldValue[0].name
    };
  }
  return fieldValue[0]?.text || '';
}

// 群组处理（23）
function formatGroupChatValue(fieldValue: any[]): string {
  return fieldValue
    .map(group => group.name || group.id || '')
    .filter(name => name)
    .join(', ');
}

// 未知类型处理
function formatUnknownValue(fieldValue: any[]): any {
  debugLog('formatUnknownValue 被调用，原始值:', JSON.stringify(fieldValue));
  
  // 尝试通用的文本提取
  if (fieldValue[0] && typeof fieldValue[0] === 'object') {
    if (fieldValue[0].text) {
      const result = fieldValue.map(item => item.text || '').filter(Boolean).join(', ');
      debugLog('  提取 text 属性:', result);
      return result;
    }
    if (fieldValue[0].name) {
      const result = fieldValue.map(item => item.name || '').filter(Boolean).join(', ');
      debugLog('  提取 name 属性:', result);
      return result;
    }
    // 尝试其他常见属性
    const possibleKeys = ['label', 'title', 'value', 'display', 'content'];
    for (const key of possibleKeys) {
      if (fieldValue[0][key]) {
        const result = fieldValue.map(item => item[key] || '').filter(Boolean).join(', ');
        debugLog(`  提取 ${key} 属性:`, result);
        return result;
      }
    }
  }
  
  // 如果是基本类型
  if (typeof fieldValue[0] === 'string' || typeof fieldValue[0] === 'number') {
    const result = fieldValue.map(item => String(item)).join(', ');
    debugLog('  基本类型转字符串:', result);
    return result;
  }
  
  try {
    const jsonResult = JSON.stringify(fieldValue);
    debugLog('  无法识别，返回 JSON:', jsonResult);
    return jsonResult;
  } catch {
    debugLog('  JSON 序列化失败，返回错误提示');
    return '无法解析的值';
  }
}

// 获取字段类型的默认值
function getDefaultValue(fieldType?: number): any {
  switch (fieldType) {
    case FIELD_TYPES.NUMBER:
      return 0;
    case FIELD_TYPES.CHECKBOX:
      return false;
    case FIELD_TYPES.ATTACHMENT:
      return [];
    default:
      return '';
  }
}

/**
 * 智能推断字段类型并格式化
 * 当字段类型未知时，根据值结构自动推断
 */
function inferAndFormatValue(fieldValue: any[]): any {
  debugLog('inferAndFormatValue 被调用，原始值:', JSON.stringify(fieldValue));
  
  if (!fieldValue || !Array.isArray(fieldValue) || fieldValue.length === 0) {
    return '';
  }
  
  const firstItem = fieldValue[0];
  
  // 如果是基本类型（字符串、数字）
  if (typeof firstItem === 'string') {
    debugLog('  推断为基本字符串类型');
    return firstItem;
  }
  if (typeof firstItem === 'number') {
    debugLog('  推断为基本数字类型');
    return firstItem;
  }
  if (typeof firstItem === 'boolean') {
    debugLog('  推断为基本布尔类型');
    return firstItem;
  }
  
  // 如果是对象
  if (typeof firstItem === 'object' && firstItem !== null) {
    // 检查是否包含 text 属性（文本、单选、多选常见结构）
    if (firstItem.text !== undefined) {
      debugLog('  推断为含 text 属性的对象');
      if (fieldValue.length === 1) {
        // 单值情况
        return firstItem.text;
      } else {
        // 多值情况（多选）
        return fieldValue.map(item => item.text || '').filter(Boolean).join(', ');
      }
    }
    
    // 检查是否包含 name 属性（人员、群组常见结构）
    if (firstItem.name !== undefined) {
      debugLog('  推断为含 name 属性的对象');
      return fieldValue.map(item => item.name || '').filter(Boolean).join(', ');
    }
    
    // 检查是否包含 id 和 text 的单选结构
    if (firstItem.id !== undefined && (firstItem.text !== undefined || firstItem.name !== undefined)) {
      debugLog('  推断为 ID+Text 结构');
      return firstItem.text || firstItem.name || String(firstItem.id);
    }
    
    // 检查是否有 value 属性（公式字段）
    if (firstItem.value !== undefined) {
      debugLog('  推断为公式字段结构');
      return formatFormulaValue(fieldValue);
    }
    
    // 检查是否有 link 属性（超链接）
    if (firstItem.link !== undefined) {
      debugLog('  推断为超链接结构');
      return formatUrlValue(fieldValue);
    }
    
    // 检查是否有 location 属性（地理位置）
    if (firstItem.location !== undefined) {
      debugLog('  推断为地理位置结构');
      return formatLocationValue(fieldValue);
    }
    
    // 检查是否有 file_token 或 url 属性（附件）
    if (firstItem.file_token !== undefined || firstItem.url !== undefined) {
      debugLog('  推断为附件结构');
      return formatAttachmentValue(fieldValue);
    }
    
    // 检查是否有 link_record_ids 属性（关联字段）
    if (firstItem.link_record_ids !== undefined) {
      debugLog('  推断为关联字段结构');
      return formatLinkValue(fieldValue);
    }
    
    // 尝试常见的属性名
    const possibleKeys = ['label', 'title', 'display', 'content', 'value'];
    for (const key of possibleKeys) {
      if (firstItem[key] !== undefined) {
        debugLog(`  推断为含 ${key} 属性的对象`);
        return fieldValue.map(item => item[key] || '').filter(Boolean).join(', ');
      }
    }
  }
  
  // 无法识别，返回 JSON 字符串
  debugLog('  无法推断，返回 JSON');
  return formatUnknownValue(fieldValue);
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
// 便捷函数：获取选中记录（带降级方案）
// ============================================

export async function getCheckboxSelectedRecords(): Promise<BitableRecord[]> {
  debugLog('======== getCheckboxSelectedRecords() 开始 ========');
  debugLog('📋 尝试获取选中记录...');

  try {
    // 1. 获取当前激活的表格 ID
    debugLog('📍 调用 base.getSelection() 获取 tableId...');
    const selection = await base.getSelection();
    
    debugLog('📍 base.getSelection() 返回:');
    debugLog('  - baseId:', selection?.baseId);
    debugLog('  - tableId:', selection?.tableId);
    debugLog('  - viewId:', selection?.viewId);
    debugLog('  - recordId:', selection?.recordId);
    debugLog('  - fieldId:', selection?.fieldId);

    if (!selection?.tableId) {
      debugLog('❌ 无法获取 tableId');
      debugLog('======== getCheckboxSelectedRecords() 结束 ========');
      return [];
    }

    const tableId = selection.tableId;
    debugLog(`✅ 获取到 tableId: ${tableId}`);

    // 2. 获取表格实例
    debugLog('📍 获取表格实例...');
    const table = await base.getTable(tableId);
    debugLog('✅ 表格实例已获取');

    // 3. 尝试使用 table.getSelectedRecordIds() 获取选中的行
    debugLog('📍 尝试调用 table.getSelectedRecordIds()...');
    
    let selectedRecordIds: string[] = [];
    
    if (typeof (table as any).getSelectedRecordIds === 'function') {
      try {
        selectedRecordIds = await (table as any).getSelectedRecordIds();
        debugLog(`✅ table.getSelectedRecordIds() 返回 ${selectedRecordIds.length} 个 ID`);
        debugLog('🆔 选中的 Record IDs:', selectedRecordIds);
      } catch (e) {
        debugLog('❌ table.getSelectedRecordIds() 调用失败:', e);
      }
    } else {
      debugLog('⚠️ table.getSelectedRecordIds() 方法不存在');
    }

    // 4. 如果没有选中行，降级到获取第一条记录
    if (selectedRecordIds.length === 0) {
      debugLog('ℹ️ 没有选中行，降级到获取第一条记录...');
      debugLog('💡 提示：飞书 SDK 限制，插件环境下无法获取勾选行');
      
      // 获取第一条记录
      const recordIdList = await table.getRecordIdList();
      if (Array.isArray(recordIdList) && recordIdList.length > 0) {
        const firstRecordId = recordIdList[0];
        debugLog(`📍 获取第一条记录: ${firstRecordId}`);
        selectedRecordIds = [firstRecordId];
      } else {
        debugLog('❌ 表格为空，没有记录');
        debugLog('======== getCheckboxSelectedRecords() 结束 ========');
        return [];
      }
    }

    // 5. 批量获取记录数据
    debugLog('📍 批量获取记录数据...');
    const records = await getRecordsByCheckboxIds(tableId, selectedRecordIds);

    debugLog(`✅ 获取到记录数据: ${records.length} 条`);
    debugLog('======== getCheckboxSelectedRecords() 结束 ========');
    
    return records;
  } catch (error) {
    debugLog('❌ 获取选中记录失败:', error);
    debugLog('======== getCheckboxSelectedRecords() 结束 ========');
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
  
  // 选中变化（基于 base.getSelection）
  onSelectionChange,
  getSelectedRecords,
  getCheckboxSelectedRecords,
};

export default feishuEnv;
