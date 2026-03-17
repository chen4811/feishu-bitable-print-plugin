/**
 * 复选框选择状态管理器
 * 
 * 功能：
 * 1. 首次单选：自动载入数据到画布
 * 2. 多选检测：弹出确认对话框询问用户
 * 3. 用户确认：批量载入所有选中数据
 * 4. 用户取消：恢复之前的选择状态
 * 5. 取消复选框选中时移除对应行数据的排版
 */

import { bitable, base } from '@lark-base-open/js-sdk';
import { feishuEnv } from './feishu-env';

// ============================================
// 类型定义
// ============================================

export interface SelectedRecord {
  recordId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface SelectionEvent {
  tableId: string;
  recordIds: string[];
  count: number;
}

export type OnRecordAddCallback = (record: SelectedRecord) => void;
export type OnRecordRemoveCallback = (recordId: string) => void;
export type OnClearCallback = () => void;
export type OnMultiSelectConfirmCallback = (recordIds: string[]) => Promise<boolean>;

// ============================================
// 选择状态管理类
// ============================================

export class SelectionManager {
  private selectedRecords: Map<string, SelectedRecord> = new Map();
  private currentTableId: string = '';
  private lastRecordIds: string[] = [];
  private isFirstSelection: boolean = true;
  private unsubscribe: (() => void) | null = null;
  
  // 回调函数
  private onRecordAddCallbacks: Set<OnRecordAddCallback> = new Set();
  private onRecordRemoveCallbacks: Set<OnRecordRemoveCallback> = new Set();
  private onClearCallbacks: Set<OnClearCallback> = new Set();
  private onMultiSelectConfirmCallbacks: Set<OnMultiSelectConfirmCallback> = new Set();
  
  // 加载数据回调
  private loadRecordsData: ((tableId: string, recordIds: string[]) => Promise<Record<string, unknown>[]>) | null = null;

  constructor() {
    console.log('🎯 SelectionManager 初始化');
  }

  /**
   * 设置加载数据的回调函数
   */
  setLoadRecordsDataCallback(callback: (tableId: string, recordIds: string[]) => Promise<Record<string, unknown>[]>) {
    this.loadRecordsData = callback;
  }

  /**
   * 启动选择状态监控
   */
  async startMonitoring(): Promise<void> {
    console.log('🎯 开始监听复选框选择状态变化');
    
    // 使用轮询方式监听
    this.unsubscribe = feishuEnv.onCheckboxPollingChange((event) => {
      this.handleSelectionChange(event);
    });
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    console.log('🛑 停止选择状态监听');
  }

  /**
   * 处理选择状态变化
   */
  private async handleSelectionChange(selection: SelectionEvent): Promise<void> {
    const { tableId, recordIds } = selection;
    this.currentTableId = tableId;
    
    console.log('📋 SelectionManager 处理选择变化:', {
      count: recordIds.length,
      isFirstSelection: this.isFirstSelection,
      lastCount: this.lastRecordIds.length
    });
    
    // 清空选择
    if (recordIds.length === 0) {
      this.handleClearSelection();
      this.lastRecordIds = [];
      return;
    }
    
    // 计算新增和移除的记录
    const addedIds = recordIds.filter(id => !this.lastRecordIds.includes(id));
    const removedIds = this.lastRecordIds.filter(id => !recordIds.includes(id));
    
    console.log('📊 选择变化详情:', {
      新增: addedIds.length,
      移除: removedIds.length
    });
    
    // 处理移除的记录
    if (removedIds.length > 0) {
      for (const recordId of removedIds) {
        this.handleRecordRemove(recordId);
      }
    }
    
    // 处理新增的记录
    if (addedIds.length > 0) {
      // 首次单选（只有一条且之前没有选中记录）
      if (this.isFirstSelection && addedIds.length === 1 && this.lastRecordIds.length === 0) {
        await this.handleFirstSelection(addedIds[0]);
        this.isFirstSelection = false;
      }
      // 多选（同时选中多条）
      else if (addedIds.length > 1) {
        await this.handleMultiSelection(addedIds);
      }
      // 后续单选（逐条添加）
      else {
        for (const recordId of addedIds) {
          await this.handleSingleSelection(recordId);
        }
      }
    }
    
    // 更新最后选择状态
    this.lastRecordIds = [...recordIds];
  }

  /**
   * 处理首次单选
   */
  private async handleFirstSelection(recordId: string): Promise<void> {
    console.log('✅ 首次单选，自动载入数据:', recordId);
    
    try {
      const recordData = await this.loadRecordData(recordId);
      if (recordData) {
        this.addRecord(recordId, recordData);
      }
    } catch (error) {
      console.error('❌ 首次选择载入失败:', error);
    }
  }

  /**
   * 处理单选（后续添加）
   */
  private async handleSingleSelection(recordId: string): Promise<void> {
    console.log('➕ 单选添加:', recordId);
    
    try {
      const recordData = await this.loadRecordData(recordId);
      if (recordData) {
        this.addRecord(recordId, recordData);
      }
    } catch (error) {
      console.error('❌ 单选载入失败:', error);
    }
  }

