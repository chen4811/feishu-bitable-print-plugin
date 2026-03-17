/**
 * 飞书服务 - 统一数据获取层
 * 
 * 根据环境自动选择：
 * 1. 飞书侧边栏环境：使用 JS-SDK (feishu-env.ts)
 * 2. 独立访问环境：使用后端 API (feishu-client.ts)
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

// 全局状态
let currentEnv: Environment = 'unknown';
let appToken: string | null = null;
let tableId: string | null = null;

/**
 * 检测当前环境
 */
export function detectEnvironment(): Environment {
  // 检查是否在 iframe 中（飞书侧边栏环境）
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  if (inIframe) {
    // 尝试检测飞书环境
    const isFeishuEnv = typeof navigator !== 'undefined' && /lark|feishu/i.test(navigator.userAgent);
    if (isFeishuEnv) {
      currentEnv = 'sdk';
      return 'sdk';
    }
  }
  
  // 检查是否有配置的 appToken 和 tableId
  if (appToken && tableId) {
    currentEnv = 'api';
    return 'api';
  }
  
  return 'unknown';
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
 * 场景1：模板编辑状态下，切换多维表格数据源字段将会刷新
 * 场景2：打印预览模式下，切换多维表格，进行字段预处理
 */
export async function fetchFields(): Promise<Field[]> {
  const env = detectEnvironment();
  
  console.log('[FeishuService] 获取字段列表, 环境:', env);
  
  if (env === 'sdk') {
    // 使用 JS-SDK
    try {
      const { fetchFields: sdkFetchFields } = await import('./feishu-env');
      const rawFields = await sdkFetchFields();
      
      return rawFields.map((field: any, index: number) => ({
        id: field.id || `field_${index}`,
        name: field.name,
        type: field.type,
        placeholder: `[${field.name}]`,
        isSystem: false,
        fieldKind: getFieldKind(field.type),
      }));
    } catch (error) {
      console.error('[FeishuService] SDK 获取字段失败:', error);
      return [];
    }
  }
  
  if (env === 'api') {
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
      
      return result.fields.map((field: any) => ({
        id: field.id,
        name: field.name,
        type: String(field.type),
        placeholder: `[${field.name}]`,
        isSystem: false,
        fieldKind: field.fieldKind || getFieldKind(field.type),
      }));
    } catch (error) {
      console.error('[FeishuService] API 获取字段失败:', error);
      return [];
    }
  }
  
  console.warn('[FeishuService] 未知环境，无法获取字段');
  return [];
}

/**
 * 获取记录列表
 */
export async function fetchRecords(options?: {
  recordIds?: string[];
  processFields?: boolean;
}): Promise<Record<string, unknown>[]> {
  const env = detectEnvironment();
  
  console.log('[FeishuService] 获取记录, 环境:', env);
  
  if (env === 'sdk') {
    // 使用 JS-SDK
    try {
      const { fetchRecords: sdkFetchRecords, getSelectedRecords } = await import('./feishu-env');
      
      // 如果指定了 recordIds，需要使用批量获取
      if (options?.recordIds && options.recordIds.length > 0) {
        const { getRecordsByCheckboxIds } = await import('./feishu-env');
        // 在 SDK 模式下，需要从 selection 获取 tableId
        // 简化处理：如果没有 tableId，跳过批量获取
        if (tableId) {
          const records = await getRecordsByCheckboxIds(tableId, options.recordIds);
          return records.map(r => ({ id: r.id, ...r.fields }));
        }
      }
      
      // 默认获取所有记录或选中记录
      const rawRecords = await sdkFetchRecords();
      return rawRecords.map(r => ({ id: r.id, ...r.fields }));
    } catch (error) {
      console.error('[FeishuService] SDK 获取记录失败:', error);
      return [];
    }
  }
  
  if (env === 'api') {
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
  
  console.warn('[FeishuService] 未知环境，无法获取记录');
  return [];
}

/**
 * 获取选中记录（SDK 模式专用）
 */
export async function getSelectedRecords(): Promise<Record<string, unknown>[]> {
  const env = detectEnvironment();
  
  if (env === 'sdk') {
    try {
      const { getSelectedRecords: sdkGetSelectedRecords } = await import('./feishu-env');
      const records = await sdkGetSelectedRecords();
      return records.map(r => ({ id: r.id, ...r.fields }));
    } catch (error) {
      console.error('[FeishuService] SDK 获取选中记录失败:', error);
      return [];
    }
  }
  
  // API 模式下需要前端传递选中的 recordIds
  console.warn('[FeishuService] API 模式下请使用 fetchRecords({ recordIds: [...] })');
  return [];
}

/**
 * 初始化环境
 */
export async function initEnvironment(config?: {
  appToken?: string;
  tableId?: string;
}): Promise<boolean> {
  // 如果提供了凭证，设置 API 模式
  if (config?.appToken && config?.tableId) {
    setApiCredentials(config.appToken, config.tableId);
    
    // 验证凭证
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
      return result.success;
    } catch (error) {
      console.error('[FeishuService] 初始化失败:', error);
      return false;
    }
  }
  
  // 否则尝试初始化 SDK 环境
  try {
    const { initFeishuEnv } = await import('./feishu-env');
    const success = await initFeishuEnv();
    if (success) {
      currentEnv = 'sdk';
    }
    return success;
  } catch (error) {
    console.error('[FeishuService] SDK 初始化失败:', error);
    return false;
  }
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

// 导出类型
export type { Field };
