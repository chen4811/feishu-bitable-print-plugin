/**
 * 飞书 SDK 环境 - 统一管理环境检测和 SDK 初始化
 * 
 * 核心改进：
 * 1. 使用 bitable.bridge.onReady() 异步回调判断环境
 * 2. 不再依赖同步的 window.lark 检测
 * 3. 提供统一的状态管理和错误处理
 */

import { bitable, base } from '@lark-base-open/js-sdk';

// 环境状态类型
export type FeishuEnvStatus = 'checking' | 'ready' | 'not_feishu' | 'error';

// 环境状态
let envStatus: FeishuEnvStatus = 'checking';
let envError: string | null = null;
let onReadyCallbacks: Array<() => void> = [];
let onNotFeishuCallbacks: Array<() => void> = [];
let initPromise: Promise<boolean> | null = null;

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
 */
export function onFeishuReady(callback: () => void): void {
  if (envStatus === 'ready') {
    callback();
  } else {
    onReadyCallbacks.push(callback);
  }
}

/**
 * 注册非飞书环境回调
 */
export function onNotFeishu(callback: () => void): void {
  if (envStatus === 'not_feishu') {
    callback();
  } else {
    onNotFeishuCallbacks.push(callback);
  }
}

/**
 * 初始化飞书环境
 */
export async function initFeishuEnv(): Promise<boolean> {
  if (initPromise) {
    return initPromise;
  }

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
    if (!selection?.tableId) {
      console.error('[FeishuEnv] 无法获取 tableId');
      return [];
    }
    
    const table = await base.getTable(selection.tableId);
    const fields = await table.getFieldList();

    console.log('[FeishuEnv] 获取到字段:', fields?.length || 0);

    if (!Array.isArray(fields)) {
      return [];
    }

    return fields.map((field: any, index: number) => ({
      id: field.id || `field_${index}`,
      name: field.name || `字段${index + 1}`,
      type: FIELD_TYPE_MAP[field.type] || 'text',
    }));
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

// 自动初始化
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initFeishuEnv().catch(console.error);
  }, 100);
}

// 导出统一的 SDK 对象
export const feishuEnv = {
  getEnvStatus,
  getEnvError,
  isFeishuEnvironment,
  onFeishuReady,
  onNotFeishu,
  init: initFeishuEnv,
  fetchFields,
  fetchRecords,
  fetchTableName,
  getDebugInfo,
};

export default feishuEnv;
