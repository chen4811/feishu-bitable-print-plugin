/**
 * 飞书多维表格 SDK - 真实实现
 * 使用 @lark-base-open/js-sdk
 * 
 * 文档: https://lark-base-team.github.io/js-sdk-docs/zh/
 */

// 动态导入类型
type BitableSDK = any;

// 字段类型映射
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'text',
  2: 'number',
  3: 'singleSelect',
  4: 'multiSelect',
  5: 'date',
  6: 'checkbox',
  7: 'user',
  8: 'url',
  9: 'phone',
  10: 'email',
  11: 'attachment',
  12: 'formula',
  13: 'progress',
  14: 'currency',
  15: 'rating',
  16: 'location',
  17: 'relation',
  18: 'group',
  19: 'barcode',
  20: 'modifiedTime',
  21: 'createdTime',
  22: 'modifiedUser',
  23: 'createdUser',
  24: 'autoNumber',
};

export interface BitableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
  lastModifiedTime: string;
}

export interface FeishuBitableField {
  field_id: string;
  field_name: string;
  type: number;
  type_name: string;
  property?: any;
}

// SDK 实例缓存
let bitableInstance: BitableSDK = null;
let isInitializing = false;
let initPromise: Promise<boolean> | null = null;

/**
 * 安全获取 bitable 实例
 */
async function getBitable(): Promise<BitableSDK> {
  if (bitableInstance) {
    return bitableInstance;
  }
  
  if (isInitializing && initPromise) {
    await initPromise;
    return bitableInstance;
  }
  
  isInitializing = true;
  initPromise = (async () => {
    try {
      const sdk = await import('@lark-base-open/js-sdk');
      bitableInstance = sdk.bitable || sdk.base;
      return bitableInstance !== null;
    } catch (error) {
      console.error('[FeishuSDK] 加载 SDK 失败:', error);
      return false;
    } finally {
      isInitializing = false;
    }
  })();
  
  await initPromise;
  return bitableInstance;
}

/**
 * 飞书 Bitable SDK 实例
 */
