import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  CanvasComponentNode,
  PageConfig,
  StyleConfig,
  Field,
  PrintTemplate,
  DEFAULT_PAGE_CONFIG,
  DEFAULT_STYLE_CONFIG,
  ComponentType,
  DEFAULT_COMPONENT_SIZES,
  FeishuContext,
  ComponentTextStyle,
  TableConfig,
} from '@/types/editor';

// 编辑器状态（流式布局版本）
interface EditorState {
  // 当前模板
  templateId: string | null;
  templateName: string;
  components: any[];
  selectedComponentId: string | null;
  
  // 页面和样式配置
  pageConfig: PageConfig;
  styleConfig: StyleConfig;
  
  // 字段列表
  fields: Field[];
  systemFields: Field[];
  isFeishuEnvironment: boolean;
  
  // 飞书上下文
  feishuContext: FeishuContext | null;
  isFeishuContextLoading: boolean;
  
  // 记录数据（用于批量打印）
  records: Record<string, unknown>[];
  selectedRecordIds: string[];
  
  // 保存的模板列表
  savedTemplates: PrintTemplate[];
  
  // 历史记录（撤销/重做）
  history: CanvasComponentNode[][];
  historyIndex: number;
  
  // 操作方法
  setTemplateName: (name: string) => void;
  addComponent: (type: ComponentType) => void;
  updateComponent: (id: string, updates: Partial<CanvasComponentNode>) => void;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  reorderComponents: (fromIndex: number, toIndex: number) => void;
  duplicateComponent: (id: string) => void;
  
  // 页面和样式
  setPageConfig: (config: Partial<PageConfig>) => void;
  setStyleConfig: (config: Partial<StyleConfig>) => void;
  
  // 字段
  setFields: (fields: Field[]) => void;
  setSystemFields: (fields: Field[]) => void;
  setFeishuEnvironment: (isFeishu: boolean) => void;
  
  // 飞书上下文
  setFeishuContext: (context: FeishuContext | null) => void;
  setFeishuContextLoading: (loading: boolean) => void;
  
  // 记录数据
  setRecords: (records: Record<string, unknown>[]) => void;
  setSelectedRecordIds: (ids: string[]) => void;
  toggleRecordSelection: (id: string) => void;
  selectAllRecords: () => void;
  clearRecordSelection: () => void;
  
  // 历史记录
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // 模板操作
  loadTemplate: (template: PrintTemplate) => void;
  saveTemplate: () => void;
  deleteTemplate: (id: string) => void;
  clearCanvas: () => void;
  
  // 导出
  exportTemplate: () => PrintTemplate;
}

// 本地存储键名
const STORAGE_KEY = 'feishu_print_templates';

