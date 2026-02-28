import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  EditorComponent,
  PageConfig,
  StyleConfig,
  Field,
  PrintTemplate,
  DEFAULT_PAGE_CONFIG,
  DEFAULT_STYLE_CONFIG,
  ComponentType,
  DEFAULT_COMPONENT_SIZES,
  FeishuContext,
} from '@/types/editor';

// 编辑器状态
interface EditorState {
  // 当前模板
  templateId: string | null;
  templateName: string;
  components: EditorComponent[];
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
  history: EditorComponent[][];
  historyIndex: number;
  
  // 操作方法
  setTemplateName: (name: string) => void;
  addComponent: (type: ComponentType, position?: { x: number; y: number }) => void;
  updateComponent: (id: string, updates: Partial<EditorComponent>) => void;
  removeComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  resizeComponent: (id: string, width: number, height: number) => void;
  
  // 层级管理
  moveComponentUp: (id: string) => void;
  moveComponentDown: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
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
  
  // 添加组件
  addComponent: (type, position) => {
    const state = get();
    const id = uuidv4();
    const defaultSize = DEFAULT_COMPONENT_SIZES[type];
    const zIndex = state.components.length > 0 
      ? Math.max(...state.components.map(c => c.zIndex)) + 1 
      : 1;
    const x = position?.x ?? 50;
    const y = position?.y ?? 50 + (state.components.length * 20);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let newComponent: any = {
      id,
      type,
      x,
      y,
      width: defaultSize.width,
      height: defaultSize.height,
      zIndex,
    };
    
    switch (type) {
      case 'text':
        newComponent = {
          ...newComponent,
          content: '双击编辑文本',
          fontSize: state.styleConfig.fontSize,
          fontWeight: 'normal',
          textAlign: 'left',
          lineHeight: state.styleConfig.lineHeight,
        };
        break;
      case 'table':
        newComponent = {
          ...newComponent,
          columns: [],
          showHeader: true,
          headerStyle: { backgroundColor: '#f5f5f5', fontWeight: 'bold' },
        };
        break;
      case 'image':
        newComponent = { ...newComponent, src: '', alt: '图片', fit: 'contain' };
        break;
      case 'qrcode':
        newComponent = { ...newComponent, content: 'https://example.com', size: 80 };
        break;
      case 'barcode':
        newComponent = { ...newComponent, content: '123456789', format: 'CODE128', width: 150, height: 50 };
        break;
      case 'line':
        newComponent = { ...newComponent, color: '#000000', thickness: 1, style: 'solid' };
        break;
      case 'autoTable':
        newComponent = {
          ...newComponent,
          selectedFields: [],
          showHeader: true,
          headerStyle: { backgroundColor: '#f5f5f5', fontWeight: 'bold' },
        };
        break;
      case 'freeElement':
        newComponent = { ...newComponent, content: '' };
        break;
      case 'article':
        newComponent = { ...newComponent, content: '文章内容' };
        break;
    }
    
    set({
      components: [...state.components, newComponent as EditorComponent],
      selectedComponentId: id,
    });
    
    get().saveToHistory();
  },
  
  // 更新组件
  updateComponent: (id, updates) => {
    const state = get();
    const newComponents = state.components.map((c) =>
      c.id === id ? { ...c, ...updates } as EditorComponent : c
    );
    set({ components: newComponents });
    get().saveToHistory();
  },
  
  // 删除组件
  removeComponent: (id) => {
    const state = get();
    set({
      components: state.components.filter((c) => c.id !== id),
      selectedComponentId: null,
    });
    get().saveToHistory();
  },
  
  // 选择组件
  selectComponent: (id) => set({ selectedComponentId: id }),
  
  // 移动组件
  moveComponent: (id, x, y) => {
    const state = get();
    const newComponents = state.components.map((c) =>
      c.id === id ? { ...c, x, y } as EditorComponent : c
    );
    set({ components: newComponents });
  },
  
  // 调整组件大小
  resizeComponent: (id, width, height) => {
    const state = get();
    const newComponents = state.components.map((c) =>
      c.id === id ? { ...c, width, height } as EditorComponent : c
    );
    set({ components: newComponents });
  },
  
  // 层级管理
  moveComponentUp: (id) => {
    const state = get();
    const component = state.components.find(c => c.id === id);
    if (!component) return;
    
    const sortedByZ = [...state.components].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sortedByZ.findIndex(c => c.id === id);
    
    if (idx < sortedByZ.length - 1) {
      const nextComponent = sortedByZ[idx + 1];
      const newComponents = state.components.map(c => {
        if (c.id === id) return { ...c, zIndex: nextComponent.zIndex } as EditorComponent;
        if (c.id === nextComponent.id) return { ...c, zIndex: component.zIndex } as EditorComponent;
        return c;
      });
      set({ components: newComponents });
      get().saveToHistory();
    }
  },
  
  moveComponentDown: (id) => {
    const state = get();
    const component = state.components.find(c => c.id === id);
    if (!component) return;
    
    const sortedByZ = [...state.components].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sortedByZ.findIndex(c => c.id === id);
    
    if (idx > 0) {
      const prevComponent = sortedByZ[idx - 1];
      const newComponents = state.components.map(c => {
        if (c.id === id) return { ...c, zIndex: prevComponent.zIndex } as EditorComponent;
        if (c.id === prevComponent.id) return { ...c, zIndex: component.zIndex } as EditorComponent;
        return c;
      });
      set({ components: newComponents });
      get().saveToHistory();
    }
  },
  
  bringToFront: (id) => {
    const state = get();
    const maxZ = Math.max(...state.components.map(c => c.zIndex));
    const newComponents = state.components.map(c =>
      c.id === id ? { ...c, zIndex: maxZ + 1 } as EditorComponent : c
    );
    set({ components: newComponents });
    get().saveToHistory();
  },
  
  sendToBack: (id) => {
    const state = get();
    const minZ = Math.min(...state.components.map(c => c.zIndex));
    const newComponents = state.components.map(c =>
      c.id === id ? { ...c, zIndex: minZ - 1 } as EditorComponent : c
    );
    set({ components: newComponents });
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
    set({
      templateId: template.id,
      templateName: template.name,
      components: [...template.components],
      pageConfig: { ...template.pageConfig },
      styleConfig: { ...template.styleConfig },
      history: [[...template.components]],
      historyIndex: 0,
    });
  },
  
  // 保存模板
  saveTemplate: () => {
    const state = get();
    const template = state.exportTemplate();
    
    // 更新或添加模板
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
