/**
 * 飞书服务 - 统一数据获取层
 * 
 * 根据环境自动选择：
 * 1. 飞书侧边栏环境：使用 JS-SDK (feishu-env.ts)
 * 2. 独立访问环境：使用后端 API (feishu-client.ts)
 * 
 * 核心功能：
 * - 复选框选中记录读取
 * - 字段列表获取
 * - 记录数据获取
 * 
 * 字段预读取场景限制：
 * 1. 创建模板时读取
 * 2. 进入模板编辑时读取
 * 3. 进入排版打印预览时读取
 * 4. 切换多维表格时读取
 */

import type { Field } from '@/types/editor';

// 字段类型映射
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text', 2: 'number', 3: 'singleSelect', 4: 'multiSelect',
  5: 'date', 6: 'checkbox', 7: 'user', 8: 'url',
  9: 'phone', 10: 'email', 11: 'user', 12: 'formula',
  13: 'progress', 14: 'currency', 15: 'rating', 16: 'location',
  17: 'attachment', 18: 'group', 19: 'barcode',
  20: 'modifiedTime', 21: 'createdTime', 22: 'modifiedUser', 23: 'createdUser', 24: 'autoNumber',
};

// 环境类型
type Environment = 'sdk' | 'api' | 'unknown';

// ============================================
// 字段缓存机制
// ============================================

/** 字段获取场景 */
export type FieldFetchScene = 
  | 'create_template'    // 创建模板时
  | 'edit_template'      // 进入模板编辑时
  | 'print_preview'      // 进入排版打印预览时
  | 'table_switch'       // 切换多维表格时
  | 'manual_refresh';    // 手动刷新

/** 字段缓存项 */
interface FieldCache {
  fields: Field[];
  tableId: string;
  timestamp: number;
}

// 字段缓存（按 tableId 缓存）
const fieldCacheMap = new Map<string, FieldCache>();

// 缓存有效期（5分钟）
const FIELD_CACHE_DURATION = 5 * 60 * 1000;

/**
 * 获取缓存的字段
 */
function getCachedFields(targetTableId: string): Field[] | null {
  const cache = fieldCacheMap.get(targetTableId);
  if (!cache) return null;
  
  const now = Date.now();
  if (now - cache.timestamp > FIELD_CACHE_DURATION) {
    fieldCacheMap.delete(targetTableId);
    return null;
  }
  
  console.log('[FeishuService] 使用缓存字段, tableId:', targetTableId, '数量:', cache.fields.length);
  return cache.fields;
}

/**
 * 设置字段缓存
 */
function setFieldCache(targetTableId: string, fields: Field[]): void {
  fieldCacheMap.set(targetTableId, {
    fields,
    tableId: targetTableId,
    timestamp: Date.now(),
  });
  console.log('[FeishuService] 缓存字段, tableId:', targetTableId, '数量:', fields.length);
}

/**
 * 清除字段缓存
 */
export function clearFieldCache(targetTableId?: string): void {
  if (targetTableId) {
    fieldCacheMap.delete(targetTableId);
    console.log('[FeishuService] 清除字段缓存, tableId:', targetTableId);
  } else {
    fieldCacheMap.clear();
    console.log('[FeishuService] 清除所有字段缓存');
  }
}

/**
 * 判断是否应该使用缓存
 * 
 * 规则：
 * - create_template: 使用缓存（如果存在）
 * - edit_template: 强制刷新（确保数据最新）
 * - print_preview: 强制刷新（确保预览准确）
 * - table_switch: 强制刷新（新表格数据）
 * - manual_refresh: 强制刷新（用户主动操作）
 */
function shouldUseCache(scene: FieldFetchScene): boolean {
  return scene === 'create_template';
}

// ============================================
// 全局状态
// ============================================

let currentEnv: Environment = 'unknown';
let appToken: string | null = null;
let tableId: string | null = null;

// ============================================
// 复选框选中相关类型
// ============================================

export interface CheckboxSelectionEvent {
  tableId: string;
  recordIds: string[];
  count: number;
}

export type CheckboxSelectionCallback = (event: CheckboxSelectionEvent) => void;
export type RecordsCallback = (records: Record<string, unknown>[]) => void;

/**
 * 检测当前环境
 * 
 * 🔥 架构决策：统一使用后端 API 模式
 * - 飞书侧边栏：用 JS-SDK 仅获取 appToken/tableId，然后切换到 API 模式
 * - 独立访问：直接使用 API 模式（需提供凭证）
 */
