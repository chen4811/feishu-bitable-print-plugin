'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 模板类型定义
export interface UserTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  isActive?: boolean;
}

interface TemplateStore {
  // 状态
  templates: UserTemplate[];
  activeTemplateId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  addTemplate: (template: Omit<UserTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<Omit<UserTemplate, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteTemplate: (id: string) => void;
  setActiveTemplate: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// 初始化一些示例模板
const initialTemplates: UserTemplate[] = [
  {
    id: 'template-1',
    name: '合同模板',
    description: '标准合同文档模板',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    isActive: true,
  },
  {
    id: 'template-2',
    name: '发票模板',
    description: '发票打印模板',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    isActive: false,
  },
  {
    id: 'template-3',
    name: '工作日报',
    description: '每日工作汇报模板',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    isActive: false,
  },
];

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => {
      console.log('[templateStore] 初始化 store');
      
      return {
        // 初始状态
        templates: initialTemplates,
        activeTemplateId: null,
        isLoading: false,
        error: null,

        // Actions
        addTemplate: (template) => {
          console.log('[templateStore] addTemplate 调用', template);
          
          const newTemplate: UserTemplate = {
            ...template,
            id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: false,
          };

          set((state) => {
            console.log('[templateStore] 添加新模板:', newTemplate);
            return {
              templates: [...state.templates, newTemplate],
            };
          });

          console.log('[templateStore] 模板添加完成');
        },

        updateTemplate: (id, updates) => {
          console.log('[templateStore] updateTemplate 调用', { id, updates });

          set((state) => {
            const updatedTemplates = state.templates.map((template) => {
              if (template.id === id) {
                const updated = {
                  ...template,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
                console.log('[templateStore] 更新模板:', updated);
                return updated;
              }
              return template;
            });

            return { templates: updatedTemplates };
          });

          console.log('[templateStore] 模板更新完成');
        },

        deleteTemplate: (id) => {
          console.log('[templateStore] deleteTemplate 调用', id);

          set((state) => {
            const filteredTemplates = state.templates.filter((template) => template.id !== id);
            const newActiveTemplateId = state.activeTemplateId === id ? null : state.activeTemplateId;

            console.log('[templateStore] 删除模板:', id);
            return {
              templates: filteredTemplates,
              activeTemplateId: newActiveTemplateId,
            };
          });

          console.log('[templateStore] 模板删除完成');
        },

        setActiveTemplate: (id) => {
          console.log('[templateStore] setActiveTemplate 调用', id);

          set((state) => {
            // 更新所有模板的 isActive 状态
            const updatedTemplates = state.templates.map((template) => ({
              ...template,
              isActive: template.id === id,
            }));

            return {
              templates: updatedTemplates,
              activeTemplateId: id,
            };
          });

          console.log('[templateStore] 活动模板设置完成');
        },

        setLoading: (loading) => {
          console.log('[templateStore] setLoading 调用', loading);
          set({ isLoading: loading });
        },

        setError: (error) => {
          console.log('[templateStore] setError 调用', error);
          set({ error });
        },

        clearError: () => {
          console.log('[templateStore] clearError 调用');
          set({ error: null });
        },
      };
    },
    {
      name: 'template-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          console.log('[templateStore] 使用 localStorage');
          return localStorage;
        }
        console.log('[templateStore] 使用内存存储 (服务端渲染)');
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      onRehydrateStorage: () => (state) => {
        console.log('[templateStore] 状态从持久化存储恢复:', state);
      },
    }
  )
);

// 调试用的订阅
if (typeof window !== 'undefined') {
  useTemplateStore.subscribe((state) => {
    console.log('[templateStore] 状态更新:', {
      templatesCount: state.templates.length,
      activeTemplateId: state.activeTemplateId,
      isLoading: state.isLoading,
      error: state.error,
    });
  });
}
