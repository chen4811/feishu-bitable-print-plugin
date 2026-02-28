/**
 * 飞书 SDK 环境 - 统一管理环境检测和 SDK 初始化
 * 
 * 核心改进：
 * 1. 使用 bitable.bridge.onReady() 异步回调判断环境
 * 2. 不再依赖同步的 window.lark 检测
 * 3. 提供统一的状态管理和错误处理
 * 4. 添加回调移除机制，防止内存泄漏和重复调用
 */

import { bitable, base } from '@lark-base-open/js-sdk';

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

// 环境状态类型
export type FeishuEnvStatus = 'checking' | 'ready' | 'not_feishu' | 'error';

// 环境状态
let envStatus: FeishuEnvStatus = 'checking';
let envError: string | null = null;
let onReadyCallbacks: Set<() => void> = new Set();
let onNotFeishuCallbacks: Set<() => void> = new Set();
let initPromise: Promise<boolean> | null = null;
let isInitialized = false;

// 字段类型映射
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text', 2: 'number', 3: 'singleSelect', 4: 'multiSelect',
  5: 'date', 6: 'checkbox', 7: 'user', 8: 'url',
  9: 'phone', 10: 'email', 11: 'attachment', 12: 'formula',
  13: 'progress', 14: 'currency', 15: 'rating', 16: 'location',
  17: 'relation', 18: 'group', 19: 'barcode', 20: 'modifiedTime',
  21: 'createdTime', 22: 'modifiedUser', 23: 'createdUser', 24: 'autoNumber',
};

/**
 * 获取当前环境状态
 */
export function getEnvStatus(): FeishuEnvStatus {
  return envStatus;
}

/**
 * 获取环境错误信息
 */
export function getEnvError(): string | null {
  return envError;
}

/**
 * 检查是否在飞书环境中（同步，用于快速判断）
 */
export function isFeishuEnvironment(): boolean {
  return envStatus === 'ready';
}

/**
 * 注册就绪回调
 * @returns 移除回调的函数
 */
export function onFeishuReady(callback: () => void): () => void {
  if (envStatus === 'ready') {
    // 已经就绪，立即执行
    callback();
    return () => {};
  }
  onReadyCallbacks.add(callback);
  // 返回移除函数
  return () => {
    onReadyCallbacks.delete(callback);
  };
}

/**
 * 移除就绪回调
 */
export function offFeishuReady(callback: () => void): void {
  onReadyCallbacks.delete(callback);
}

/**
 * 注册非飞书环境回调
 * @returns 移除回调的函数
 */
export function onNotFeishu(callback: () => void): () => void {
  if (envStatus === 'not_feishu') {
    // 已经确定非飞书，立即执行
    callback();
    return () => {};
  }
  onNotFeishuCallbacks.add(callback);
  // 返回移除函数
  return () => {
    onNotFeishuCallbacks.delete(callback);
  };
}

/**
 * 移除非飞书环境回调
 */
export function offNotFeishu(callback: () => void): void {
  onNotFeishuCallbacks.delete(callback);
}

/**
 * 初始化飞书环境
 * 使用单例模式，确保只初始化一次
 */
export async function initFeishuEnv(): Promise<boolean> {
  // 已经初始化过，直接返回之前的结果
  if (isInitialized && initPromise) {
    return initPromise;
  }
  
  isInitialized = true;

  initPromise = (async () => {
    console.log('[FeishuEnv] 开始环境检测...');

    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    console.log('[FeishuEnv] inIframe:', inIframe);

    if (!inIframe) {
      envStatus = 'not_feishu';
      envError = '不在 iframe 中';
      console.log('[FeishuEnv] 不在 iframe 中，判定为非飞书环境');
      onNotFeishuCallbacks.forEach(cb => cb());
      return false;
    }

    try {
      console.log('[FeishuEnv] 尝试初始化 SDK...');
      
      const timeout = 5000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('SDK 初始化超时')), timeout);
      });

      // 使用 base.getSelection 或 bitable.bridge 来检测环境
      const initSdk = async () => {
        // 尝试获取选择信息，这需要在飞书环境中才能成功
        const selection = await base.getSelection();
        return selection;
      };

      await Promise.race([
        initSdk(),
        timeoutPromise
      ]);

      envStatus = 'ready';
      console.log('[FeishuEnv] SDK 初始化成功，飞书环境已就绪');
      
      onReadyCallbacks.forEach(cb => cb());
      return true;

    } catch (error) {
      console.warn('[FeishuEnv] SDK 初始化失败:', error);
      
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const urlHasFeishu = url.includes('feishu.cn') || 
                           url.includes('larksuite.com') ||
                           url.includes('bytedance');

      if (urlHasFeishu) {
        envStatus = 'error';
        envError = `SDK 初始化失败: ${error}`;
        console.log('[FeishuEnv] URL 包含飞书域名，但 SDK 未就绪');
        return false;
      }

      envStatus = 'not_feishu';
      envError = 'SDK 初始化失败';
      console.log('[FeishuEnv] 判定为非飞书环境');
      
      onNotFeishuCallbacks.forEach(cb => cb());
      return false;
    }
  })();

  return initPromise;
}

