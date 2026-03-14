'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEditorStore } from '@/store/editorStore';
import { useTemplateStore, UserTemplate } from '@/store/templateStore';
import { ComponentType, PAGE_SIZES, TextComponent } from '@/types/editor';
import {
  Database,
  LayoutGrid,
  Settings,
  Printer,
  Trash2,
  Undo2,
  Redo2,
  FileText,
  Save,
  Download,
  Eye,
  CheckCircle2,
  Loader2,
  Clock,
} from 'lucide-react';
import { TextToolbar } from './TextToolbar';
import { AdvancedToolbar } from './table/AdvancedToolbar';
import { HeaderFooterSettingsDialog } from './dialogs/HeaderFooterSettingsDialog';
import { ComponentTextStyle, TextCanvasNode } from '@/types/editor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataSourcePanel } from './panels/DataSourcePanel';
import { ComponentPanel } from './panels/ComponentPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { CanvasArea } from './canvas/CanvasArea';
import { PageSettingsDialog } from './dialogs/PageSettingsDialog';
import { PrintPreviewDialog } from './dialogs/PrintPreviewDialog';
import { usePrintSDK } from '@/hooks/usePrintSDK';
import { feishuEnv } from '@/lib/feishu-env';

/**
 * 为记录的附件字段获取真实的可访问URL
 * @param recordId 记录ID
 * @param tableId 表格ID
 * @param fields 字段数据
 * @param fieldMetaList 字段元数据列表
 * @returns 注入真实URL后的字段数据
 */
const enrichAttachmentUrls = async (
  recordId: string,
  tableId: string,
  fields: Record<string, any>,
  fieldMetaList: any[]
): Promise<Record<string, any>> => {
  console.log('[AttachmentEnrich-Start] 开始处理记录:', recordId);
  console.log('[AttachmentEnrich-Debug] 字段元数据列表:', fieldMetaList.map(f => ({ name: f.name, id: f.id, type: f.type })));
  console.log('[AttachmentEnrich-Debug] 输入字段数据键:', Object.keys(fields));
  
  const enrichedFields = { ...fields };
  
  // 【修复】附件字段类型是 17，不是 11（11是人员字段）
  const attachmentFields = fieldMetaList.filter(f => {
    const typeNum = Number(f.type);
    const isAttachmentType = typeNum === 17; // 17 = Attachment
    const isTypeName = f.type === 'attachment' || f.type === 'Attachment';
    
    if (isAttachmentType || isTypeName) {
      console.log('[AttachmentEnrich-Found] 发现附件字段:', f.name, 'ID:', f.id, 'type:', f.type);
      return true;
    }
    return false;
  });
  
  console.log('[AttachmentEnrich-Result] 找到附件字段数量:', attachmentFields.length);
  
  if (attachmentFields.length === 0) {
    console.warn('[AttachmentEnrich-Warn] 没有找到附件字段，跳过处理');
    return enrichedFields;
  }
  
  try {
    console.log('[AttachmentEnrich-Call] 开始获取 bitable 实例...');
    const { bitable } = await import('@lark-base-open/js-sdk');
    const base = await bitable.base;
    console.log('[AttachmentEnrich-Call] 开始获取 table 实例，tableId:', tableId);
    const table = await base.getTable(tableId);
    console.log('[AttachmentEnrich-Call] 成功获取 table 实例');
    
    for (const fieldMeta of attachmentFields) {
      const fieldName = fieldMeta.name;
      const fieldId = fieldMeta.id;
      
      console.log(`[AttachmentEnrich-Debug] 检查字段 ${fieldName} (ID: ${fieldId})`);
      console.log(`[AttachmentEnrich-Debug] enrichedFields 可用键:`, Object.keys(enrichedFields).slice(0, 10));
      console.log(`[AttachmentEnrich-Debug] 尝试读取 enrichedFields['${fieldId}'] =`, enrichedFields[fieldId]);
      
      // 【关键】尝试用ID和name都读取一遍，使用能获取到数据的那个
      const byId = enrichedFields[fieldId];
      const byName = enrichedFields[fieldName];
      console.log(`[AttachmentEnrich-Debug] 通过ID读取['${fieldId}']:`, Array.isArray(byId) ? `数组(${byId.length})` : typeof byId);
      console.log(`[AttachmentEnrich-Debug] 通过Name读取['${fieldName}']:`, Array.isArray(byName) ? `数组(${byName.length})` : typeof byName);
      
      // 【关键】选择实际有数据的键名（优先ID，如果没有则尝试Name）
      let actualKey = fieldId;
      let fieldValue = byId;
      
      if (!Array.isArray(fieldValue) && Array.isArray(byName)) {
        console.log(`[AttachmentEnrich-Fix] 数据使用字段名称作为键，切换到 '${fieldName}'`);
        actualKey = fieldName;
        fieldValue = byName;
      }
      
      console.log(`[AttachmentEnrich-Debug] 字段 ${fieldName} (${actualKey}) 值类型:`, typeof fieldValue, ', 是否数组:', Array.isArray(fieldValue));
      
      // 【关键】如果 fields 中没有附件数据，通过字段对象获取
      if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
        console.log(`[AttachmentEnrich] 字段 ${fieldName} 在 record.fields 中不存在，尝试通过字段对象获取...`);
        try {
          const field = await table.getField(fieldId);
          // 获取字段值
          const fieldCellValue = await field.getValue(recordId);
          console.log(`[AttachmentEnrich] 通过 field.getValue() 获取到:`, Array.isArray(fieldCellValue) ? `数组(${fieldCellValue.length})` : typeof fieldCellValue);
          
          if (Array.isArray(fieldCellValue) && fieldCellValue.length > 0) {
            fieldValue = fieldCellValue;
            console.log(`[AttachmentEnrich] 成功获取附件数据，包含 ${fieldValue.length} 个附件`);
          } else {
            console.warn(`[AttachmentEnrich-Warn] 字段 ${fieldName} 通过 field.getValue() 也未获取到有效数据`);
            continue;
          }
        } catch (err) {
          console.error(`[AttachmentEnrich] 通过字段对象获取 ${fieldName} 失败:`, err);
          continue;
        }
      }
      
      if (fieldValue.length === 0) {
        console.warn(`[AttachmentEnrich-Warn] 字段 ${fieldName} 的值为空数组，跳过`);
        continue;
      }
      
      console.log(`[AttachmentEnrich-Call] 字段 ${fieldName} 包含 ${fieldValue.length} 个附件，准备调用 getAttachmentUrls`);
      console.log(`[AttachmentEnrich-Debug] 第一个附件数据:`, JSON.stringify(fieldValue[0]).substring(0, 200));
      
      // 【核心修复】保存原始值用于后续合并
      const originalValue = enrichedFields[actualKey];
      
      // 安全检查：确保原始值是数组
      if (!Array.isArray(originalValue) || originalValue.length === 0) {
        console.warn(`[AttachmentEnrich-Warn] 字段 ${fieldName} 的原始值不是有效数组`);
        continue;
      }
      
      try {
        const field = await table.getField(fieldId);
        console.log(`[AttachmentEnrich-Call] 成功获取字段实例 ${fieldId}，准备调用 getAttachmentUrls`);
        
        // 调用 getAttachmentUrls 获取真实URL（返回 string[]）
        const urlList: string[] = await (field as any).getAttachmentUrls(recordId);
        
        console.log(`[Merge-Debug] 字段 ${fieldName}: 原始数量 ${originalValue.length}, URL数量 ${urlList?.length || 0}`);
        
        if (urlList && urlList.length > 0) {
          // 【核心修复】按索引严格合并 - 飞书保证 urlList 顺序与 originalValue 一致
          const enrichedValue = originalValue.map((fileItem: any, index: number) => {
            const targetUrl = urlList[index];
            
            // 只有当 URL 存在时才注入，防止覆盖原有数据
            if (targetUrl) {
              return {
                ...fileItem,
                url: targetUrl,        // 标准字段
                fileUrl: targetUrl,    // 兼容别名
                downloadUrl: targetUrl // 备用别名
              };
            }
            // 如果没有对应的 URL (比如权限问题)，保留原样但打印警告
            console.warn(`[Merge-Warn] 索引 ${index} 的文件 ${fileItem.name} 未获取到 URL`);
            return fileItem;
          });
          
          // 更新增强后的数据
          enrichedFields[actualKey] = enrichedValue;
          
          console.log(`[Merge-Success] 字段 ${fieldName} 注入完成，样例:`, {
            name: enrichedValue[0]?.name,
            hasUrl: !!enrichedValue[0]?.url,
            url: enrichedValue[0]?.url?.substring(0, 80)
          });
        } else {
          console.warn(`[AttachmentEnrich-Warn] 字段 ${fieldName} 未返回任何 URL`);
        }
      } catch (error) {
        console.error(`[AttachmentEnrich-Error] 处理字段 ${fieldName} 失败:`, error);
      }
    }
  } catch (error) {
    console.error('[AttachmentEnrich-Error] 获取附件URL失败:', error);
  }
  
  console.log('[AttachmentEnrich-End] 处理完成，返回 enrichedFields');
  return enrichedFields;
};

