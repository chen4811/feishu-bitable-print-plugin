/**
 * 飞书多维表格 SDK - 真实实现
 * 使用 @lark-base-open/js-sdk
 * 
 * 文档: https://lark-base-team.github.io/js-sdk-docs/zh/
 */

// 动态导入类型
type BitableSDK = any;

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
      console.log('[FeishuSDK] SDK 加载成功:', !!bitableInstance);
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
      
      // 获取当前表格
      let table: any = null;
      
      try {
        if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
          table = await bitable.base.getActiveTable();
        } else if (typeof bitable.getActiveTable === 'function') {
          table = await bitable.getActiveTable();
        }
      } catch (err) {
        console.warn('[FeishuSDK] 获取表格失败:', err);
      }
      
      if (!table) {
        console.error('[FeishuSDK] 无法获取表格实例');
        return [];
      }
      
      // 获取字段列表
      let fields: any[] = [];
      
      try {
        if (typeof table.getFieldList === 'function') {
          fields = await table.getFieldList();
        } else if (typeof table.getFieldMetaList === 'function') {
          fields = await table.getFieldMetaList();
        }
      } catch (err) {
        console.warn('[FeishuSDK] 获取字段列表失败:', err);
      }
      
      console.log('[FeishuSDK] 原始字段数据:', fields);
      
      if (!Array.isArray(fields)) {
        return [];
      }
      
      return fields.map((field: any, index: number) => ({
        field_id: field.id || field.field_id || `field_${index}`,
        field_name: field.name || field.field_name || `字段${index + 1}`,
        type: field.type || 1,
        type_name: field.typeName || field.type_name || 'text',
        property: field.property,
      }));
    } catch (error) {
      console.error('[FeishuSDK] 获取字段列表失败:', error);
      return [];
    }
  },

  /**
   * 获取所有记录
   */
  async getAllRecords(): Promise<BitableRecord[]> {
    console.log('[FeishuSDK] 获取所有记录...');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        return [];
      }
      
      // 获取当前表格
      let table: any = null;
      
      try {
        if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
          table = await bitable.base.getActiveTable();
        } else if (typeof bitable.getActiveTable === 'function') {
          table = await bitable.getActiveTable();
        }
      } catch (err) {
        console.warn('[FeishuSDK] 获取表格失败:', err);
      }
      
      if (!table) {
        console.error('[FeishuSDK] 无法获取表格实例');
        return [];
      }
      
      // 获取记录
      let records: any[] = [];
      
      try {
        // 优先使用视图获取
        if (typeof table.getActiveView === 'function') {
          const view = await table.getActiveView();
          if (view) {
            if (typeof view.getRecords === 'function') {
              records = await view.getRecords();
            } else if (typeof view.getAllRecords === 'function') {
              records = await view.getAllRecords();
            }
          }
        }
        
        // 视图方法失败，直接从表格获取
        if (records.length === 0) {
          if (typeof table.getRecords === 'function') {
            records = await table.getRecords();
          } else if (typeof table.getAllRecords === 'function') {
            records = await table.getAllRecords();
          }
        }
      } catch (err) {
        console.warn('[FeishuSDK] 获取记录失败:', err);
      }
      
      console.log('[FeishuSDK] 获取到记录数:', records?.length || 0);
      
      if (!Array.isArray(records)) {
        return [];
      }
      
      return records.map((record: any) => ({
        id: record.id || record.recordId || record.record_id || '',
        fields: record.fields || {},
        createdTime: record.createdTime || record.created_time || new Date().toISOString(),
        lastModifiedTime: record.modifiedTime || record.last_modified_time || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[FeishuSDK] 获取记录列表失败:', error);
      return [];
    }
  },

  /**
   * 监听选中记录变化
   * @param callback 选中变化时的回调函数，返回选中的记录ID列表
   * @returns 取消监听的函数
   */
  onSelectionChange(callback: (recordIds: string[]) => void): () => void {
    console.log('[FeishuSDK] 注册选中变化监听...');

    // 标记是否已清理
    let isUnsubscribed = false;

    const setupListener = async () => {
      try {
        // 检查是否在飞书环境中
        const isInFeishu = typeof window !== 'undefined' && (
          window.location.href.includes('larksuite.com') ||
          window.location.href.includes('feishu.cn') ||
          // @ts-ignore
          (window.bitable !== undefined)
        );

        if (!isInFeishu) {
          console.warn('[FeishuSDK] 不在飞书环境中，监听不可用');
          return;
        }

        const bitable = await getBitable();
        if (!bitable) {
          console.warn('[FeishuSDK] bitable 未初始化，无法监听选中变化');
          return;
        }

        // 尝试注册选中监听
        let unsubscribe: (() => void) | null = null;

        if (bitable.base && typeof bitable.base.onSelectionChange === 'function') {
          unsubscribe = bitable.base.onSelectionChange(async () => {
            if (isUnsubscribed) return;
            console.log('[FeishuSDK] 监听到选中变化');
            await fetchSelectedRecords(callback);
          });
          console.log('[FeishuSDK] 已注册 base.onSelectionChange 监听');
        } else if (typeof bitable.onSelectionChange === 'function') {
          unsubscribe = bitable.onSelectionChange(async () => {
            if (isUnsubscribed) return;
            console.log('[FeishuSDK] 监听到选中变化');
            await fetchSelectedRecords(callback);
          });
          console.log('[FeishuSDK] 已注册 bitable.onSelectionChange 监听');
        } else {
          console.warn('[FeishuSDK] 不支持 onSelectionChange');
        }

        // 初始获取一次选中
        await fetchSelectedRecords(callback);

        // 返回清理函数
        return () => {
          isUnsubscribed = true;
          if (unsubscribe && typeof unsubscribe === 'function') {
            try {
              unsubscribe();
            } catch (e) {
              console.warn('[FeishuSDK] 取消监听失败:', e);
            }
          }
        };
      } catch (error) {
        console.error('[FeishuSDK] 设置选中监听失败:', error);
      }
    };

    // 获取选中的记录
    const fetchSelectedRecords = async (cb: (recordIds: string[]) => void) => {
      try {
        const bitable = await getBitable();
        if (!bitable) return;

        let table: any = null;
        
        try {
          if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
            table = await bitable.base.getActiveTable();
          } else if (typeof bitable.getActiveTable === 'function') {
            table = await bitable.getActiveTable();
          }
        } catch (err) {
          console.warn('[FeishuSDK] 获取表格失败:', err);
        }

        if (!table) return;

        // 尝试获取选中的记录
        let selectedRecordIds: string[] = [];

        try {
          // 方法1: 通过 getSelection 获取
          if (typeof bitable.getSelection === 'function') {
            const selection = await bitable.getSelection();
            console.log('[FeishuSDK] getSelection 结果:', selection);
            
            if (selection && selection.recordIds && Array.isArray(selection.recordIds)) {
              selectedRecordIds = selection.recordIds;
            }
          }
          
          // 方法2: 通过 view.getSelectedRecords 获取
          if (selectedRecordIds.length === 0 && typeof table.getActiveView === 'function') {
            const view = await table.getActiveView();
            if (view && typeof view.getSelectedRecords === 'function') {
              const selectedRecords = await view.getSelectedRecords();
              if (Array.isArray(selectedRecords)) {
                selectedRecordIds = selectedRecords.map((r: any) => r.id || r.recordId);
              }
            }
          }
        } catch (err) {
          console.warn('[FeishuSDK] 获取选中记录失败:', err);
        }

        console.log('[FeishuSDK] 选中的记录ID:', selectedRecordIds);
        cb(selectedRecordIds);
      } catch (error) {
        console.error('[FeishuSDK] 获取选中记录失败:', error);
      }
    };

    let cleanupFn: (() => void) | null = null;
    setupListener().then((cleanup) => {
      cleanupFn = cleanup || null;
    });

    // 返回取消监听的函数
    return () => {
      isUnsubscribed = true;
      if (cleanupFn) {
        cleanupFn();
      }
    };
  },

  /**
   * 根据记录ID列表获取完整的记录数据
   */
  async getRecordsByIds(recordIds: string[]): Promise<BitableRecord[]> {
    console.log('[FeishuSDK] 根据ID获取记录:', recordIds);
    
    if (!recordIds || recordIds.length === 0) {
      return [];
    }

    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        return [];
      }
      
      let table: any = null;
      
      try {
        if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
          table = await bitable.base.getActiveTable();
        } else if (typeof bitable.getActiveTable === 'function') {
          table = await bitable.getActiveTable();
        }
      } catch (err) {
        console.warn('[FeishuSDK] 获取表格失败:', err);
      }
      
      if (!table) {
        return [];
      }

      const records: BitableRecord[] = [];

      // 逐个获取记录
      for (const recordId of recordIds) {
        try {
          let record: any = null;
          
          if (typeof table.getRecord === 'function') {
            record = await table.getRecord(recordId);
          }
          
          if (record) {
            records.push({
              id: record.id || record.recordId || recordId,
              fields: record.fields || {},
              createdTime: record.createdTime || record.created_time || new Date().toISOString(),
              lastModifiedTime: record.modifiedTime || record.last_modified_time || new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn('[FeishuSDK] 获取记录失败:', recordId, err);
        }
      }

      console.log('[FeishuSDK] 成功获取记录数:', records.length);
      return records;
    } catch (error) {
      console.error('[FeishuSDK] 获取记录失败:', error);
      return [];
    }
  },
};

export default feishuSDK;