/**
 * 获取字段列表
 */
export async function fetchFields(): Promise<Array<{
  id: string;
  name: string;
  type: string;
}>> {
  if (envStatus !== 'ready') {
    console.error('[FeishuEnv] 环境未就绪，无法获取字段');
    return [];
  }

  try {
    const selection = await base.getSelection();
    console.log('[FeishuEnv] selection:', selection);
    
    if (!selection?.tableId) {
      console.error('[FeishuEnv] 无法获取 tableId');
      return [];
    }
    
    const table = await base.getTable(selection.tableId);
    console.log('[FeishuEnv] table:', table);
    
    console.log(`[FeishuEnv] 开始获取字段数据...`);
    const rawFields = await table.getFieldList();
    console.log(`[FeishuEnv] 原始字段列表:`, rawFields);
    console.log(`[FeishuEnv] 原始字段数量:`, rawFields.length);
    
    // 使用异步方法获取字段信息
    const fields: FieldInfo[] = [];
    for (let index = 0; index < rawFields.length; index++) {
      const field = rawFields[index];
      console.log(`[FeishuEnv] 处理字段 ${index}...`);
      
      try {
        // 使用异步方法获取字段信息
        const name = await field.getName();
        const type = await field.getType();
        const meta = await field.getMeta();
        
        console.log(`[FeishuEnv] 字段 ${index} getName():`, name);
        console.log(`[FeishuEnv] 字段 ${index} getType():`, type);
        console.log(`[FeishuEnv] 字段 ${index} getMeta():`, meta);
        
        // 映射字段类型
        const mappedType = FIELD_TYPE_MAP[type] || 'text';
        
        fields.push({
          id: meta.id || `field_${index}`,
          name: name || `字段${index + 1}`,
          type: mappedType,
        });
        
        console.log(`[FeishuEnv] 字段 ${index} 解析结果:`, fields[index]);
      } catch (error) {
        console.error(`[FeishuEnv] 获取字段 ${index} 信息失败:`, error);
        // 即使失败也添加一个占位符
        fields.push({
          id: `field_${index}`,
          name: `字段${index + 1}`,
          type: 'text',
        });
      }
    }
    
    console.log('[FeishuEnv] 最终返回的字段列表:', fields);
    return fields;
  } catch (error) {
    console.error('[FeishuEnv] 获取字段失败:', error);
    return [];
  }
}

/**
 * 获取记录列表
 */
export async function fetchRecords(): Promise<Array<{
  id: string;
  fields: Record<string, unknown>;
}>> {
  if (envStatus !== 'ready') {
    console.error('[FeishuEnv] 环境未就绪，无法获取记录');
    return [];
  }

  try {
    const selection = await base.getSelection();
    if (!selection?.tableId) {
      console.error('[FeishuEnv] 无法获取 tableId');
      return [];
    }
    
    const table = await base.getTable(selection.tableId);
    
    // 获取记录 ID 列表
    const recordIdList = await table.getRecordIdList();
    console.log('[FeishuEnv] 获取到记录 ID 数量:', recordIdList?.length || 0);
    
    if (!Array.isArray(recordIdList) || recordIdList.length === 0) {
      return [];
    }

    // 批量获取记录（限制数量）
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
        console.warn('[FeishuEnv] 获取单条记录失败:', e);
      }
    }

    console.log('[FeishuEnv] 成功获取记录数:', records.length);
    return records;
  } catch (error) {
    console.error('[FeishuEnv] 获取记录失败:', error);
    return [];
  }
}