interface EditorPageProps {
  onExit: () => void;
}

// 左侧面板标签
type LeftPanelTab = 'data' | 'components' | 'settings';

export function EditorPage({ onExit }: EditorPageProps) {
  const [activeTab, setActiveTab] = useState<LeftPanelTab>('data');
  const [isPageSettingsOpen, setIsPageSettingsOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: string; data?: unknown } | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<UserTemplate | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [initialEditorState, setInitialEditorState] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { 
    templates, 
    currentTemplate: storeCurrentTemplate,
    saveTemplate,
    updateTemplate,
    isLoading: isStoreLoading 
  } = useTemplateStore();

  // 🔥 使用飞书SDK获取数据（feishu-env)
  const isFeishuEnvironment = feishuEnv.isFeishuEnvironment();
  const [feishuRecords, setFeishuRecords] = useState<any[]>([]);
  const [feishuFields, setFeishuFields] = useState<any[]>([]);
  const [feishuLoading, setFeishuLoading] = useState(false);
  
  // 使用 ref 存储字段元数据和表格ID，避免触发 useEffect 重新执行
  const fieldMetaListRef = useRef<any[]>([]);
  const tableIdRef = useRef<string>('');
  
  // 当前表格信息
  const [currentTableInfo, setCurrentTableInfo] = useState<{
    tableId: string | null;
    tableName: string | null;
    baseId: string | null;
  }>({ tableId: null, tableName: null, baseId: null });

  const {
    templateName,
    setTemplateName,
    pageConfig,
    styleConfig,
    components,
    selectedComponentId,
    addComponent,
    updateComponent,
    undo,
    redo,
    clearCanvas,
    history,
    historyIndex,
    tableEditing,
    setTableEditing,
    tableCellEditing,
    setTableCellEditing,
    setRecords,
    setFeishuEnvironment,
    fields: storeFields,
    setFields,
    loadTemplateFromData,
  } = useEditorStore();

  // 从 feishu-env 获取数据并监听点击行
  useEffect(() => {
    const init = async () => {
      // 先初始化 SDK
      const isReady = await feishuEnv.init();
      
      if (!isReady) {
        console.log('[EditorPage] 不在飞书环境，跳过');
        return;
      }

      console.log('[EditorPage] ======== 初始化飞书环境 ========');
      setFeishuEnvironment(true);

      // 初始化数据
      try {
        setFeishuLoading(true);
        
        // 获取当前表格信息
        const { base } = await import('@lark-base-open/js-sdk');
        const selection = await base.getSelection();
        const tableName = await feishuEnv.fetchTableName();
        setCurrentTableInfo({
          tableId: selection?.tableId || null,
          tableName: tableName,
          baseId: selection?.baseId || null,
        });
        console.log('[EditorPage] 当前表格信息:', { tableId: selection?.tableId, tableName });
        
        // 1. 获取字段
        console.log('[EditorPage] 获取字段...');
        const fields = await feishuEnv.fetchFields();
        console.log('[EditorPage] 获取到字段:', fields);
        
        // 转换字段格式
        const appFields = fields.map((field: any) => ({
          id: field.id,
          name: field.name,
          type: field.type,
          placeholder: `[${field.name}]`,
          isSystem: false,
        }));
        setFeishuFields(fields);
        setFields(appFields);
        
        // 【关键】将字段元数据和表格ID存储到 ref，供 onSelectionChange 使用
        fieldMetaListRef.current = fields;
        tableIdRef.current = selection?.tableId || '';
        console.log('[EditorPage] 字段元数据已存储到 ref，表格ID:', tableIdRef.current);

        // 2. 默认获取第一条记录
        console.log('[EditorPage] 获取第一条记录...');
        const records = await feishuEnv.getSelectedRecords();
        console.log('[EditorPage] 获取到记录:', records);
        
        if (records.length > 0) {
          console.log('[EditorPage] ========== 开始处理记录附件 ==========');
          // 【关键】为每条记录获取附件URL并转换格式
          const enrichedRecords: any[] = [];
          
          for (let index = 0; index < records.length; index++) {
            const record = records[index];
            console.log(`[EditorPage] 处理记录 ${index}/${records.length}, ID:`, record.id);
            console.log(`[EditorPage] 记录原始字段键:`, Object.keys(record.fields || {}));
            
            // 【关键】获取附件字段的真实URL
            console.log(`[EditorPage] 调用 enrichAttachmentUrls for record ${record.id}`);
            const enrichedFields = await enrichAttachmentUrls(
              record.id,
              selection?.tableId || '',
              record.fields,
              fields
            );
            
            console.log(`[EditorPage] enrichAttachmentUrls 返回，检查字段键:`, Object.keys(enrichedFields));
            
            // 检查附件字段是否被处理
            const attachmentField = fields.find(f => Number(f.type) === 17 || f.type === 'attachment');
            if (attachmentField) {
              const originalValue = record.fields[attachmentField.id] as any[];
              const enrichedValue = enrichedFields[attachmentField.id] as any[];
              console.log(`[EditorPage] 附件字段 ${attachmentField.name} 处理前后对比:`);
              console.log(`  - 原始:`, originalValue?.[0]?.url || '无url');
              console.log(`  - 处理后:`, enrichedValue?.[0]?.url || '无url');
            }
            
            enrichedRecords.push({
              id: record.id,
              ...enrichedFields,
              _rowIndex: index,
            });
          }
          
          console.log('[EditorPage] 记录处理完成，共:', enrichedRecords.length, '条');
          setFeishuRecords(records);
          setRecords(enrichedRecords as unknown as Record<string, unknown>[]);
        }
        
        setFeishuLoading(false);
      } catch (error) {
        console.error('[EditorPage] 初始化数据失败:', error);
        setFeishuLoading(false);
      }

      // 设置点击行监听
      console.log('[EditorPage] 设置点击行监听...');
      const unsubscribe = feishuEnv.onSelectionChange(async (event) => {
        console.log('[EditorPage] ======== 收到点击行事件 ========');
        console.log('[EditorPage] 事件数据:', event);
        
        // 获取新的选中记录
        try {
          const records = await feishuEnv.getSelectedRecords();
          console.log('[EditorPage] 获取到新的选中记录:', records);
          
          // 【关键】从 ref 获取字段元数据和表格ID，避免依赖状态导致循环
          const currentTableId = tableIdRef.current;
          const fieldMetaList = fieldMetaListRef.current;
          
          if (!currentTableId || fieldMetaList.length === 0) {
            console.warn('[EditorPage] 表格信息尚未初始化，跳过附件URL获取');
          }
          
          if (records.length > 0) {
            // 【关键】为每条记录获取附件URL并转换格式
            const enrichedRecords: any[] = [];
            
            for (let index = 0; index < records.length; index++) {
              const record = records[index];
              console.log(`[EditorPage] 处理选中记录 ${index}:`, record.id);
              
              // 获取附件字段的真实URL
              const enrichedFields = await enrichAttachmentUrls(
                record.id,
                currentTableId || '',
                record.fields,
                fieldMetaList
              );
              
              enrichedRecords.push({
                id: record.id,
                ...enrichedFields,
                _rowIndex: index,
              });
            }
            
            console.log('[EditorPage] 选中记录处理完成，共:', enrichedRecords.length, '条');
            setFeishuRecords(records);
            setRecords(enrichedRecords as unknown as Record<string, unknown>[]);
          }
        } catch (error) {
          console.error('[EditorPage] 获取选中记录失败:', error);
        }
      });

      return unsubscribe;
    };
    
    init();
  }, [setFeishuEnvironment, setFields, setRecords]);

  // 初始化当前编辑的模板
  useEffect(() => {
    if (storeCurrentTemplate) {
      console.log('[EditorPage] 设置当前编辑模板:', storeCurrentTemplate);
      setCurrentTemplate(storeCurrentTemplate);
      
      // 始终以数据库中的模板名称为准，确保首页和编辑页一致
      const dbTemplateName = storeCurrentTemplate.name;
      
      // 从模板数据中恢复编辑器状态
      if (storeCurrentTemplate.data) {
        console.log('[EditorPage] 从模板数据恢复编辑器状态:', storeCurrentTemplate.data);
        loadTemplateFromData(storeCurrentTemplate.data);
        // 使用数据库中的名称覆盖数据中的名称，确保一致性
        setTemplateName(dbTemplateName);
      } else {
        // 没有数据，只设置模板名称
        setTemplateName(dbTemplateName);
      }
    }
  }, [storeCurrentTemplate, loadTemplateFromData, setTemplateName]);

  // 记录初始编辑状态 - 只在模板加载完成后执行一次
  useEffect(() => {
    if (storeCurrentTemplate && !initialEditorState) {
      // 延迟记录初始状态，等待编辑器完全加载
      const timer = setTimeout(() => {
        const initialState = JSON.stringify({
          templateName,
          pageConfig,
          styleConfig,
          components,
        });
        console.log('[EditorPage] 记录初始编辑状态');
        setInitialEditorState(initialState);
        setHasUnsavedChanges(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [storeCurrentTemplate, initialEditorState]); // 只依赖 storeCurrentTemplate 和 initialEditorState

  // 检测是否有未保存的修改 - 移除 initialEditorState 依赖，避免循环
  useEffect(() => {
    if (!initialEditorState) return;

    const currentState = JSON.stringify({
      templateName,
      pageConfig,
      styleConfig,
      components,
    });

    const hasChanges = currentState !== initialEditorState;
    // 只在真正有变化时才更新状态，避免频繁日志
    if (hasChanges !== hasUnsavedChanges) {
      console.log('[EditorPage] 检测编辑状态变化:', { hasChanges });
      setHasUnsavedChanges(hasChanges);
    }
  }, [templateName, pageConfig, styleConfig, components]); // 移除 initialEditorState 依赖

  // 自动保存逻辑 - 防抖，只在有未保存修改且不在编辑状态时才触发
  useEffect(() => {
    // 检查是否有组件正在编辑
    const isComponentEditing = tableEditing.isEditing || tableCellEditing.isEditing;
    
    if (!currentTemplate?.id || !hasUnsavedChanges || isComponentEditing) {
      // 没有模板、没有修改，或有组件正在编辑时，不自动保存
      if (isComponentEditing) {
        console.log('[EditorPage] 组件正在编辑中，跳过自动保存');
      }
      return;
    }

    console.log('[EditorPage] 检测到未保存修改，计划自动保存', { 
      templateId: currentTemplate.id,
      templateName,
      componentsCount: components.length 
    });
    
    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 设置新的防抖定时器（3秒后保存，增加间隔减少频繁保存）
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        console.log('[EditorPage] 执行自动保存');
        
        // 收集编辑器状态数据
        const editorData = {
          templateName,
          pageConfig,
          styleConfig,
          components,
          history,
          historyIndex,
          // 保存当前表格信息，用于后续匹配校验
          tableId: currentTableInfo.tableId,
          tableName: currentTableInfo.tableName,
          baseId: currentTableInfo.baseId,
        };
        
        // 使用 updateTemplate 更新现有模板
        const updatedTemplate = await updateTemplate(currentTemplate.id, {
          name: templateName,
          data: editorData,
        });
        
        // 保存成功后直接更新初始状态，避免额外的 useEffect
        const currentState = JSON.stringify({
          templateName,
          pageConfig,
          styleConfig,
          components,
        });
        setInitialEditorState(currentState);
        setHasUnsavedChanges(false);
        
        const now = new Date();
        setLastSavedAt(now);
        console.log('[EditorPage] 自动保存成功:', now);
      } catch (error) {
        console.error('[EditorPage] 自动保存失败:', error);
        // 如果保存失败，尝试降级保存到 localStorage
        try {
          const editorData = {
            templateName,
            pageConfig,
            styleConfig,
            components,
            history,
            historyIndex,
          };
          localStorage.setItem(`draft_template_${currentTemplate.id}`, JSON.stringify(editorData));
          console.log('[EditorPage] 已保存到本地草稿');
        } catch (localError) {
          console.error('[EditorPage] 本地草稿保存也失败:', localError);
        }
      } finally {
        setIsSaving(false);
      }
    }, 3000); // 增加到3秒

    // 清理函数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    currentTemplate,
    hasUnsavedChanges, // 依赖未保存修改状态
    tableEditing.isEditing, // 表格编辑状态变化时重新评估
    tableCellEditing.isEditing, // 单元格编辑状态变化时重新评估
    // 以下依赖用于保存时读取最新数据
    templateName,
    pageConfig,
    styleConfig,
    components,
    history,
    historyIndex,
    currentTableInfo,
    updateTemplate,
  ]);

  // 获取当前正在编辑的表格
  const currentEditingTable = tableEditing.tableId 
    ? components.find(comp => comp.id === tableEditing.tableId) as any 
    : null;

  // 检查当前选中的单元格中是否有合并的单元格
  const hasMergedCell = (() => {
    if (!currentEditingTable) return false;
    
    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];
    
    for (let row = 0; row < cells.length; row++) {
      for (let col = 0; col < cells[row].length; col++) {
        const cellId = cells[row][col]?.id || `cell-${row}-${col}`;
        if (tableEditing.selectedCells.includes(cellId)) {
          const rowSpan = cells[row][col]?.rowSpan || 1;
          const colSpan = cells[row][col]?.colSpan || 1;
          if (rowSpan > 1 || colSpan > 1) {
            return true;
          }
        }
      }
    }
    return false;
  })();

  // 获取所有选中单元格的位置
  const getSelectedCellPositions = (): { row: number; col: number }[] => {
    if (!currentEditingTable) return [];
    
    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];
    const positions: { row: number; col: number }[] = [];
    
    cells.forEach((row: any[], rowIndex: number) => {
      row.forEach((cell: any, colIndex: number) => {
        const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
        if (tableEditing.selectedCells.includes(cellId)) {
          positions.push({ row: rowIndex, col: colIndex });
        }
      });
    });
    
    // 如果没有选中的单元格，使用当前正在编辑的单元格
    if (positions.length === 0 && tableCellEditing.rowIndex !== null && tableCellEditing.colIndex !== null) {
      positions.push({ row: tableCellEditing.rowIndex, col: tableCellEditing.colIndex });
    }
    
    return positions;
  };

  // 获取当前选中单元格的文本样式（取第一个选中单元格的样式）
  const getCurrentTableCellTextStyle = (): ComponentTextStyle => {
    // 默认样式 - 包含所有必需属性
    const defaultStyle: ComponentTextStyle = {
      fontSize: styleConfig.fontSize,
      color: '#000000',
      bold: false,
      italic: false,
      underline: false,
      align: 'left',
      lineHeight: styleConfig.lineHeight,
      backgroundColor: undefined,
      headingLevel: null,
      listType: null,
      textDecoration: 'none',
      textTransform: 'none',
    };

    if (!currentEditingTable) {
      return defaultStyle;
    }

    const positions = getSelectedCellPositions();
    if (positions.length === 0) {
      return defaultStyle;
    }

    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];
    const cell = cells[positions[0].row]?.[positions[0].col];

    if (cell?.style) {
      return {
        ...defaultStyle,
        ...cell.style,
      };
    }

    return defaultStyle;
  };

  // 更新表格单元格文本样式
  const updateTableCellTextStyle = (updates: Partial<ComponentTextStyle>) => {
    if (!currentEditingTable) {
      return;
    }

    const positions = getSelectedCellPositions();
    if (positions.length === 0) {
      return;
    }

    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];

    // 创建新的单元格数据
    const newCells = cells.map((row: any[]) => 
      row.map((cell: any) => ({ ...cell }))
    );

    // 更新所有选中单元格的样式
    positions.forEach(({ row, col }) => {
      if (!newCells[row][col].style) {
        newCells[row][col].style = {};
      }

      newCells[row][col].style = {
        ...newCells[row][col].style,
        ...updates,
      };
    });

    updateComponent(currentEditingTable.id, {
      tableConfig: {
        ...tableConfig,
        cells: newCells,
      },
    });
  };

  // 合并单元格
  const handleMergeCells = useCallback(() => {
    if (!currentEditingTable || tableEditing.selectedCells.length < 2) {
      return;
    }

    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];
    
    // 获取所有选中单元格的位置
    const selectedPositions: { row: number; col: number; cell: any }[] = [];
    
    cells.forEach((row: any[], rowIndex: number) => {
      row.forEach((cell: any, colIndex: number) => {
        const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
        if (tableEditing.selectedCells.includes(cellId)) {
          selectedPositions.push({ row: rowIndex, col: colIndex, cell });
        }
      });
    });

    if (selectedPositions.length < 2) return;

    // 找出选中区域的边界
    const minRow = Math.min(...selectedPositions.map(p => p.row));
    const maxRow = Math.max(...selectedPositions.map(p => p.row));
    const minCol = Math.min(...selectedPositions.map(p => p.col));
    const maxCol = Math.max(...selectedPositions.map(p => p.col));

    // 检查是否是矩形区域
    const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (selectedPositions.length !== expectedCount) {
      alert('请选择一个矩形区域来合并单元格');
      return;
    }

    // 创建新的单元格数据
    const newCells = cells.map((row: any[]) => 
      row.map((cell: any) => ({ ...cell }))
    );

    // 收集所有选中单元格的内容，用换行符连接
    const allContents = selectedPositions
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .map(p => p.cell?.content || '')
      .filter(Boolean)
      .join('\n');

    // 设置左上角单元格为合并后的单元格
    newCells[minRow][minCol] = {
      ...newCells[minRow][minCol],
      rowSpan: maxRow - minRow + 1,
      colSpan: maxCol - minCol + 1,
      content: allContents,
    };

    // 标记其他被合并的单元格（设置 rowSpan: 0, colSpan: 0 来表示被合并）
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row !== minRow || col !== minCol) {
          newCells[row][col] = {
            ...newCells[row][col],
            rowSpan: 0,
            colSpan: 0,
          };
        }
      }
    }

    updateComponent(currentEditingTable.id, {
      tableConfig: {
        ...tableConfig,
        cells: newCells,
      },
    });

    // 清除选中状态，只保留合并后的单元格选中
    const mergedCellId = newCells[minRow][minCol].id || `cell-${minRow}-${minCol}`;
    setTableEditing({
      selectedCells: [mergedCellId],
    });
  }, [currentEditingTable, tableEditing.selectedCells, updateComponent, setTableEditing]);

  // 取消合并单元格
  const handleUnmergeCells = useCallback(() => {
    if (!currentEditingTable) {
      return;
    }

    const tableConfig = currentEditingTable.tableConfig;
    const cells = tableConfig?.cells || [];
    
    // 获取所有选中单元格的位置
    const selectedPositions: { row: number; col: number; cell: any }[] = [];
    
    cells.forEach((row: any[], rowIndex: number) => {
      row.forEach((cell: any, colIndex: number) => {
        const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
        if (tableEditing.selectedCells.includes(cellId)) {
          selectedPositions.push({ row: rowIndex, col: colIndex, cell });
        }
      });
    });

    if (selectedPositions.length === 0) return;

    // 创建新的单元格数据
    const newCells = cells.map((row: any[]) => 
      row.map((cell: any) => ({ ...cell }))
    );

    // 对每个选中的合并单元格进行取消合并
    selectedPositions.forEach(({ row, col, cell }) => {
      const rowSpan = cell?.rowSpan || 1;
      const colSpan = cell?.colSpan || 1;
      
      // 只有当是合并单元格时才处理
      if (rowSpan > 1 || colSpan > 1) {
        // 恢复当前单元格为普通单元格
        newCells[row][col] = {
          ...newCells[row][col],
          rowSpan: 1,
          colSpan: 1,
        };

        // 恢复被合并的其他单元格
        for (let r = row; r < row + rowSpan; r++) {
          for (let c = col; c < col + colSpan; c++) {
            if (r !== row || c !== col) {
              // 确保这个位置的单元格存在并且被标记为合并
              if (newCells[r] && newCells[r][c]) {
                newCells[r][c] = {
                  ...newCells[r][c],
                  rowSpan: 1,
                  colSpan: 1,
                  content: '', // 清空内容，避免重复
                };
              }
            }
          }
        }
      }
    });

    updateComponent(currentEditingTable.id, {
      tableConfig: {
        ...tableConfig,
        cells: newCells,
      },
    });
  }, [currentEditingTable, tableEditing.selectedCells, updateComponent]);

  // 表格字体大小增减
  const increaseTableCellFontSize = () => {
    const currentStyle = getCurrentTableCellTextStyle();
    updateTableCellTextStyle({ fontSize: Math.min(72, currentStyle.fontSize + 2) });
  };

  const decreaseTableCellFontSize = () => {
    const currentStyle = getCurrentTableCellTextStyle();
    updateTableCellTextStyle({ fontSize: Math.max(8, currentStyle.fontSize - 2) });
  };

  // 处理表头表尾弹窗打开
  const handleOpenHeaderFooterDialog = () => {
    setTableEditing({
      headerFooterDialogOpen: true,
    });
  };

  // 处理表头行变化
  const handleHeaderRowsChange = (rows: number) => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...currentEditingTable.tableConfig,
          headerRows: rows,
        },
      });
    }
  };

  // 处理表尾行变化
  const handleFooterRowsChange = (rows: number) => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...currentEditingTable.tableConfig,
          footerRows: rows,
        },
      });
    }
  };

  // 处理弹窗关闭
  const handleHeaderFooterDialogClose = () => {
    setTableEditing({
      headerFooterDialogOpen: false,
    });
  };

  // 处理边框变化
  const handleBorderChange = (borderType: string) => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      const tableConfig = currentEditingTable.tableConfig;
      const cells = tableConfig?.cells || [];
      const borderWidth = tableConfig?.borderWidth || 1;
      
      // 获取选中的单元格位置
      const selectedPositions: { row: number; col: number }[] = [];
      
      cells.forEach((row: any[], rowIndex: number) => {
        row.forEach((cell: any, colIndex: number) => {
          const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
          if (tableEditing.selectedCells.includes(cellId)) {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          }
        });
      });
      
      // 如果没有选中单元格，使用整个表格
      if (selectedPositions.length === 0) {
        cells.forEach((row: any[], rowIndex: number) => {
          row.forEach((cell: any, colIndex: number) => {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          });
        });
      }
      
      // 创建新的单元格数据
      const newCells = cells.map((row: any[]) => 
        row.map((cell: any) => ({ ...cell }))
      );
      
      // 根据边框类型设置
      selectedPositions.forEach(({ row, col }) => {
        if (!newCells[row][col].border) {
          newCells[row][col].border = {};
        }
        
        switch (borderType) {
          case 'left':
            newCells[row][col].border.left = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'right':
            newCells[row][col].border.right = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'top':
            newCells[row][col].border.top = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'bottom':
            newCells[row][col].border.bottom = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'all':
            newCells[row][col].border.top = true;
            newCells[row][col].border.right = true;
            newCells[row][col].border.bottom = true;
            newCells[row][col].border.left = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'outer':
            // 设置外边框
            const isFirstRow = row === 0;
            const isLastRow = row === cells.length - 1;
            const isFirstCol = col === 0;
            const isLastCol = col === (cells[0]?.length || 0) - 1;
            
            if (isFirstRow) newCells[row][col].border.top = true;
            if (isLastRow) newCells[row][col].border.bottom = true;
            if (isFirstCol) newCells[row][col].border.left = true;
            if (isLastCol) newCells[row][col].border.right = true;
            newCells[row][col].border.width = borderWidth;
            break;
          case 'none':
            newCells[row][col].border.top = false;
            newCells[row][col].border.right = false;
            newCells[row][col].border.bottom = false;
            newCells[row][col].border.left = false;
            break;
        }
      });
      
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...tableConfig,
          cells: newCells,
        },
      });
    }
  };

  // 处理边框粗细变化
  const handleBorderWidthChange = (width: number) => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      const tableConfig = currentEditingTable.tableConfig;
      const cells = tableConfig?.cells || [];
      
      // 获取选中的单元格位置
      const selectedPositions: { row: number; col: number }[] = [];
      
      cells.forEach((row: any[], rowIndex: number) => {
        row.forEach((cell: any, colIndex: number) => {
          const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
          if (tableEditing.selectedCells.includes(cellId)) {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          }
        });
      });
      
      // 如果没有选中单元格，使用整个表格
      if (selectedPositions.length === 0) {
        cells.forEach((row: any[], rowIndex: number) => {
          row.forEach((cell: any, colIndex: number) => {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          });
        });
      }
      
      // 创建新的单元格数据
      const newCells = cells.map((row: any[]) => 
        row.map((cell: any) => ({ ...cell }))
      );
      
      // 更新选中单元格的边框粗细
      selectedPositions.forEach(({ row, col }) => {
        if (!newCells[row][col].border) {
          newCells[row][col].border = {};
        }
        newCells[row][col].border.width = width;
      });
      
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...tableConfig,
          borderWidth: width,
          cells: newCells,
        },
      });
    }
  };

  // 处理垂直对齐变化
  const handleAlignmentChange = (align: 'top' | 'middle' | 'bottom') => {
    if (currentEditingTable && currentEditingTable.type === 'table') {
      const tableConfig = currentEditingTable.tableConfig;
      const cells = tableConfig?.cells || [];
      
      // 获取选中的单元格位置
      const selectedPositions: { row: number; col: number }[] = [];
      
      cells.forEach((row: any[], rowIndex: number) => {
        row.forEach((cell: any, colIndex: number) => {
          const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
          if (tableEditing.selectedCells.includes(cellId)) {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          }
        });
      });
      
      // 如果没有选中单元格，使用整个表格
      if (selectedPositions.length === 0) {
        cells.forEach((row: any[], rowIndex: number) => {
          row.forEach((cell: any, colIndex: number) => {
            selectedPositions.push({ row: rowIndex, col: colIndex });
          });
        });
      }
      
      // 创建新的单元格数据
      const newCells = cells.map((row: any[]) => 
        row.map((cell: any) => ({ ...cell }))
      );
      
      // 更新选中单元格的垂直对齐
      selectedPositions.forEach(({ row, col }) => {
        newCells[row][col].verticalAlign = align;
      });
      
      updateComponent(currentEditingTable.id, {
        tableConfig: {
          ...tableConfig,
          cells: newCells,
        },
      });
    }
  };

  // 完成表格编辑
  const handleFinishEdit = useCallback(() => {
    setTableEditing({
      isEditing: false,
      tableId: null,
      selectedCells: [],
      headerFooterDialogOpen: false,
    });
  }, [setTableEditing]);

  // 处理颜色变化
  const handleColorChange = useCallback((colorType: 'text' | 'fill', color: string) => {
    // 颜色变化处理
  }, []);

  // 智能聚焦：选中组件时自动切换到数据源面板
  useEffect(() => {
    if (selectedComponentId) {
      const selectedComponent = components.find(c => c.id === selectedComponentId);
      if (selectedComponent && (selectedComponent.type === 'text' || selectedComponent.type === 'table')) {
        setActiveTab('data');
      }
    }
  }, [selectedComponentId, components, setActiveTab]);

  // 获取当前选中的文本组件
  const selectedTextComponent = components.find(
    (c) => c.id === selectedComponentId && c.type === 'text'
  ) as TextCanvasNode | undefined;

  // 文字编辑操作 - 更新 textStyle
  const updateTextStyle = (updates: Partial<ComponentTextStyle>) => {
    if (selectedTextComponent) {
      updateComponent(selectedTextComponent.id, {
        textStyle: {
          ...selectedTextComponent.textStyle,
          ...updates,
        },
      });
    }
  };

  // 字体大小增减
  const increaseFontSize = () => {
    if (selectedTextComponent) {
      const currentSize = selectedTextComponent.textStyle?.fontSize || styleConfig.fontSize;
      updateTextStyle({ fontSize: Math.min(72, currentSize + 2) });
    }
  };

  const decreaseFontSize = () => {
    if (selectedTextComponent) {
      const currentSize = selectedTextComponent.textStyle?.fontSize || styleConfig.fontSize;
      updateTextStyle({ fontSize: Math.max(8, currentSize - 2) });
    }
  };

  // 只保留usePrintSDK用于旧功能兼容，新功能使用feishuEnv

  // 全局键盘事件拦截器
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 如果正在编辑表格，在冒泡阶段阻止事件！
      if (tableEditing.isEditing || tableCellEditing.isEditing) {
        // 检查事件来源是否是 textarea（我们自己的输入框）
        const target = e.target as HTMLElement;
        const isTextarea = target.tagName === 'TEXTAREA';
        
        if (isTextarea) {
          // 只在冒泡阶段阻止，让事件先到达 textarea
          e.stopImmediatePropagation();
          e.stopPropagation();
        } else {
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
      }
    };
    
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (tableEditing.isEditing || tableCellEditing.isEditing) {
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
    };
    
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if (tableEditing.isEditing || tableCellEditing.isEditing) {
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
    };
    
    // 不在捕获阶段拦截！让事件先到达目标元素（textarea）
    // 只在冒泡阶段拦截，使用 false 作为第三个参数（默认值）
    document.addEventListener('keydown', handleGlobalKeyDown, false);
    document.addEventListener('keyup', handleGlobalKeyUp, false);
    document.addEventListener('keypress', handleGlobalKeyPress, false);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, false);
      document.removeEventListener('keyup', handleGlobalKeyUp, false);
      document.removeEventListener('keypress', handleGlobalKeyPress, false);
    };
  }, [tableEditing.isEditing, tableCellEditing.isEditing]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.id as string;
    setDraggedItem({ type });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (over && over.id === 'canvas') {
      const type = active.id as ComponentType;
      addComponent(type);
    }
  };

  const handleAddComponent = useCallback((type: ComponentType) => {
    addComponent(type);
  }, [addComponent]);

  const handlePrint = () => {
    setIsPrintPreviewOpen(true);
  };

  const handleExport = async () => {
    // TODO: 实现 PDF 导出
    alert('PDF 导出功能开发中...');
  };

  // 纸张尺寸显示
  const pageSizeDisplay = `${pageConfig.size}/${pageConfig.orientation === 'portrait' ? '纵向' : '横向'}`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-background">
        {/* 顶部工具栏 */}
        <header className="border-b bg-background/95 backdrop-blur z-50">
          <div className="flex items-center justify-between px-4 py-3">
            {/* 左侧 */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (hasUnsavedChanges) {
                    console.log('[EditorPage] 检测到未保存的修改，显示确认对话框');
                    setShowExitConfirm(true);
                  } else {
                    console.log('[EditorPage] 没有未保存的修改，直接退出');
                    onExit();
                  }
                }}
              >
                ← 退出
                {hasUnsavedChanges && (
                  <span className="ml-1 text-orange-500">●</span>
                )}
              </Button>
              
              {/* 数据源状态（新 feishu-env） */}
              {feishuLoading ? (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  加载数据...
                </Badge>
              ) : isFeishuEnvironment ? (
                <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  飞书数据 · {feishuRecords.length} 条
                </Badge>
              ) : null}
            </div>

            {/* 右侧 */}
            <div className="flex items-center gap-2">
              {/* 保存状态 */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isSaving || isStoreLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    保存中...
                  </span>
                ) : lastSavedAt ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    已保存 {lastSavedAt.toLocaleTimeString('zh-CN')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    等待保存...
                  </span>
                )}
              </div>

              {/* 手动保存按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!currentTemplate?.id) {
                    alert('请先选择模板');
                    return;
                  }
                  try {
                    setIsSaving(true);
                    const editorData = {
                      templateName,
                      pageConfig,
                      styleConfig,
                      components,
                      history,
                      historyIndex,
                      // 保存当前表格信息，用于后续匹配校验
                      tableId: currentTableInfo.tableId,
                      tableName: currentTableInfo.tableName,
                      baseId: currentTableInfo.baseId,
                    };
                    await updateTemplate(currentTemplate.id, {
                      name: templateName,
                      data: editorData,
                    });
                    setLastSavedAt(new Date());
                    console.log('[EditorPage] 手动保存成功');
                  } catch (error) {
                    console.error('[EditorPage] 手动保存失败:', error);
                    alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving || !currentTemplate?.id}
              >
                <Save className="w-4 h-4 mr-1" />
                保存
              </Button>

              {/* 纸张设置 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPageSettingsOpen(true)}
              >
                {pageSizeDisplay}
              </Button>

              {/* 撤销/重做 */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none border-r"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>

              {/* 清空 */}
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                disabled={components.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                清空
              </Button>

              {/* 打印 */}
              <Button size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                打印
              </Button>
            </div>
          </div>
        </header>

        {/* 文字编辑工具栏 - 仅在选中文本组件且不在编辑表格时显示 */}
        {selectedTextComponent && !tableEditing.isEditing && (
          <div className="border-b bg-background/95 backdrop-blur px-4 py-2">
            <TextToolbar
              textStyle={{
                fontSize: selectedTextComponent.textStyle?.fontSize || styleConfig.fontSize,
                color: selectedTextComponent.textStyle?.color || '#000000',
                bold: selectedTextComponent.textStyle?.bold || false,
                italic: selectedTextComponent.textStyle?.italic || false,
                underline: selectedTextComponent.textStyle?.underline || false,
                align: selectedTextComponent.textStyle?.align || 'left',
                backgroundColor: selectedTextComponent.textStyle?.backgroundColor,
                lineHeight: selectedTextComponent.textStyle?.lineHeight || styleConfig.lineHeight,
                paragraphSpacing: selectedTextComponent.textStyle?.paragraphSpacing,
                linkUrl: selectedTextComponent.textStyle?.linkUrl,
                headingLevel: selectedTextComponent.textStyle?.headingLevel,
                listType: selectedTextComponent.textStyle?.listType,
                textDecoration: selectedTextComponent.textStyle?.textDecoration,
                textTransform: selectedTextComponent.textStyle?.textTransform,
              }}
              onChange={updateTextStyle}
              onIncreaseFontSize={increaseFontSize}
              onDecreaseFontSize={decreaseFontSize}
            />
          </div>
        )}

        {/* 表格内容编辑工具栏 - 仅在编辑表格且选中单元格时显示 */}
        {tableEditing.isEditing && (
          <div className="border-b bg-background/95 backdrop-blur px-4 py-2">
            <TextToolbar
              textStyle={getCurrentTableCellTextStyle()}
              onChange={updateTableCellTextStyle}
              onIncreaseFontSize={increaseTableCellFontSize}
              onDecreaseFontSize={decreaseTableCellFontSize}
            />
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧面板 */}
          <aside className="w-64 border-r flex flex-col bg-muted/30">
            {/* 标签切换 */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as LeftPanelTab)}
              className="w-full"
            >
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="data"
                  className="flex-col gap-1 py-2 px-4 rounded-none data-[state=active]:bg-background"
                >
                  <Database className="w-4 h-4" />
                  <span className="text-xs">数据源</span>
                </TabsTrigger>
                <TabsTrigger
                  value="components"
                  className="flex-col gap-1 py-2 px-4 rounded-none data-[state=active]:bg-background"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-xs">组件</span>
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex-col gap-1 py-2 px-4 rounded-none data-[state=active]:bg-background"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-xs">设置</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto">
                <TabsContent value="data" className="m-0">
                  <DataSourcePanel onAddField={(field) => {
                    // 添加文本组件并设置内容为字段变量
                    addComponent('text');
                  }} />
                </TabsContent>
                <TabsContent value="components" className="m-0">
                  <ComponentPanel onAddComponent={handleAddComponent} />
                </TabsContent>
                <TabsContent value="settings" className="m-0">
                  <SettingsPanel />
                </TabsContent>
              </div>
            </Tabs>

            {/* 快速指南 */}
            <div className="border-t p-3 bg-background">
              <p className="text-xs font-medium mb-2">快速指南</p>
              <div className="space-y-1">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground">
                  如何创建新模板
                </Button>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground block">
                  基本排版操作
                </Button>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground block">
                  在排版中引用明细表
                </Button>
              </div>
            </div>
          </aside>

          {/* 右侧画布区 */}
          <main className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900">
            {/* 表格编辑工具栏 - 仅在编辑表格时显示，在画布上方 */}
            {tableEditing.isEditing && (
              <div className="bg-background border-b px-4 py-2">
                <AdvancedToolbar
                  onMergeCells={handleMergeCells}
                  onUnmergeCells={handleUnmergeCells}
                  selectedCellCount={tableEditing.selectedCells.length}
                  hasMergedCell={hasMergedCell}
                  onOpenHeaderFooterDialog={handleOpenHeaderFooterDialog}
                  onBorderChange={handleBorderChange}
                  onBorderWidthChange={handleBorderWidthChange}
                  borderWidth={currentEditingTable?.tableConfig?.borderWidth || 1}
                  onAlignmentChange={handleAlignmentChange}
                  verticalAlign={(() => {
                    if (!currentEditingTable?.tableConfig?.cells) return 'middle';
                    const cells = currentEditingTable.tableConfig.cells;
                    
                    // 获取第一个选中的单元格的对齐状态
                    for (let row = 0; row < cells.length; row++) {
                      for (let col = 0; col < cells[row].length; col++) {
                        const cellId = cells[row][col]?.id || `cell-${row}-${col}`;
                        if (tableEditing.selectedCells.includes(cellId)) {
                          return cells[row][col]?.verticalAlign || 'middle';
                        }
                      }
                    }
                    return 'middle';
                  })()}
                  onColorChange={handleColorChange}
                  onFinishEdit={() => {
                    handleFinishEdit();
                    handleHeaderFooterDialogClose();
                  }}
                />
              </div>
            )}

            {/* 表头表尾设置弹窗 */}
            {currentEditingTable && (
              <HeaderFooterSettingsDialog
                open={tableEditing.headerFooterDialogOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    handleHeaderFooterDialogClose();
                  } else {
                    setTableEditing({ headerFooterDialogOpen: true });
                  }
                }}
                headerRows={currentEditingTable.tableConfig?.headerRows || 0}
                footerRows={currentEditingTable.tableConfig?.footerRows || 0}
                onHeaderRowsChange={handleHeaderRowsChange}
                onFooterRowsChange={handleFooterRowsChange}
                maxRows={currentEditingTable.tableConfig?.cells?.length || 0}
              />
            )}
            {/* 画布区域 */}
            <div className="p-6">
              <CanvasArea />
            </div>
          </main>
        </div>

        {/* 底部状态栏 */}
        <footer className="border-t px-4 py-2 bg-background text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              {currentTemplate && currentTemplate.id 
                ? '✓ 改动将自动保存到云端' 
                : '⚠ 本地模板，点击创建后可保存到云端'
              }
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>组件: {components.length}</span>
            <span>|</span>
            <span>纸张: {PAGE_SIZES[pageConfig.size]?.width}×{PAGE_SIZES[pageConfig.size]?.height}mm</span>
          </div>
        </footer>
      </div>

      {/* 弹窗 */}
      <PageSettingsDialog
        open={isPageSettingsOpen}
        onOpenChange={setIsPageSettingsOpen}
      />
      <PrintPreviewDialog
        open={isPrintPreviewOpen}
        onOpenChange={setIsPrintPreviewOpen}
      />

      {/* 退出确认对话框 */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>有未保存的修改</AlertDialogTitle>
            <AlertDialogDescription>
              当前模板还有未保存的修改，退出后这些修改将丢失。
              {isSaving ? '\n注意：当前正在保存中...' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                console.log('[EditorPage] 用户确认退出，忽略未保存的修改');
                setShowExitConfirm(false);
                onExit();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              放弃修改并退出
            </AlertDialogAction>
            {!isSaving && (
              <AlertDialogAction
                onClick={async () => {
                  console.log('[EditorPage] 用户选择保存后退出');
                  try {
                    setIsSaving(true);
                    const editorData = {
                      templateName,
                      pageConfig,
                      styleConfig,
                      components,
                      history,
                      historyIndex,
                      // 保存当前表格信息，用于后续匹配校验
                      tableId: currentTableInfo.tableId,
                      tableName: currentTableInfo.tableName,
                      baseId: currentTableInfo.baseId,
                    };
                    await updateTemplate(currentTemplate!.id, {
                      name: templateName,
                      data: editorData,
                    });
                    setLastSavedAt(new Date());
                    console.log('[EditorPage] 保存成功，退出');
                    setShowExitConfirm(false);
                    onExit();
                  } catch (error) {
                    console.error('[EditorPage] 保存失败:', error);
                    alert('保存失败，请重试或选择放弃修改');
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                保存并退出
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 拖拽预览 */}
      <DragOverlay>
        {draggedItem && (
          <div className="p-3 bg-background border rounded-lg shadow-lg">
            <span className="text-sm">{draggedItem.type}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
