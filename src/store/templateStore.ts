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
  data?: any; // 模板完整数据
}

interface TemplateStore {
  // 状态
  templates: UserTemplate[];
  activeTemplateId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  authToken: string | null;

  // Actions
  addTemplate: (template: Omit<UserTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<Omit<UserTemplate, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setActiveTemplate: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setAuthToken: (token: string | null) => void;
  fetchTemplatesFromServer: () => Promise<void>;
  saveTemplateToServer: (template: UserTemplate) => Promise<void>;
  autoSaveTemplate: (templateId: string, data: any) => Promise<void>;
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

// API 调用辅助函数
const apiRequest = async (
  url: string,
  options: RequestInit = {},
  authToken: string | null = null
) => {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  
  return data;
};

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => {
      console.log('[templateStore] 初始化 store');
      
      return {
        // 初始状态
        templates: initialTemplates,
        activeTemplateId: null,
        isLoading: false,
        isSaving: false,
        error: null,
        lastSyncedAt: null,
        authToken: null,

        // Actions
        setAuthToken: (token) => {
          console.log('[templateStore] setAuthToken 调用');
          set({ authToken: token });
        },

        fetchTemplatesFromServer: async () => {
          console.log('[templateStore] fetchTemplatesFromServer 调用');
          const { authToken } = get();
          
          if (!authToken) {
            console.log('[templateStore] 没有认证 token，使用本地数据');
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const data = await apiRequest('/api/templates', {}, authToken);
            
            if (data.success && data.data) {
              console.log('[templateStore] 从服务器获取模板成功:', data.data.length);
              set({ 
                templates: data.data, 
                lastSyncedAt: new Date().toISOString(),
                isLoading: false 
              });
            }
          } catch (error) {
            console.error('[templateStore] 从服务器获取模板失败:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch templates',
              isLoading: false 
            });
          }
        },

        addTemplate: async (template) => {
          console.log('[templateStore] addTemplate 调用', template);
          const { authToken } = get();

          // 先添加到本地
          const localId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newTemplate: UserTemplate = {
            ...template,
            id: localId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: false,
          };

          set((state) => ({
            templates: [...state.templates, newTemplate],
          }));

          // 如果有认证，同步到服务器
          if (authToken) {
            try {
              const data = await apiRequest(
                '/api/templates',
                {
                  method: 'POST',
                  body: JSON.stringify({
                    name: template.name,
                    description: template.description,
                    thumbnail: template.thumbnail,
                    data: template.data || {},
                    isPublic: false,
                  }),
                },
                authToken
              );

              if (data.success && data.data) {
                console.log('[templateStore] 模板同步到服务器成功:', data.data.id);
                // 更新本地 ID 为服务器 ID
                set((state) => ({
                  templates: state.templates.map((t) => 
                    t.id === localId ? { ...t, id: data.data.id } : t
                  ),
                }));
              }
            } catch (error) {
              console.error('[templateStore] 同步模板到服务器失败:', error);
              // 保留本地数据，不回滚
            }
          }

          console.log('[templateStore] 模板添加完成');
        },

        updateTemplate: async (id, updates) => {
          console.log('[templateStore] updateTemplate 调用', { id, updates });
          const { authToken, templates } = get();

          // 先更新本地
          set((state) => ({
            templates: state.templates.map((template) => {
              if (template.id === id) {
                return {
                  ...template,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
              }
              return template;
            }),
          }));

          // 如果有认证且模板有服务器 ID（数字 ID），同步到服务器
          if (authToken && !id.startsWith('template-')) {
            try {
              const currentTemplate = templates.find((t) => t.id === id);
              await apiRequest(
                `/api/templates/${id}`,
                {
                  method: 'PUT',
                  body: JSON.stringify({
                    name: updates.name ?? currentTemplate?.name,
                    description: updates.description ?? currentTemplate?.description,
                    thumbnail: updates.thumbnail ?? currentTemplate?.thumbnail,
                    data: updates.data ?? currentTemplate?.data,
                  }),
                },
                authToken
              );
              console.log('[templateStore] 模板更新同步到服务器成功');
            } catch (error) {
              console.error('[templateStore] 同步模板更新到服务器失败:', error);
            }
          }

          console.log('[templateStore] 模板更新完成');
        },

        deleteTemplate: async (id) => {
          console.log('[templateStore] deleteTemplate 调用', id);
          const { authToken } = get();

          // 先从本地删除
          set((state) => {
            const filteredTemplates = state.templates.filter((template) => template.id !== id);
            const newActiveTemplateId = state.activeTemplateId === id ? null : state.activeTemplateId;
            return {
              templates: filteredTemplates,
              activeTemplateId: newActiveTemplateId,
            };
          });

          // 如果有认证且模板有服务器 ID，从服务器删除
          if (authToken && !id.startsWith('template-')) {
            try {
              await apiRequest(
                `/api/templates/${id}`,
                { method: 'DELETE' },
                authToken
              );
              console.log('[templateStore] 模板从服务器删除成功');
            } catch (error) {
              console.error('[templateStore] 从服务器删除模板失败:', error);
            }
          }

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

        saveTemplateToServer: async (template) => {
          console.log('[templateStore] saveTemplateToServer 调用', template.id);
          const { authToken } = get();

          if (!authToken) {
            console.log('[templateStore] 没有认证 token，跳过服务器保存');
            return;
          }

          set({ isSaving: true });

          try {
            if (template.id.startsWith('template-')) {
              // 新模板，创建
              const data = await apiRequest(
                '/api/templates',
                {
                  method: 'POST',
                  body: JSON.stringify({
                    name: template.name,
                    description: template.description,
                    thumbnail: template.thumbnail,
                    data: template.data || {},
                    isPublic: false,
                  }),
                },
                authToken
              );

              if (data.success && data.data) {
                // 更新本地 ID
                set((state) => ({
                  templates: state.templates.map((t) => 
                    t.id === template.id ? { ...t, id: data.data.id } : t
                  ),
                  isSaving: false,
                }));
              }
            } else {
              // 现有模板，更新
              await apiRequest(
                `/api/templates/${template.id}`,
                {
                  method: 'PUT',
                  body: JSON.stringify({
                    name: template.name,
                    description: template.description,
                    thumbnail: template.thumbnail,
                    data: template.data || {},
                  }),
                },
                authToken
              );
              set({ isSaving: false });
            }
            console.log('[templateStore] 模板保存到服务器成功');
          } catch (error) {
            console.error('[templateStore] 保存模板到服务器失败:', error);
            set({ isSaving: false });
            throw error;
          }
        },

        autoSaveTemplate: async (templateId, data) => {
          console.log('[templateStore] autoSaveTemplate 调用', templateId);
          const { authToken, templates } = get();

          if (!authToken || templateId.startsWith('template-')) {
            console.log('[templateStore] 自动保存跳过（无认证或本地模板）');
            // 只更新本地数据
            set((state) => ({
              templates: state.templates.map((t) => 
                t.id === templateId ? { ...t, data, updatedAt: new Date().toISOString() } : t
              ),
            }));
            return;
          }

          try {
            await apiRequest(
              `/api/templates/${templateId}`,
              {
                method: 'PUT',
                body: JSON.stringify({ data }),
              },
              authToken
            );
            
            // 更新本地
            set((state) => ({
              templates: state.templates.map((t) => 
                t.id === templateId ? { ...t, data, updatedAt: new Date().toISOString() } : t
              ),
            }));
            
            console.log('[templateStore] 自动保存成功');
          } catch (error) {
            console.error('[templateStore] 自动保存失败:', error);
          }
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
      // 不要持久化 authToken 和 isLoading/isSaving 状态
      partialize: (state) => ({
        templates: state.templates,
        activeTemplateId: state.activeTemplateId,
        lastSyncedAt: state.lastSyncedAt,
      }),
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
      isSaving: state.isSaving,
      error: state.error,
      hasAuthToken: !!state.authToken,
    });
  });
}
