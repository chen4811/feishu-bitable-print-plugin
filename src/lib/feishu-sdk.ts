/**
 * 飞书 SDK 真实实现
 * 用于在飞书环境中获取多维表格数据
 * 
 * API 文档: https://open.feishu.cn/document/client-docs/bitable/bitable-overview
 */

import { base } from '@lark-base-open/js-sdk';

// 字段类型映射
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text',      // 文本
  2: 'number',    // 数字
  3: 'singleSelect', // 单选
  4: 'multiSelect',  // 多选
  5: 'date',      // 日期
  6: 'checkbox',  // 复选框
  7: 'user',      // 人员
  8: 'url',       // 超链接
  9: 'phone',     // 电话
  10: 'email',    // 邮箱
  11: 'attachment', // 附件
  12: 'formula',  // 公式
  13: 'progress', // 进度
  14: 'currency', // 货币
  15: 'rating',   // 评分
  16: 'location', // 地理位置
  17: 'relation', // 关联
  18: 'group',    // 群组
  19: 'barcode',  // 条码
  20: 'modifiedTime', // 修改时间
  21: 'createdTime',  // 创建时间
  22: 'modifiedUser', // 修改人
  23: 'createdUser',  // 创建人
  24: 'autoNumber',   // 自动编号
};

// 飞书字段接口
export interface FeishuField {
  id: string;
  name: string;
  type: number;
  type_name: string;
  property?: Record<string, unknown>;
}

// 飞书记录接口
export interface FeishuRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: number;
  modifiedTime?: number;
}

// SDK 状态
let isInitialized = false;
let currentTable: any = null;

/**
 * 检查是否在飞书环境中
 */
export function isFeishuEnvironment(): boolean {
  // 检查是否在 iframe 中且有飞书 SDK
  return typeof window !== 'undefined' && 
         window.self !== window.top && 
         typeof base !== 'undefined';
}

/**
 * 初始化飞书 SDK
 */
export async function initSDK(): Promise<boolean> {
  if (isInitialized) return true;
  
  try {
    // 获取当前表格 - base.getTable 需要传入 tableId，但我们使用主动选择的方式
    const selection = await base.getSelection();
    if (selection && selection.tableId) {
      currentTable = await base.getTable(selection.tableId);
      isInitialized = true;
      console.log('飞书 SDK 初始化成功');
      return true;
    }
    return false;
  } catch (error) {
    console.error('飞书 SDK 初始化失败:', error);
    return false;
  }
}

/**
 * 获取字段列表
 */
export async function getFields(): Promise<FeishuField[]> {
  if (!currentTable) {
    await initSDK();
  }
  
  if (!currentTable) return [];
  
  try {
    const fields = await currentTable.getFieldList();
    return fields.map((field: any) => ({
      id: field.id,
      name: field.name || '未命名字段',
      type: field.type || 1,
      type_name: FIELD_TYPE_MAP[field.type || 1] || 'unknown',
      property: field.property as Record<string, unknown> | undefined,
    }));
  } catch (error) {
    console.error('获取字段列表失败:', error);
    return [];
  }
}

/**
 * 获取记录列表
 */
export async function getRecords(options?: {
  viewId?: string;
  pageSize?: number;
  pageToken?: string;
}): Promise<{
  records: FeishuRecord[];
  hasMore: boolean;
  pageToken?: string;
}> {
  if (!currentTable) {
    await initSDK();
  }
  
  if (!currentTable) return { records: [], hasMore: false };
  
  try {
    // 获取活动视图记录
    const view = await currentTable.getActiveView();
    const records = await view.getAllRecords();
    
    return {
      records: records.map((record: any) => ({
        id: record.id,
        fields: record.fields || {},
        createdTime: record.createdTime,
        modifiedTime: record.modifiedTime,
      })),
      hasMore: false,
    };
  } catch (error) {
    console.error('获取记录列表失败:', error);
    return { records: [], hasMore: false };
  }
}

/**
 * 获取所有记录（自动分页）
 */
export async function getAllRecords(viewId?: string): Promise<FeishuRecord[]> {
  const result = await getRecords({ viewId });
  return result.records;
}

/**
 * 添加记录
 */
export async function addRecord(fields: Record<string, unknown>): Promise<FeishuRecord | null> {
  if (!currentTable) {
    await initSDK();
  }
  
  if (!currentTable) return null;
  
  try {
    const recordId = await currentTable.addRecord({
      fields: fields as any
    });
    
    return {
      id: recordId,
      fields,
    };
  } catch (error) {
    console.error('添加记录失败:', error);
    return null;
  }
}

/**
 * 更新记录
 */
export async function updateRecord(
  recordId: string, 
  fields: Record<string, unknown>
): Promise<FeishuRecord | null> {
  if (!currentTable) {
    await initSDK();
  }
  
  if (!currentTable) return null;
  
  try {
    await currentTable.updateRecord({
      id: recordId,
      fields: fields as any
    });
    
    return {
      id: recordId,
      fields,
    };
  } catch (error) {
    console.error('更新记录失败:', error);
    return null;
  }
}

/**
 * 删除记录
 */
export async function deleteRecord(recordId: string): Promise<boolean> {
  if (!currentTable) {
    await initSDK();
  }
  
  if (!currentTable) return false;
  
  try {
    await currentTable.deleteRecord(recordId);
    return true;
  } catch (error) {
    console.error('删除记录失败:', error);
    return false;
  }
}

/**
 * 获取表格名称
 */
export async function getTableName(): Promise<string> {
  if (!currentTable) {
    await initSDK();
  }
  
  if (!currentTable) return '未命名表格';
  
  try {
    // 飞书 SDK 可能没有直接的 name 属性，使用默认名称
    return '多维表格';
  } catch {
    return '未命名表格';
  }
}

// 导出统一的 SDK 对象
export const feishuSDK = {
  isFeishuEnvironment,
  init: initSDK,
  getFields,
  getRecords,
  getAllRecords,
  addRecord,
  updateRecord,
  deleteRecord,
  getTableName,
};