export function detectEnvironment(): Environment {
  // 🔥 如果已经确定环境，直接返回
  if (currentEnv !== 'unknown') {
    return currentEnv;
  }
  
  // 检查是否有配置的 appToken 和 tableId（优先）
  if (appToken && tableId) {
    currentEnv = 'api';
    return 'api';
  }
  
  // 检查是否在 iframe 中（飞书侧边栏环境）
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  if (inIframe) {
    console.log('[FeishuService] 在 iframe 中，需要调用 initEnvironment() 获取凭证');
  }
  
  return currentEnv;
}

/**
 * 设置 API 模式的凭证
 */
export function setApiCredentials(token: string, table: string) {
  appToken = token;
  tableId = table;
  currentEnv = 'api';
}

/**
 * 获取当前环境
 */
export function getCurrentEnvironment(): Environment {
  return currentEnv;
}

/**
 * 获取字段列表
 * 
 * 场景限制：
 * 1. create_template - 创建模板时（可使用缓存）
 * 2. edit_template - 进入模板编辑时（强制刷新）
 * 3. print_preview - 进入排版打印预览时（强制刷新）
 * 4. table_switch - 切换多维表格时（强制刷新）
 * 5. manual_refresh - 手动刷新（强制刷新）
 */
export async function fetchFields(options?: {
  scene?: FieldFetchScene;
  forceRefresh?: boolean;
}): Promise<Field[]> {
  const { scene = 'edit_template', forceRefresh = false } = options || {};
  const env = detectEnvironment();
  const targetTableId = tableId;
  
  console.log('[FeishuService] 获取字段列表, 环境:', env, '场景:', scene, '强制刷新:', forceRefresh);
  
  // 🔥 只支持 API 模式
  if (env !== 'api' || !appToken || !targetTableId) {
    console.error('[FeishuService] 未初始化 API 凭证，无法获取字段');
    return [];
  }
  
  // 检查是否使用缓存
  if (!forceRefresh && shouldUseCache(scene) && targetTableId) {
    const cachedFields = getCachedFields(targetTableId);
    if (cachedFields) {
      return cachedFields;
    }
  }
  
  // 使用后端 API
  try {
    const params = new URLSearchParams({
      appToken: appToken!,
      tableId: tableId!,
    });
    
    const response = await fetch(`/api/feishu/fields/?${params}`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    const fields: Field[] = result.fields.map((field: any) => ({
      id: field.id,
      name: field.name,
      type: String(field.type),
      placeholder: `[${field.name}]`,
      isSystem: false,
      fieldKind: field.fieldKind || getFieldKind(field.type),
    }));
    
    // 缓存字段
    if (targetTableId && fields.length > 0) {
      setFieldCache(targetTableId, fields);
    }
    
    return fields;
  } catch (error) {
    console.error('[FeishuService] API 获取字段失败:', error);
    return [];
  }
}

/**
 * 获取记录列表
 * 🔥 统一使用后端 API 模式
 */
export async function fetchRecords(options?: {
  recordIds?: string[];
  processFields?: boolean;
}): Promise<Record<string, unknown>[]> {
  const env = detectEnvironment();
  
  console.log('[FeishuService] 获取记录, 环境:', env);
  
  // 🔥 只支持 API 模式
  if (env !== 'api' || !appToken || !tableId) {
    console.error('[FeishuService] 未初始化 API 凭证，无法获取记录');
    return [];
  }
  
  // 使用后端 API
  try {
    const response = await fetch('/api/feishu/records/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appToken,
        tableId,
        recordIds: options?.recordIds,
        processFields: options?.processFields ?? true,
      }),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.records.map((r: any) => ({
      id: r.id,
      ...r.fields,
    }));
  } catch (error) {
    console.error('[FeishuService] API 获取记录失败:', error);
    return [];
  }
}

/**
 * 初始化环境
 */