/**
 * 获取应用元数据
 */
export async function fetchAppMetadata(): Promise<AppMetadata | null> {
  if (envStatus !== 'ready') {
    console.error('[FeishuEnv] 环境未就绪，无法获取元数据');
    return null;
  }

  try {
    // 使用 selection 作为元数据的替代方案
    const selection = await base.getSelection();
    console.log('[FeishuEnv] selection:', selection);
    
    if (!selection?.tableId) {
      console.error('[FeishuEnv] 无法获取 tableId');
      return null;
    }
    
    // 构造元数据对象（使用当前 tableId 作为默认）
    return {
      appId: (selection as any).appId || 'unknown',
      name: '多维表格',
      defaultTableId: selection.tableId,
      description: '从上下文获取',
    };
  } catch (error) {
    console.error('[FeishuEnv] 获取元数据失败:', error);
    return null;
  }
}

/**
 * 获取首条记录数据
 */
export async function fetchFirstRecord(): Promise<Record<string, unknown> | null> {
  if (envStatus !== 'ready') {
    console.error('[FeishuEnv] 环境未就绪，无法获取首条记录');
    return null;
  }

  try {
    const selection = await base.getSelection();
    if (!selection?.tableId) {
      console.error('[FeishuEnv] 无法获取 tableId');
      return null;
    }
    
    const table = await base.getTable(selection.tableId);
    
    // 获取记录 ID 列表
    const recordIdList = await table.getRecordIdList();
    console.log('[FeishuEnv] 首条记录 - 获取到记录 ID 数量:', recordIdList?.length || 0);
    
    if (!Array.isArray(recordIdList) || recordIdList.length === 0) {
      console.log('[FeishuEnv] 表格为空，没有记录');
      return null;
    }

    // 获取第一条记录
    try {
      const firstRecordId = recordIdList[0];
      const record = await table.getRecordById(firstRecordId);
      if (record) {
        console.log('[FeishuEnv] 成功获取首条记录:', record);
        return record.fields || {};
      }
    } catch (e) {
      console.warn('[FeishuEnv] 获取首条记录失败:', e);
    }

    return null;
  } catch (error) {
    console.error('[FeishuEnv] 获取首条记录失败:', error);
    return null;
  }
}

/**
 * 获取表格名称
 */
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
    // 尝试获取表格名称，如果不存在则返回默认值
    return (table as any).name || '多维表格';
  } catch {
    return '多维表格';
  }
}

/**
 * 综合初始化 - 获取所有需要的数据
 */
export async function initFeishuContext(): Promise<FeishuContext | null> {
  if (envStatus !== 'ready') {
    console.error('[FeishuEnv] 环境未就绪，无法初始化上下文');
    return null;
  }

  try {
    console.log('[FeishuEnv] 开始初始化飞书上下文...');
    
    // 1. 获取元数据
    const appMetadata = await fetchAppMetadata();
    if (!appMetadata) {
      console.error('[FeishuEnv] 无法获取元数据');
      return null;
    }
    
    // 2. 获取字段列表
    const fields = await fetchFields();
    
    // 3. 构建字段名到ID的映射
    const fieldNameToIdMap: Record<string, string> = {};
    fields.forEach(field => {
      fieldNameToIdMap[field.name] = field.id;
    });
    console.log('[FeishuEnv] 字段映射:', fieldNameToIdMap);
    
    // 4. 获取首条记录
    const firstRecordData = await fetchFirstRecord();
    console.log('[FeishuEnv] 首条记录数据:', firstRecordData);
    
    const context: FeishuContext = {
      appToken: appMetadata.appId,
      targetTableId: appMetadata.defaultTableId,
      fieldNameToIdMap,
      firstRecordData,
      appMetadata,
    };
    
    console.log('[FeishuEnv] 飞书上下文初始化完成:', context);
    return context;
  } catch (error) {
    console.error('[FeishuEnv] 初始化上下文失败:', error);
    return null;
  }
}

/**
 * 获取调试信息
 */
export function getDebugInfo(): Record<string, unknown> {
  return {
    envStatus,
    envError,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    inIframe: typeof window !== 'undefined' && window.self !== window.top,
  };
}

// 注意：移除了自动初始化代码
// 初始化现在由 usePrintSDK hook 显式调用，避免模块加载时自动触发

// 导出统一的 SDK 对象
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
};

export default feishuEnv;
