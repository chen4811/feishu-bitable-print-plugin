/**
 * 飞书多维表格 SDK 封装
 * 注意：这是模拟实现，实际使用时需要集成 @lark-base-open/js-sdk
 */

export interface FeishuBitableRecord {
  record_id: string;
  fields: Record<string, any>;
  created_time: number;
  last_modified_time: number;
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
 * 飞书 Bitable 实例
 */
class FeishuBitableSDK {
  private bitableInstance: any = null;

  /**
   * 初始化 SDK
   */
  async init() {
    try {
      // 检查是否在飞书环境中
      if (typeof window !== 'undefined' && (window as any).bitable) {
        this.bitableInstance = await (window as any).bitable.getInstance();
        return this.bitableInstance;
      } else {
        console.warn('不在飞书环境中，使用模拟数据');
        return null;
      }
    } catch (error) {
      console.error('初始化飞书 SDK 失败:', error);
      return null;
    }
  }

  /**
   * 获取当前 Bitable 信息
   */
  async getBitable(): Promise<FeishuBitable | null> {
    if (!this.bitableInstance) {
      await this.init();
    }

    if (!this.bitableInstance) {
      return null;
    }

    try {
      const bitable = await this.bitableInstance.getBitable();
      return bitable;
    } catch (error) {
      console.error('获取 Bitable 信息失败:', error);
      return null;
    }
  }

  /**
   * 获取当前表格
   */
  async getActiveTable(): Promise<FeishuTable | null> {
    if (!this.bitableInstance) {
      await this.init();
    }

    if (!this.bitableInstance) {
      return null;
    }

    try {
      const table = await this.bitableInstance.getActiveTable();
      return table;
    } catch (error) {
      console.error('获取当前表格失败:', error);
      return null;
    }
  }

  /**
   * 获取所有表格
   */
  async getTableList(): Promise<FeishuTable[]> {
    if (!this.bitableInstance) {
      await this.init();
    }

    if (!this.bitableInstance) {
      return [];
    }

    try {
      const bitable = await this.bitableInstance.getBitable();
      const tables = await bitable.getTableList();
      return tables;
    } catch (error) {
      console.error('获取表格列表失败:', error);
      return [];
    }
  }

  /**
   * 获取字段列表
   */
  async getFieldList(): Promise<FeishuBitableField[]> {
    const table = await this.getActiveTable();
    if (!table) {
      return [];
    }

    try {
      const tableInstance = await this.bitableInstance.getTable(table.table_id);
      const fields = await tableInstance.getFieldList();
      return fields;
    } catch (error) {
      console.error('获取字段列表失败:', error);
      return [];
    }
  }

  /**
   * 获取记录列表
   */
  async getRecords(options?: {
    pageSize?: number;
    pageToken?: string;
    fieldIds?: string[];
    sort?: Array<{
      fieldId: string;
      desc?: boolean;
    }>;
    filter?: any;
  }): Promise<{
    records: FeishuBitableRecord[];
    hasMore: boolean;
    pageToken?: string;
  }> {
    const table = await this.getActiveTable();
    if (!table) {
      return { records: [], hasMore: false };
    }

    try {
      const tableInstance = await this.bitableInstance.getTable(table.table_id);
      const result = await tableInstance.getRecords(options);
      return result;
    } catch (error) {
      console.error('获取记录列表失败:', error);
      return { records: [], hasMore: false };
    }
  }

  /**
   * 获取单条记录
   */
  async getRecord(recordId: string, fieldIds?: string[]): Promise<FeishuBitableRecord | null> {
    const table = await this.getActiveTable();
    if (!table) {
      return null;
    }

    try {
      const tableInstance = await this.bitableInstance.getTable(table.table_id);
      const record = await tableInstance.getRecord(recordId, fieldIds);
      return record;
    } catch (error) {
      console.error('获取记录失败:', error);
      return null;
    }
  }

  /**
   * 添加记录
   */
  async addRecord(fields: Record<string, any>): Promise<FeishuBitableRecord | null> {
    const table = await this.getActiveTable();
    if (!table) {
      return null;
    }

    try {
      const tableInstance = await this.bitableInstance.getTable(table.table_id);
      const record = await tableInstance.addRecord(fields);
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
  ): Promise<FeishuBitableRecord | null> {
    const table = await this.getActiveTable();
    if (!table) {
      return null;
    }

    try {
      const tableInstance = await this.bitableInstance.getTable(table.table_id);
      const record = await tableInstance.updateRecord(recordId, fields);
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
    const table = await this.getActiveTable();
    if (!table) {
      return false;
    }

    try {
      const tableInstance = await this.bitableInstance.getTable(table.table_id);
      await tableInstance.deleteRecord(recordId);
      return true;
    } catch (error) {
      console.error('删除记录失败:', error);
      return false;
    }
  }

  /**
   * 批量操作记录
   */
  async batchUpdateRecords(
    records: Array<{ id: string; fields: Record<string, any> }>
  ): Promise<boolean> {
    const table = await this.getActiveTable();
    if (!table) {
      return false;
    }

    try {
      const tableInstance = await this.bitableInstance.getTable(table.table_id);
      await tableInstance.setRecords(records);
      return true;
    } catch (error) {
      console.error('批量更新记录失败:', error);
      return false;
    }
  }

  /**
   * 检查是否在飞书环境中
   */
  isInFeishu(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).bitable !== 'undefined';
  }
}

// 导出单例
export const feishuSDK = new FeishuBitableSDK();

// 导出类型
export default FeishuBitableSDK;