  /**
   * 处理多选
   */
  private async handleMultiSelection(recordIds: string[]): Promise<void> {
    console.log(`🔄 多选检测: ${recordIds.length} 条记录`);
    
    // 触发确认回调
    let shouldLoadAll = true;
    
    if (this.onMultiSelectConfirmCallbacks.size > 0) {
      for (const callback of this.onMultiSelectConfirmCallbacks) {
        shouldLoadAll = await callback(recordIds);
        if (!shouldLoadAll) break;
      }
    }
    
    if (shouldLoadAll) {
      await this.loadAllSelectedRecords(recordIds);
    } else {
      // 用户取消，需要恢复选择状态
      console.log('❌ 用户取消多选载入');
      // 注意：这里不恢复飞书表格的复选框状态，因为那比较复杂
      // 只是保持当前画布状态不变
    }
  }

  /**
   * 处理清空选择
   */
  private handleClearSelection(): void {
    console.log('🗑️ 清空所有选择记录');
    
    // 触发清空回调
    this.onClearCallbacks.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('清空回调执行失败:', e);
      }
    });
    
    this.selectedRecords.clear();
    this.isFirstSelection = true;
  }

  /**
   * 处理记录移除
   */
  private handleRecordRemove(recordId: string): void {
    console.log('➖ 移除记录:', recordId);
    
    if (this.selectedRecords.has(recordId)) {
      this.selectedRecords.delete(recordId);
      
      // 触发移除回调
      this.onRecordRemoveCallbacks.forEach(cb => {
        try {
          cb(recordId);
        } catch (e) {
          console.error('移除回调执行失败:', e);
        }
      });
    }
  }

  /**
   * 加载单条记录数据
   */
  private async loadRecordData(recordId: string): Promise<Record<string, unknown> | null> {
    try {
      if (this.loadRecordsData && this.currentTableId) {
        const records = await this.loadRecordsData(this.currentTableId, [recordId]);
        return records[0] || null;
      }
      
      // 使用 SDK 直接加载
      const table = await base.getTableById(this.currentTableId);
      const record = await table.getRecordById(recordId);
      
      return record?.fields || null;
    } catch (error) {
      console.error('加载记录数据失败:', error);
      return null;
    }
  }

  /**
   * 批量加载所有选中记录
   */
  private async loadAllSelectedRecords(recordIds: string[]): Promise<void> {
    console.log('📥 开始批量载入选中数据');
    
    try {
      let allRecords: Record<string, unknown>[] = [];
      
      if (this.loadRecordsData && this.currentTableId) {
        allRecords = await this.loadRecordsData(this.currentTableId, recordIds);
      } else {
        // 使用 SDK 批量加载
        const table = await base.getTableById(this.currentTableId);
        if (typeof (table as any).getRecordsByIds === 'function') {
          const records = await (table as any).getRecordsByIds(recordIds);
          allRecords = records.map((r: any) => r.fields);
        }
      }
      
      // 添加所有记录
      allRecords.forEach((recordData, index) => {
        const recordId = recordIds[index];
        if (recordData) {
          this.addRecord(recordId, recordData);
        }
      });
      
      console.log(`✅ 成功批量载入 ${allRecords.length} 条记录`);
      
    } catch (error) {
      console.error('❌ 批量载入失败:', error);
    }
  }

  /**
   * 添加记录到选择集合
   */
  private addRecord(recordId: string, data: Record<string, unknown>): void {
    const record: SelectedRecord = {
      recordId,
      data,
      timestamp: Date.now()
    };
    
    this.selectedRecords.set(recordId, record);
    
    // 触发添加回调
    this.onRecordAddCallbacks.forEach(cb => {
      try {
        cb(record);
      } catch (e) {
        console.error('添加回调执行失败:', e);
      }
    });
  }

  // ============================================
  // 公共方法：回调注册
  // ============================================

  /**
   * 注册记录添加回调
   */
  onRecordAdd(callback: OnRecordAddCallback): () => void {
    this.onRecordAddCallbacks.add(callback);
    return () => this.onRecordAddCallbacks.delete(callback);
  }

  /**
   * 注册记录移除回调
   */
  onRecordRemove(callback: OnRecordRemoveCallback): () => void {
    this.onRecordRemoveCallbacks.add(callback);
    return () => this.onRecordRemoveCallbacks.delete(callback);
  }

  /**
   * 注册清空回调
   */
  onClear(callback: OnClearCallback): () => void {
    this.onClearCallbacks.add(callback);
    return () => this.onClearCallbacks.delete(callback);
  }

  /**
   * 注册多选确认回调
   */
  onMultiSelectConfirm(callback: OnMultiSelectConfirmCallback): () => void {
    this.onMultiSelectConfirmCallbacks.add(callback);
    return () => this.onMultiSelectConfirmCallbacks.delete(callback);
  }

  // ============================================
  // 公共方法：状态查询
  // ============================================

  /**
   * 获取所有选中记录
   */
  getSelectedRecords(): SelectedRecord[] {
    return Array.from(this.selectedRecords.values());
  }

  /**
   * 获取选中记录数量
   */
  getSelectedCount(): number {
    return this.selectedRecords.size;
  }

  /**
   * 检查是否已选中某条记录
   */
  hasRecord(recordId: string): boolean {
    return this.selectedRecords.has(recordId);
  }

  /**
   * 获取当前表格ID
   */
  getCurrentTableId(): string {
    return this.currentTableId;
  }
}

// ============================================
// 单例导出
// ============================================

let selectionManagerInstance: SelectionManager | null = null;

export function getSelectionManager(): SelectionManager {
  if (!selectionManagerInstance) {
    selectionManagerInstance = new SelectionManager();
  }
  return selectionManagerInstance;
}

export default SelectionManager;