export const feishuSDK = {
  /**
   * 检查是否在飞书环境中
   */
  isFeishuEnvironment(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    // 检查是否在 iframe 中
    const inIframe = window.self !== window.top;
    
    // 检查飞书相关全局变量
    const hasLarkGlobal = !!(window as any).lark || 
                          !!(window as any).Lark ||
                          !!(window as any).__LARK_BASE__;
    
    // 检查 URL 参数
    const urlHasFeishu = window.location.href.includes('feishu') ||
                         window.location.href.includes('lark') ||
                         window.location.href.includes('bytedance');
    
    const result = inIframe && (hasLarkGlobal || urlHasFeishu);
    console.log('[FeishuSDK] 环境检测:', { inIframe, hasLarkGlobal, urlHasFeishu, result });
    
    return result;
  },

  /**
   * 初始化 SDK
   */
  async init(): Promise<boolean> {
    console.log('[FeishuSDK] 开始初始化...');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        console.error('[FeishuSDK] bitable 为空');
        return false;
      }
      
      console.log('[FeishuSDK] bitable 获取成功');
      console.log('[FeishuSDK] bitable 可用方法:', Object.keys(bitable).filter(k => typeof bitable[k] === 'function'));
      
      return true;
    } catch (error) {
      console.error('[FeishuSDK] 初始化失败:', error);
      return false;
    }
  },

  /**
   * 获取字段列表
   */
  async getFields(): Promise<FeishuBitableField[]> {
    console.log('[FeishuSDK] 获取字段列表...');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        console.error('[FeishuSDK] bitable 为空，无法获取字段');
        return [];
      }
      
      // 获取表格
      let table: any = null;
      
      // 方法1: base.getActiveTable
      if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
        console.log('[FeishuSDK] 使用 bitable.base.getActiveTable');
        table = await bitable.base.getActiveTable();
      }
      // 方法2: getActiveTable 直接调用
      else if (typeof bitable.getActiveTable === 'function') {
        console.log('[FeishuSDK] 使用 bitable.getActiveTable');
        table = await bitable.getActiveTable();
      }
      // 方法3: getTable
      else if (typeof bitable.getTable === 'function') {
        console.log('[FeishuSDK] 使用 bitable.getTable');
        try {
          const selection = await bitable.getSelection();
          if (selection?.tableId) {
            table = await bitable.getTable(selection.tableId);
          }
        } catch (e) {
          // 尝试不带参数调用
          table = await bitable.getTable();
        }
      }
      
      if (!table) {
        console.error('[FeishuSDK] 无法获取表格实例');
        return [];
      }
      
      console.log('[FeishuSDK] 表格获取成功:', table);
      console.log('[FeishuSDK] 表格可用方法:', Object.keys(table).filter(k => typeof table[k] === 'function'));
      
      // 获取字段列表
      let fields: any[] = [];
      
      if (typeof table.getFieldList === 'function') {
        fields = await table.getFieldList();
      } else if (typeof table.getFieldMetaList === 'function') {
        fields = await table.getFieldMetaList();
      } else if (typeof table.getFields === 'function') {
        fields = await table.getFields();
      } else if (table.fields) {
        fields = table.fields;
      }
      
      console.log('[FeishuSDK] 原始字段数据:', fields);
      
      if (!Array.isArray(fields)) {
        console.error('[FeishuSDK] 字段格式不正确');
        return [];
      }
      
      return fields.map((field: any, index: number) => ({
        field_id: field.id || field.field_id || `field_${index}`,
        field_name: field.name || field.field_name || `字段${index + 1}`,
        type: field.type || 1,
        type_name: FIELD_TYPE_MAP[field.type || 1] || 'text',
        property: field.property,
      }));
    } catch (error) {
      console.error('[FeishuSDK] 获取字段列表失败:', error);
      return [];
    }
  },

  /**
   * 获取记录列表
   */
  async getRecords(): Promise<{
    records: BitableRecord[];
    hasMore: boolean;
  }> {
    console.log('[FeishuSDK] 获取记录列表...');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        return { records: [], hasMore: false };
      }
      
      // 获取表格
      let table: any = null;
      
      if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
        table = await bitable.base.getActiveTable();
      } else if (typeof bitable.getActiveTable === 'function') {
        table = await bitable.getActiveTable();
      } else if (typeof bitable.getTable === 'function') {
        try {
          const selection = await bitable.getSelection();
          if (selection?.tableId) {
            table = await bitable.getTable(selection.tableId);
          }
        } catch {
          table = await bitable.getTable();
        }
      }
      
      if (!table) {
        console.error('[FeishuSDK] 无法获取表格实例');
        return { records: [], hasMore: false };
      }
      
      // 获取记录
      let records: any[] = [];
      
      // 方法1: 通过视图获取
      if (typeof table.getActiveView === 'function') {
        const view = await table.getActiveView();
        if (view) {
          if (typeof view.getAllRecords === 'function') {
            records = await view.getAllRecords();
          } else if (typeof view.getRecords === 'function') {
            records = await view.getRecords();
          }
        }
      }
      // 方法2: 直接从表格获取
      else if (typeof table.getAllRecords === 'function') {
        records = await table.getAllRecords();
      } else if (typeof table.getRecords === 'function') {
        records = await table.getRecords();
      } else if (typeof table.getRecordIdList === 'function') {
        const recordIds = await table.getRecordIdList();
        // 逐个获取记录（性能较差但兼容性好）
        for (const id of recordIds.slice(0, 100)) {
          try {
            const record = await table.getRecord(id);
            if (record) {
              records.push(record);
            }
          } catch (e) {
            console.warn('[FeishuSDK] 获取记录失败:', id, e);
          }
        }
      }
      
      console.log('[FeishuSDK] 获取到记录数:', records?.length || 0);
      
      if (!Array.isArray(records)) {
        return { records: [], hasMore: false };
      }
      
      return {
        records: records.map((record: any) => ({
          id: record.id || record.recordId || record.record_id || '',
          fields: record.fields || {},
          createdTime: record.createdTime || record.created_time || new Date().toISOString(),
          lastModifiedTime: record.modifiedTime || record.last_modified_time || new Date().toISOString(),
        })),
        hasMore: false,
      };
    } catch (error) {
      console.error('[FeishuSDK] 获取记录列表失败:', error);
      return { records: [], hasMore: false };
    }
  },

  /**
   * 添加记录
   */
  async addRecord(fields: Record<string, unknown>): Promise<BitableRecord | null> {
    console.log('[FeishuSDK] 添加记录...');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        return null;
      }
      
      let table: any = null;
      
      if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
        table = await bitable.base.getActiveTable();
      } else if (typeof bitable.getActiveTable === 'function') {
        table = await bitable.getActiveTable();
      } else if (typeof bitable.getTable === 'function') {
        table = await bitable.getTable();
      }
      
      if (!table || typeof table.addRecord !== 'function') {
        console.error('[FeishuSDK] 表格不支持添加记录');
        return null;
      }
      
      const recordId = await table.addRecord({ fields });
      
      return {
        id: recordId || '',
        fields,
        createdTime: new Date().toISOString(),
        lastModifiedTime: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[FeishuSDK] 添加记录失败:', error);
      return null;
    }
  },

  /**
   * 更新记录
   */
  async updateRecord(recordId: string, fields: Record<string, unknown>): Promise<BitableRecord | null> {
    console.log('[FeishuSDK] 更新记录:', recordId);
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        return null;
      }
      
      let table: any = null;
      
      if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
        table = await bitable.base.getActiveTable();
      } else if (typeof bitable.getActiveTable === 'function') {
        table = await bitable.getActiveTable();
      } else if (typeof bitable.getTable === 'function') {
        table = await bitable.getTable();
      }
      
      if (!table) {
        return null;
      }
      
      if (typeof table.updateRecord === 'function') {
        await table.updateRecord(recordId, { fields });
      } else if (typeof table.setCellValue === 'function') {
        // 逐个字段更新
        for (const [fieldId, value] of Object.entries(fields)) {
          await table.setCellValue(recordId, fieldId, value);
        }
      }
      
      return { 
        id: recordId, 
        fields,
        createdTime: new Date().toISOString(),
        lastModifiedTime: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[FeishuSDK] 更新记录失败:', error);
      return null;
    }
  },

  /**
   * 删除记录
   */
  async deleteRecord(recordId: string): Promise<boolean> {
    console.log('[FeishuSDK] 删除记录:', recordId);
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        return false;
      }
      
      let table: any = null;
      
      if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
        table = await bitable.base.getActiveTable();
      } else if (typeof bitable.getActiveTable === 'function') {
        table = await bitable.getActiveTable();
      } else if (typeof bitable.getTable === 'function') {
        table = await bitable.getTable();
      }
      
      if (!table || typeof table.deleteRecord !== 'function') {
        return false;
      }
      
      await table.deleteRecord(recordId);
      return true;
    } catch (error) {
      console.error('[FeishuSDK] 删除记录失败:', error);
      return false;
    }
  },
};

export default feishuSDK;