// 从本地存储加载模板
const loadSavedTemplates = (): PrintTemplate[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// 保存模板到本地存储
const saveTemplatesToStorage = (templates: PrintTemplate[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates:', e);
  }
};

// 创建默认文本样式
const createDefaultTextStyle = (styleConfig: StyleConfig): ComponentTextStyle => ({
  fontSize: styleConfig.fontSize,
  color: '#000000',
  bold: false,
  align: 'left',
  lineHeight: styleConfig.lineHeight,
});

// 创建默认表格配置
const createDefaultTableConfig = (): TableConfig => ({
  headerRows: 1,
  footerRows: 0,
  borderColor: '#000000',
  borderWidth: 1,
  showOuterBorder: true,
  showInnerBorder: true,
  cells: [
    [{ id: '1', content: '表头1' }, { id: '2', content: '表头2' }, { id: '3', content: '表头3' }],
    [{ id: '4', content: '数据1' }, { id: '5', content: '数据2' }, { id: '6', content: '数据3' }],
  ],
});

export const useEditorStore = create<EditorState>((set, get) => ({
  // 初始状态
  templateId: null,
  templateName: '未命名排版',
  components: [],
  selectedComponentId: null,
  pageConfig: DEFAULT_PAGE_CONFIG,
  styleConfig: DEFAULT_STYLE_CONFIG,
  fields: [],
  systemFields: [
    { id: 'sys_table_name', name: '表格名', type: 'text', placeholder: '[表格名]', isSystem: true },
    { id: 'sys_print_time', name: '打印时间', type: 'text', placeholder: '[打印时间]', isSystem: true },
  ],
  isFeishuEnvironment: false,
  feishuContext: null,
  isFeishuContextLoading: false,
  records: [],
  selectedRecordIds: [],
  savedTemplates: [],
  history: [[]],
  historyIndex: 0,
  
  // 设置模板名称
  setTemplateName: (name) => set({ templateName: name }),
  
  // 添加组件（流式布局 - 追加到末尾）
  addComponent: (type) => {
    const state = get();
    const id = uuidv4();
    const defaultSize = DEFAULT_COMPONENT_SIZES[type];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let newComponent: any = {
      id,
      type,
      width: defaultSize.width,
    };
    
    switch (type) {
      case 'text':
        newComponent.content = '双击编辑文本';
        newComponent.textStyle = createDefaultTextStyle(state.styleConfig);
        break;
      case 'table':
        newComponent.minHeight = defaultSize.height;
        newComponent.tableConfig = createDefaultTableConfig();
        break;
      case 'image':
        newComponent.minHeight = defaultSize.height;
        newComponent.src = '';
        newComponent.alt = '图片';
        newComponent.fit = 'contain';
        break;
      case 'qrcode':
        newComponent.content = 'https://example.com';
        newComponent.size = 80;
        break;
      case 'barcode':
        newComponent.content = '123456789';
        newComponent.format = 'CODE128';
        break;
      case 'line':
        newComponent.color = '#000000';
        newComponent.thickness = 1;
        newComponent.style = 'solid';
        break;
      default:
        newComponent.type = 'text';
        newComponent.content = '未知组件';
        newComponent.textStyle = createDefaultTextStyle(state.styleConfig);
    }
    
    set({
      components: [...state.components, newComponent],
      selectedComponentId: null,
    });
    
    get().saveToHistory();
  },
  
  // 更新组件
  updateComponent: (id, updates) => {
    const state = get();
    const newComponents = state.components.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    set({ components: newComponents });
    get().saveToHistory();
  },
  
  // 删除组件
  deleteComponent: (id) => {
    const state = get();
    set({
      components: state.components.filter((c) => c.id !== id),
      selectedComponentId: null,
    });
    get().saveToHistory();
  },
  
  // 选择组件
  selectComponent: (id) => set({ selectedComponentId: id }),
  
  // 重新排序组件
  reorderComponents: (fromIndex, toIndex) => {
    const state = get();
    const newComponents = [...state.components];
    const [movedComponent] = newComponents.splice(fromIndex, 1);
    newComponents.splice(toIndex, 0, movedComponent);
    set({ components: newComponents });
    get().saveToHistory();
  },
  
  // 复制组件
  duplicateComponent: (id) => {
    const state = get();
    const componentToCopy = state.components.find(c => c.id === id);
    if (!componentToCopy) return;
    
    const newId = uuidv4();
    const duplicatedComponent = {
      ...componentToCopy,
      id: newId,
    };
    
    // 找到原组件的索引，复制到它后面
    const originalIndex = state.components.findIndex(c => c.id === id);
    const newComponents = [...state.components];
    newComponents.splice(originalIndex + 1, 0, duplicatedComponent);
    
    set({
      components: newComponents,
      selectedComponentId: newId,
    });
    get().saveToHistory();
  },
  
  // 设置页面配置
  setPageConfig: (config) => {
    set((state) => ({
      pageConfig: { ...state.pageConfig, ...config },
    }));
  },
  
  // 设置样式配置
  setStyleConfig: (config) => {
    set((state) => ({
      styleConfig: { ...state.styleConfig, ...config },
    }));
  },
  
  // 设置字段列表
  setFields: (fields) => set({ fields }),
  setSystemFields: (fields) => set({ systemFields: fields }),
  setFeishuEnvironment: (isFeishu) => set({ isFeishuEnvironment: isFeishu }),
  
  // 设置飞书上下文
  setFeishuContext: (context) => set({ feishuContext: context }),
  setFeishuContextLoading: (loading) => set({ isFeishuContextLoading: loading }),
  
  // 记录数据管理
  setRecords: (records) => set({ records }),
  setSelectedRecordIds: (ids) => set({ selectedRecordIds: ids }),
  
  toggleRecordSelection: (id) => {
    const state = get();
    const isSelected = state.selectedRecordIds.includes(id);
    set({
      selectedRecordIds: isSelected
        ? state.selectedRecordIds.filter(i => i !== id)
        : [...state.selectedRecordIds, id],
    });
  },
  
  selectAllRecords: () => {
    const state = get();
    set({ selectedRecordIds: state.records.map(r => r.id as string) });
  },
  
  clearRecordSelection: () => set({ selectedRecordIds: [] }),
  
  // 撤销
  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      set({
        components: state.history[newIndex],
        historyIndex: newIndex,
      });
    }
  },
  
  // 重做
  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      set({
        components: state.history[newIndex],
        historyIndex: newIndex,
      });
    }
  },
  
  // 保存到历史记录
  saveToHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.components]);
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },
  
  // 加载模板
  loadTemplate: (template) => {
    // 兼容性转换：旧模板可能有position字段
    const convertedComponents = template.components.map((comp: any) => {
      const { x, y, zIndex, ...rest } = comp;
      return rest;
    }) as CanvasComponentNode[];
    
    set({
      templateId: template.id,
      templateName: template.name,
      components: convertedComponents,
      pageConfig: { ...template.pageConfig },
      styleConfig: { ...template.styleConfig },
      history: [convertedComponents],
      historyIndex: 0,
    });
  },
  
  // 保存模板
  saveTemplate: () => {
    const state = get();
    const template = state.exportTemplate();
    
    const existingIdx = state.savedTemplates.findIndex(t => t.id === template.id);
    let newTemplates: PrintTemplate[];
    
    if (existingIdx >= 0) {
      newTemplates = [...state.savedTemplates];
      newTemplates[existingIdx] = template;
    } else {
      newTemplates = [...state.savedTemplates, template];
    }
    
    set({ 
      savedTemplates: newTemplates,
      templateId: template.id,
    });
    
    saveTemplatesToStorage(newTemplates);
  },
  
  // 删除模板
  deleteTemplate: (id) => {
    const state = get();
    const newTemplates = state.savedTemplates.filter(t => t.id !== id);
    set({ savedTemplates: newTemplates });
    saveTemplatesToStorage(newTemplates);
  },
  
  // 清空画布
  clearCanvas: () => {
    set({
      components: [],
      selectedComponentId: null,
      history: [[]],
      historyIndex: 0,
    });
  },
  
  // 导出模板
  exportTemplate: () => {
    const state = get();
    return {
      id: state.templateId || uuidv4(),
      name: state.templateName,
      components: state.components,
      pageConfig: state.pageConfig,
      styleConfig: state.styleConfig,
      category: 'custom',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
}));

// 初始化时加载保存的模板
if (typeof window !== 'undefined') {
  const savedTemplates = loadSavedTemplates();
  useEditorStore.setState({ savedTemplates });
}
