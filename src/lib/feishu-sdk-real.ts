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

export interface SelectionInfo {
  baseId: string | null;
  fieldId: string | null;
  recordId: string | null;
  tableId: string | null;
  viewId: string | null;
}

export interface SelectionChangeEvent {
  data: SelectionInfo;
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
    console.log('[FeishuSDK] ======== 开始初始化 ========');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        console.error('[FeishuSDK] ❌ bitable 为空');
        return false;
      }
      
      console.log('[FeishuSDK] ✅ bitable 获取成功');
      console.log('[FeishuSDK] bitable 对象方法:', Object.keys(bitable).filter(k => typeof bitable[k] === 'function'));
      
      if (bitable.base) {
        console.log('[FeishuSDK] bitable.base 方法:', Object.keys(bitable.base).filter(k => typeof bitable.base[k] === 'function'));
      }

      // 初始化后立即获取一次选中信息
      console.log('[FeishuSDK] 初始化后立即获取选中信息...');
      const initialSelection = await this.getSelection();
      console.log('[FeishuSDK] 初始化时的选中信息:', initialSelection);

      if (initialSelection?.recordId) {
        console.log('[FeishuSDK] 初始化时发现已选中记录，获取记录数据...');
        const initialRecords = await this.getSelectedRecords();
        console.log('[FeishuSDK] 初始化时获取到的记录:', initialRecords);
      }
      
      console.log('[FeishuSDK] ======== 初始化完成 ========');
      return true;
    } catch (error) {
      console.error('[FeishuSDK] ❌ 初始化失败:', error);
      return false;
    }
  },

  /**
   * 获取当前选中信息
   */
  async getSelection(): Promise<SelectionInfo | null> {
    console.log('[FeishuSDK] ======== getSelection() 开始 ========');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        console.error('[FeishuSDK] ❌ bitable 为空');
        return null;
      }

      console.log('[FeishuSDK] 尝试 bitable.base.getSelection()...');
      let selection: SelectionInfo | null = null;
      
      if (bitable.base && typeof bitable.base.getSelection === 'function') {
        console.log('[FeishuSDK] ✅ 使用 bitable.base.getSelection()');
        selection = await bitable.base.getSelection();
        console.log('[FeishuSDK] bitable.base.getSelection() 返回值:', selection);
      } else if (typeof bitable.getSelection === 'function') {
        console.log('[FeishuSDK] ✅ 使用 bitable.getSelection()');
        selection = await bitable.getSelection();
        console.log('[FeishuSDK] bitable.getSelection() 返回值:', selection);
      } else {
        console.warn('[FeishuSDK] ⚠️  没有找到 getSelection() 方法');
        console.warn('[FeishuSDK] bitable 可用方法:', Object.keys(bitable).filter(k => typeof bitable[k] === 'function'));
        if (bitable.base) {
          console.warn('[FeishuSDK] bitable.base 可用方法:', Object.keys(bitable.base).filter(k => typeof bitable.base[k] === 'function'));
        }
      }
      
      console.log('[FeishuSDK] ======== getSelection() 结束 ========');
      return selection;
    } catch (error) {
      console.error('[FeishuSDK] ❌ getSelection() 失败:', error);
      console.error('[FeishuSDK] 错误堆栈:', error instanceof Error ? error.stack : error);
      return null;
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
   * 获取视图中选中的记录
   */
  async getSelectedRecords(): Promise<BitableRecord[]> {
    console.log('[FeishuSDK] ======== getSelectedRecords() 开始 ========');
    
    try {
      const bitable = await getBitable();
      
      if (!bitable) {
        console.error('[FeishuSDK] ❌ bitable 为空');
        return [];
      }
      
      console.log('[FeishuSDK] 获取当前表格...');
      let table: any = null;
      
      try {
        if (bitable.base && typeof bitable.base.getActiveTable === 'function') {
          console.log('[FeishuSDK] ✅ 使用 bitable.base.getActiveTable()');
          table = await bitable.base.getActiveTable();
        } else if (typeof bitable.getActiveTable === 'function') {
          console.log('[FeishuSDK] ✅ 使用 bitable.getActiveTable()');
          table = await bitable.getActiveTable();
        } else {
          console.warn('[FeishuSDK] ⚠️  没有找到 getActiveTable() 方法');
        }
      } catch (err) {
        console.error('[FeishuSDK] ❌ 获取表格失败:', err);
      }
      
      if (!table) {
        console.error('[FeishuSDK] ❌ table 为空');
        return [];
      }
      
      console.log('[FeishuSDK] ✅ 表格获取成功，table 可用方法:', Object.keys(table).filter(k => typeof table[k] === 'function'));

      let selectedRecords: any[] = [];
      
      // 方法1: 尝试视图的 getSelectedRecords
      console.log('[FeishuSDK] 【方法1】尝试视图的 getSelectedRecords...');
      try {
        if (typeof table.getActiveView === 'function') {
          console.log('[FeishuSDK] ✅ 使用 table.getActiveView()');
          const view = await table.getActiveView();
          console.log('[FeishuSDK] 视图获取成功，view 可用方法:', Object.keys(view).filter(k => typeof view[k] === 'function'));
          
          if (view && typeof view.getSelectedRecords === 'function') {
            console.log('[FeishuSDK] ✅ 调用 view.getSelectedRecords()');
            selectedRecords = await view.getSelectedRecords();
            console.log('[FeishuSDK] ✅ view.getSelectedRecords() 返回:', selectedRecords);
            
            if (selectedRecords && selectedRecords.length > 0) {
              console.log('[FeishuSDK] ✅ 【方法1】成功获取到选中记录');
            }
          } else {
            console.warn('[FeishuSDK] ⚠️  没有 view.getSelectedRecords() 方法');
          }
        }
      } catch (err) {
        console.error('[FeishuSDK] ❌ 【方法1】失败:', err);
      }

      // 方法2: 如果方法1没获取到，尝试获取所有记录
      if (selectedRecords.length === 0) {
        console.log('[FeishuSDK] 【方法2】方法1失败，尝试获取所有记录...');
        try {
          let allRecords: any[] = [];
          
          if (typeof table.getActiveView === 'function') {
            const view = await table.getActiveView();
            if (view) {
              if (typeof view.getRecords === 'function') {
                allRecords = await view.getRecords();
              } else if (typeof view.getAllRecords === 'function') {
                allRecords = await view.getAllRecords();
              }
            }
          }
          
          if (!allRecords || allRecords.length === 0) {
            if (typeof table.getRecords === 'function') {
              allRecords = await table.getRecords();
            } else if (typeof table.getAllRecords === 'function') {
              allRecords = await table.getAllRecords();
            }
          }
          
          if (allRecords && allRecords.length > 0) {
            console.log('[FeishuSDK] ✅ 【方法2】获取到所有记录，共', allRecords.length, '条，默认使用第一条');
            selectedRecords = [allRecords[0]];
          } else {
            console.warn('[FeishuSDK] ⚠️  【方法2】也没有获取到记录');
          }
        } catch (err) {
          console.error('[FeishuSDK] ❌ 【方法2】失败:', err);
        }
      }

      // 方法3: 如果还没有，尝试通过 getSelection + getRecord
      if (selectedRecords.length === 0) {
        console.log('[FeishuSDK] 【方法3】尝试 getSelection + getRecord...');
        const selection = await this.getSelection();
        console.log('[FeishuSDK] getSelection() 返回:', selection);
        
        if (selection?.recordId) {
          console.log('[FeishuSDK] 发现 recordId:', selection.recordId);
          try {
            if (typeof table.getRecord === 'function') {
              const singleRecord = await table.getRecord(selection.recordId);
              if (singleRecord) {
                selectedRecords = [singleRecord];
                console.log('[FeishuSDK] ✅ 【方法3】成功获取单条记录');
              }
            }
          } catch (err) {
            console.error('[FeishuSDK] ❌ 【方法3】失败:', err);
          }
        }
      }

      console.log('[FeishuSDK] 最终 selectedRecords:', selectedRecords);
      
      if (!Array.isArray(selectedRecords)) {
        console.error('[FeishuSDK] ❌ selectedRecords 不是数组');
        return [];
      }

      const result = selectedRecords.map((record: any) => ({
        id: record.id || record.recordId || record.record_id || '',
        fields: record.fields || {},
        createdTime: record.createdTime || record.created_time || new Date().toISOString(),
        lastModifiedTime: record.modifiedTime || record.last_modified_time || new Date().toISOString(),
      }));
      
      console.log('[FeishuSDK] ✅ 格式化后的结果:', result);
      console.log('[FeishuSDK] ======== getSelectedRecords() 结束 ========');
      return result;
    } catch (error) {
      console.error('[FeishuSDK] ❌ getSelectedRecords() 失败:', error);
      console.error('[FeishuSDK] 错误堆栈:', error instanceof Error ? error.stack : error);
      console.log('[FeishuSDK] ======== getSelectedRecords() 结束 ========');
      return [];
    }
  },

  /**
   * 监听选中变化事件
   * @param callback 选中变化时的回调函数
   * @returns 取消监听的函数
   */
  onSelectionChange(callback: (event: SelectionChangeEvent) => void): () => void {
    console.log('[FeishuSDK] ======== onSelectionChange() 开始 ========');

    // 标记是否已清理
    let isUnsubscribed = false;

    const setupListener = async () => {
      try {
        console.log('[FeishuSDK] 开始设置监听...');
        
        // 检查是否在飞书环境中
        const isInFeishu = typeof window !== 'undefined' && (
          window.location.href.includes('larksuite.com') ||
          window.location.href.includes('feishu.cn') ||
          // @ts-ignore
          (window.bitable !== undefined)
        );

        console.log('[FeishuSDK] 飞书环境检测:', isInFeishu);

        if (!isInFeishu) {
          console.warn('[FeishuSDK] ⚠️  不在飞书环境中，监听不可用');
          return;
        }

        const bitable = await getBitable();
        if (!bitable) {
          console.warn('[FeishuSDK] ⚠️  bitable 未初始化，无法监听选中变化');
          return;
        }

        console.log('[FeishuSDK] bitable 获取成功，准备注册监听...');

        // 尝试注册选中监听
        let unsubscribe: (() => void) | null = null;

        if (bitable.base && typeof bitable.base.onSelectionChange === 'function') {
          console.log('[FeishuSDK] ✅ 注册 bitable.base.onSelectionChange 监听');
          unsubscribe = bitable.base.onSelectionChange((event: SelectionChangeEvent) => {
            if (isUnsubscribed) {
              console.log('[FeishuSDK] 已取消订阅，忽略事件');
              return;
            }
            console.log('[FeishuSDK] ======== 监听到选中变化事件 ========');
            console.log('[FeishuSDK] 事件数据:', event);
            console.log('[FeishuSDK] ==========================================');
            callback(event);
          });
          console.log('[FeishuSDK] ✅ base.onSelectionChange 监听注册成功');
        } else if (typeof bitable.onSelectionChange === 'function') {
          console.log('[FeishuSDK] ✅ 注册 bitable.onSelectionChange 监听');
          unsubscribe = bitable.onSelectionChange((event: SelectionChangeEvent) => {
            if (isUnsubscribed) {
              console.log('[FeishuSDK] 已取消订阅，忽略事件');
              return;
            }
            console.log('[FeishuSDK] ======== 监听到选中变化事件 ========');
            console.log('[FeishuSDK] 事件数据:', event);
            console.log('[FeishuSDK] ==========================================');
            callback(event);
          });
          console.log('[FeishuSDK] ✅ bitable.onSelectionChange 监听注册成功');
        } else {
          console.warn('[FeishuSDK] ⚠️  不支持 onSelectionChange');
          console.warn('[FeishuSDK] bitable 可用方法:', Object.keys(bitable).filter(k => typeof bitable[k] === 'function'));
          if (bitable.base) {
            console.warn('[FeishuSDK] bitable.base 可用方法:', Object.keys(bitable.base).filter(k => typeof bitable.base[k] === 'function'));
          }
        }

        // 返回清理函数
        return () => {
          isUnsubscribed = true;
          console.log('[FeishuSDK] 执行取消监听...');
          if (unsubscribe && typeof unsubscribe === 'function') {
            try {
              unsubscribe();
              console.log('[FeishuSDK] ✅ 取消监听成功');
            } catch (e) {
              console.warn('[FeishuSDK] ⚠️  取消监听失败:', e);
            }
          }
        };
      } catch (error) {
        console.error('[FeishuSDK] ❌ 设置选中监听失败:', error);
        console.error('[FeishuSDK] 错误堆栈:', error instanceof Error ? error.stack : error);
      }
    };

    let cleanupFn: (() => void) | null = null;
    setupListener().then((cleanup) => {
      cleanupFn = cleanup || null;
      console.log('[FeishuSDK] ======== onSelectionChange() 设置完成 ========');
    });

    // 返回取消监听的函数
    return () => {
      isUnsubscribed = true;
      console.log('[FeishuSDK] 调用返回的取消监听函数...');
      if (cleanupFn) {
        cleanupFn();
      }
    };
  },
};

export default feishuSDK;