export async function initEnvironment(config?: {
  appToken?: string;
  tableId?: string;
}): Promise<{ success: boolean; tableName?: string; tableId?: string; appToken?: string }> {
  console.log('[FeishuService] initEnvironment 被调用, config:', config);
  
  // 如果提供了凭证，设置 API 模式
  if (config?.appToken && config?.tableId) {
    setApiCredentials(config.appToken, config.tableId);
    
    // 验证凭证并获取表格信息
    try {
      const response = await fetch('/api/feishu/init/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appToken: config.appToken,
          tableId: config.tableId,
        }),
      });
      
      const result = await response.json();
      return {
        success: result.success,
        tableName: result.tableName,
        tableId: config.tableId,
        appToken: config.appToken,
      };
    } catch (error) {
      console.error('[FeishuService] 初始化失败:', error);
      return { success: false };
    }
  }
  
  // 检查是否在飞书侧边栏 iframe 中
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  if (inIframe) {
    // 🔥 使用 JS-SDK 仅获取 appToken 和 tableId，然后切换到 API 模式
    try {
      console.log('[FeishuService] 在飞书侧边栏中，使用 SDK 获取凭证...');
      
      // 动态导入 SDK（仅在需要时加载）
      const { base } = await import('@lark-base-open/js-sdk');
      
      // 获取 selection 信息
      const selection = await base.getSelection();
      console.log('[FeishuService] SDK selection:', selection);
      
      if (selection?.tableId && selection?.baseId) {
        // 🔥 设置 API 凭证（baseId 作为 appToken）
        appToken = selection.baseId;
        tableId = selection.tableId;
        currentEnv = 'api'; // 强制使用 API 模式
        
        console.log('[FeishuService] 从 SDK 获取凭证成功，切换到 API 模式');
        console.log('[FeishuService] appToken:', appToken);
        console.log('[FeishuService] tableId:', tableId);
        
        // 获取表格名称（通过后端 API）
        try {
          const response = await fetch(`/api/feishu/init/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appToken: appToken,
              tableId: tableId,
            }),
          });
          
          const result = await response.json();
          
          return {
            success: true,
            tableName: result.tableName,
            tableId: tableId,
            appToken: appToken,
          };
        } catch (error) {
          console.error('[FeishuService] 获取表格名称失败:', error);
          return {
            success: true, // 凭证获取成功，只是名称获取失败
            tableId: tableId,
            appToken: appToken,
          };
        }
      } else {
        console.error('[FeishuService] SDK selection 缺少 tableId 或 baseId');
        return { success: false };
      }
    } catch (error) {
      console.error('[FeishuService] SDK 初始化失败:', error);
      return { success: false };
    }
  }
  
  console.warn('[FeishuService] 非飞书环境且未提供凭证');
  return { success: false };
}

/**
 * 获取表格名称
 */
export async function fetchTableName(): Promise<string> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    try {
      const { fetchTableName: sdkFetchTableName } = await import('./feishu-env');
      return await sdkFetchTableName();
    } catch (error) {
      console.error('[FeishuService] SDK 获取表格名称失败:', error);
      return '未命名表格';
    }
  }
  
  if (env === 'api') {
    try {
      const response = await fetch('/api/feishu/init/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appToken: appToken!,
          tableId: tableId!,
        }),
      });
      
      const result = await response.json();
      return result.tableName || '未命名表格';
    } catch (error) {
      console.error('[FeishuService] API 获取表格名称失败:', error);
      return '未命名表格';
    }
  }
  
  return '未命名表格';
}

/**
 * 获取当前选中的表格 ID
 */
export async function getCurrentTableIdAsync(): Promise<string | null> {
  const env = detectEnvironment();
  
  // 如果已经缓存了 tableId，直接返回
  if (tableId) {
    return tableId;
  }
  
  // SDK 模式下，从 SDK 获取
  if (env === 'sdk') {
    try {
      const { base } = await import('@lark-base-open/js-sdk');
      const selection = await base.getSelection();
      if (selection?.tableId) {
        tableId = selection.tableId;
        return tableId;
      }
    } catch (error) {
      console.error('[FeishuService] 获取 tableId 失败:', error);
    }
  }
  
  return tableId;
}

/**
 * 获取当前选中的表格 ID（同步版本，返回缓存值）
 */
export function getCurrentTableId(): string | null {
  return tableId;
}

/**
 * 获取当前 appToken（同步版本，返回缓存值）
 */
export function getCurrentAppToken(): string | null {
  return appToken;
}

/**
 * 检查是否在飞书环境中
 */
export function isFeishuEnvironment(): boolean {
  return detectEnvironment() !== 'unknown';
}

/**
 * 根据字段类型获取字段种类
 */
function getFieldKind(type: number | string): Field['fieldKind'] {
  const typeStr = String(type);
  const typeNum = typeof type === 'number' ? type : parseInt(typeStr, 10);
  
  // 附件类型
  if (typeNum === 17 || typeStr === 'attachment') {
    return 'attachment';
  }
  
  // 人员类型
  if (typeNum === 11 || typeNum === 7 || typeStr === 'user' || typeStr === 'person') {
    return 'person';
  }
  
  // 文本类型
  if (typeNum === 1 || typeStr === 'text') {
    return 'text';
  }
  
  // 数字类型
  if (typeNum === 2 || typeStr === 'number') {
    return 'number';
  }
  
  // 日期类型
  if (typeNum === 5 || typeStr === 'date') {
    return 'date';
  }
  
  return 'other';
}

// ============================================
// 复选框选中记录功能
// ============================================

let checkboxManager: any = null;
let selectionCallbacks: Set<CheckboxSelectionCallback> = new Set();
let recordsCallbacks: Set<RecordsCallback> = new Set();

/**
 * 初始化复选框选中监听
 * 
 * 实现思路：
 * 1. 使用 bitable.ui.getSelectRecordIds() 获取复选框选中的记录 ID
 * 2. 使用 base.onSelectionChange() 监听选择变化
 * 3. 使用 table.getRecordById() 获取记录数据
 */
export async function initCheckboxSelection(): Promise<boolean> {
  const env = detectEnvironment();
  
  if (env !== 'sdk') {
    console.log('[FeishuService] 非 SDK 环境，跳过复选框监听初始化');
    return false;
  }
  
  try {
    const { getCheckboxManager } = await import('./feishu-selection');
    checkboxManager = getCheckboxManager();
    await checkboxManager.init();
    
    // 注册内部监听器，转发给外部回调
    checkboxManager.onSelectionChange((event: CheckboxSelectionEvent) => {
      selectionCallbacks.forEach(cb => {
        try {
          cb(event);
        } catch (e) {
          console.error('[FeishuService] 选中回调执行失败:', e);
        }
      });
    });
    
    checkboxManager.onRecordsChange((records: Record<string, unknown>[]) => {
      recordsCallbacks.forEach(cb => {
        try {
          cb(records);
        } catch (e) {
          console.error('[FeishuService] 记录回调执行失败:', e);
        }
      });
    });
    
    console.log('[FeishuService] 复选框选中监听初始化成功');
    return true;
  } catch (error) {
    console.error('[FeishuService] 复选框选中监听初始化失败:', error);
    return false;
  }
}

/**
 * 监听复选框选中变化
 */
export function onCheckboxSelectionChange(
  callback: CheckboxSelectionCallback
): () => void {
  selectionCallbacks.add(callback);
  return () => {
    selectionCallbacks.delete(callback);
  };
}

/**
 * 监听选中记录数据变化
 */
export function onSelectedRecordsChange(
  callback: RecordsCallback
): () => void {
  recordsCallbacks.add(callback);
  return () => {
    recordsCallbacks.delete(callback);
  };
}

/**
 * 获取复选框选中的记录 IDs
 * 
 * 使用场景：用户勾选行表头复选框后，获取选中的记录 ID 列表
 */
export async function getCheckboxSelectedIds(): Promise<string[]> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    try {
      if (!checkboxManager) {
        await initCheckboxSelection();
      }
      
      if (checkboxManager) {
        return checkboxManager.getCheckboxSelectedIds();
      }
      
      // 降级方案：使用 feishu-env 的方法
      const { getCheckboxSelectedRecords } = await import('./feishu-env');
      const records = await getCheckboxSelectedRecords();
      return records.map(r => r.id);
    } catch (error) {
      console.error('[FeishuService] 获取选中 IDs 失败:', error);
      return [];
    }
  }
  
  // API 模式：返回空数组，需要前端传递
  console.warn('[FeishuService] API 模式下需要前端传递选中记录');
  return [];
}

/**
 * 获取复选框选中的记录数据
 * 
 * 使用场景：
 * 1. 用户勾选行表头复选框选中多条记录
 * 2. 系统批量获取选中记录的完整数据
 * 3. 将数据显示在打印排版模式下
 */
export async function getCheckboxSelectedRecords(): Promise<Record<string, unknown>[]> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    try {
      if (!checkboxManager) {
        await initCheckboxSelection();
      }
      
      if (checkboxManager) {
        return checkboxManager.refresh();
      }
      
      // 降级方案：使用 feishu-env 的方法
      const { getCheckboxSelectedRecords: sdkGetRecords } = await import('./feishu-env');
      const records = await sdkGetRecords();
      return records.map(r => ({ id: r.id, ...r.fields }));
    } catch (error) {
      console.error('[FeishuService] 获取选中记录失败:', error);
      return [];
    }
  }
  
  // API 模式：使用缓存的 recordIds
  if (env === 'api') {
    const ids = await getCheckboxSelectedIds();
    if (ids.length > 0) {
      return fetchRecords({ recordIds: ids, processFields: true });
    }
  }
  
  return [];
}

/**
 * 手动刷新选中的记录数据
 */
export async function refreshSelectedRecords(): Promise<Record<string, unknown>[]> {
  return getCheckboxSelectedRecords();
}

/**
 * 销毁复选框选中管理器
 */
export function destroyCheckboxSelection(): void {
  if (checkboxManager) {
    checkboxManager.destroy();
    checkboxManager = null;
  }
  selectionCallbacks.clear();
  recordsCallbacks.clear();
}

// 导出类型
export type { Field };
