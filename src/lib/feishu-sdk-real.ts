/**
 * 飞书多维表格 SDK - 真实实现
 * 使用 @lark-base-open/js-sdk
 */

import { bitable } from '@lark-base-open/js-sdk';

// 声明全局 window 类型
declare global {
  interface Window {
    bitable?: any;
  }
}

export interface FeishuBitableRecord {
  record_id: string;
  fields: Record<string, any>;
  created_time: number;
  last_modified_time: number;
}

// 转换为应用内部的 BitableRecord 格式
export interface BitableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
  lastModifiedTime: string;
}

export interface FeishuBitableField {
  field_id: string;
  field_name: string;
  type: number;
  property: any;
}

export interface FeishuTable {
  table_id: string;
  name: string;
}

export interface FeishuBitable {
  bitable_id: string;
  name: string;
}

/**
 * 飞书 Bitable SDK 实例（真实实现）
 */
export class FeishuBitableSDK {
  private initialized: boolean = false;

  /**
   * 初始化 SDK
   */
  async init(): Promise<boolean> {
    try {
      // 检查是否在飞书环境中
      if (typeof window === 'undefined' || !window.bitable) {
        console.warn('不在飞书环境中');
        return false;
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('初始化飞书 SDK 失败:', error);
      return false;
    }
  }

  /**
   * 获取当前 Bitable 信息
   */
  async getBitable(): Promise<FeishuBitable | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const baseInfo = await bitable.base.getActiveTable();
      return {
        // @ts-ignore - 飞书 SDK 的类型定义不准确
        bitable_id: baseInfo.id,
        // @ts-ignore - 飞书 SDK 的类型定义不准确
        name: baseInfo.name,
      };
    } catch (error) {
      console.error('获取 Bitable 信息失败:', error);
      return null;
    }
  }

  /**
   * 获取当前表格
   */
  async getActiveTable(): Promise<FeishuTable | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      return {
        // @ts-ignore - 飞书 SDK 的类型定义不准确
        table_id: table.id,
        // @ts-ignore - 飞书 SDK 的类型定义不准确
        name: table.name,
      };
    } catch (error) {
      console.error('获取当前表格失败:', error);
      return null;
    }
  }

  /**
   * 获取所有表格
   */
  async getTableList(): Promise<FeishuTable[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const tables = await bitable.base.getTableList();
      return tables.map((table: any) => ({
        table_id: table.id,
        name: table.name,
      }));
    } catch (error) {
      console.error('获取表格列表失败:', error);
      return [];
    }
  }

  /**
   * 获取字段列表
   */
  async getFieldList(): Promise<FeishuBitableField[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      const fieldMetaList = await table.getFieldMetaList();
      return fieldMetaList.map((field: any) => ({
        field_id: field.id,
        field_name: field.name,
        type: field.type,
        property: field.property,
      }));
    } catch (error) {
      console.error('获取字段列表失败:', error);
      return [];
    }
  }

  /**
   * 获取记录列表
   */
  async getRecords(options?: any): Promise<{
    records: BitableRecord[];
    hasMore: boolean;
    pageToken?: string;
  }> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      const recordIdList = await table.getRecordIdList();

      // 获取记录
      const records: BitableRecord[] = [];
      const fieldIds = options?.fieldIds;

      for (const recordId of recordIdList) {
        try {
          const record = await this.getRecord(recordId, fieldIds);
          if (record) {
            records.push(record);
          }
        } catch (e) {
          console.warn(`获取记录 ${recordId} 失败:`, e);
        }
      }

      // 分页处理
      const pageSize = options?.pageSize || 20;
      const startIndex = options?.pageToken ? parseInt(options.pageToken) : 0;
      const endIndex = startIndex + pageSize;
      const paginatedRecords = records.slice(startIndex, endIndex);

      return {
        records: paginatedRecords,
        hasMore: endIndex < records.length,
        pageToken: endIndex < records.length ? endIndex.toString() : undefined,
      };
    } catch (error) {
      console.error('获取记录列表失败:', error);
      return { records: [], hasMore: false };
    }
  }

  /**
   * 获取单条记录
   */
  async getRecord(recordId: string, fieldIds?: string[]): Promise<BitableRecord | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      // @ts-ignore - 飞书 SDK 的类型定义不准确
      const cell = await table.getCell(recordId, fieldIds?.[0] || '');
      
      // 使用 fields 格式获取
      // @ts-ignore - 飞书 SDK 的类型定义不准确
      const record = await table.getRecords({
        // @ts-ignore - 飞书 SDK 的类型定义不准确
        recordIds: [recordId],
        fieldIds: fieldIds,
      });

      // @ts-ignore - 飞书 SDK 的类型定义不准确
      if (record?.items?.[0]) {
        return {
          id: recordId,
          // @ts-ignore - 飞书 SDK 的类型定义不准确
          fields: record.items[0].fields || {},
          createdTime: new Date().toISOString(),
          lastModifiedTime: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      console.error('获取记录失败:', error);
      return null;
    }
  }

  /**
   * 添加记录
   */
  async addRecord(fields: Record<string, any>): Promise<BitableRecord | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      const recordId = await table.addRecord({ fields });
      const record = await this.getRecord(recordId);
      return record;
    } catch (error) {
      console.error('添加记录失败:', error);
      return null;
    }
  }

  /**
   * 更新记录
   */
  async updateRecord(
    recordId: string,
    fields: Record<string, any>
  ): Promise<BitableRecord | null> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      await table.setRecord(recordId, { fields });
      const record = await this.getRecord(recordId);
      return record;
    } catch (error) {
      console.error('更新记录失败:', error);
      return null;
    }
  }

  /**
   * 删除记录
   */
  async deleteRecord(recordId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      await table.deleteRecord(recordId);
      return true;
    } catch (error) {
      console.error('删除记录失败:', error);
      return false;
    }
  }

  /**
   * 批量添加记录
   */
  async addRecords(records: Record<string, any>[]): Promise<BitableRecord[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      const recordIds = await table.addRecords(records.map(r => ({ fields: r })));

      const results: BitableRecord[] = [];
      for (const recordId of recordIds) {
        const record = await this.getRecord(recordId);
        if (record) {
          results.push(record);
        }
      }

      return results;
    } catch (error) {
      console.error('批量添加记录失败:', error);
      return [];
    }
  }

  /**
   * 批量更新记录
   */
  async updateRecords(
    updates: Array<{
      recordId: string;
      fields: Record<string, any>;
    }>
  ): Promise<BitableRecord[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      await table.setRecords(updates.map(u => ({
        recordId: u.recordId,
        fields: u.fields,
      })));

      const results: BitableRecord[] = [];
      for (const update of updates) {
        const record = await this.getRecord(update.recordId);
        if (record) {
          results.push(record);
        }
      }

      return results;
    } catch (error) {
      console.error('批量更新记录失败:', error);
      return [];
    }
  }

  /**
   * 批量删除记录
   */
  async deleteRecords(recordIds: string[]): Promise<boolean> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const table = await bitable.base.getActiveTable();
      await table.deleteRecords(recordIds);
      return true;
    } catch (error) {
      console.error('批量删除记录失败:', error);
      return false;
    }
  }

  /**
   * 检查是否在飞书环境中
   */
  isFeishuEnvironment(): boolean {
    return typeof window !== 'undefined' && !!window.bitable;
  }
}

// 导出单例实例
export const feishuSDK = new FeishuBitableSDK();

// 导出 bitable 实例供直接使用
export { bitable };
