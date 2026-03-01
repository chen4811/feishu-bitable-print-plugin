import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 管理员用户类型
interface AdminUser {
  id: number;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 授权码类型
interface Authorization {
  id: number;
  userId: number;
  tableId: string;
  tableName: string;
  appTokenEncrypted: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 模板类型
interface Template {
  id: number;
  name: string;
  description: string;
  config: Record<string, unknown>;
  isPublic: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// 管理员状态
interface AdminState {
  // 登录状态
  isLoggedIn: boolean;
  adminUser: AdminUser | null;
  token: string | null;
  
  // 数据
  authorizations: Authorization[];
  templates: Template[];
  
  // 操作方法
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // 授权码管理
  fetchAuthorizations: () => Promise<void>;
  addAuthorization: (data: { tableId: string; tableName: string; appToken: string }) => Promise<void>;
  updateAuthorization: (tableId: string, data: { tableName?: string; appToken?: string; isActive?: boolean }) => Promise<void>;
  deleteAuthorization: (tableId: string) => Promise<void>;
  
  // 模板管理
  fetchTemplates: () => Promise<void>;
  addTemplate: (data: { name: string; description: string; config: Record<string, unknown> }) => Promise<void>;
  updateTemplate: (id: number, data: { name?: string; description?: string; config?: Record<string, unknown> }) => Promise<void>;
  deleteTemplate: (id: number) => Promise<void>;
}

// 模拟数据
const mockAdminUser: AdminUser = {
  id: 1,
  username: 'fsadmins',
  name: '管理员',
  email: 'admin@example.com',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAuthorizations: Authorization[] = [
  {
    id: 1,
    userId: 1,
    tableId: 'table_001',
    tableName: '客户信息表',
    appTokenEncrypted: 'encrypted_token_001',
    isActive: true,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    userId: 1,
    tableId: 'table_002',
    tableName: '订单记录表',
    appTokenEncrypted: 'encrypted_token_002',
    isActive: true,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockTemplates: Template[] = [
  {
    id: 1,
    name: '标准合同模板',
    description: '适用于各类合同文档',
    config: {},
    isPublic: true,
    createdBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: '发票打印模板',
    description: '用于发票打印',
    config: {},
    isPublic: true,
    createdBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // 初始状态
      isLoggedIn: false,
      adminUser: null,
      token: null,
      authorizations: [],
      templates: [],

      // 登录
      login: async (username: string, password: string): Promise<boolean> => {
        // 模拟登录验证
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (username === 'fsadmins' && password === 'Xxy94128866') {
          set({
            isLoggedIn: true,
            adminUser: mockAdminUser,
            token: 'mock_token_' + Date.now(),
            authorizations: mockAuthorizations,
            templates: mockTemplates,
          });
          return true;
        }
        return false;
      },

      // 登出
      logout: () => {
        set({
          isLoggedIn: false,
          adminUser: null,
          token: null,
          authorizations: [],
          templates: [],
        });
      },

      // 授权码管理
      fetchAuthorizations: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        // 保持现有数据不变
      },

      addAuthorization: async (data: { tableId: string; tableName: string; appToken: string }) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        const newAuth: Authorization = {
          id: Date.now(),
          userId: 1,
          tableId: data.tableId,
          tableName: data.tableName,
          appTokenEncrypted: 'encrypted_' + data.appToken,
          isActive: true,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({
          authorizations: [...state.authorizations, newAuth],
        }));
      },

      updateAuthorization: async (tableId: string, data: { tableName?: string; appToken?: string; isActive?: boolean }) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        set(state => ({
          authorizations: state.authorizations.map(auth => {
            if (auth.tableId === tableId) {
              return {
                ...auth,
                ...(data.tableName && { tableName: data.tableName }),
                ...(data.appToken && { appTokenEncrypted: 'encrypted_' + data.appToken }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                updatedAt: new Date().toISOString(),
              };
            }
            return auth;
          }),
        }));
      },

      deleteAuthorization: async (tableId: string) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        set(state => ({
          authorizations: state.authorizations.filter(auth => auth.tableId !== tableId),
        }));
      },

      // 模板管理
      fetchTemplates: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        // 保持现有数据不变
      },

      addTemplate: async (data: { name: string; description: string; config: Record<string, unknown> }) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        const newTemplate: Template = {
          id: Date.now(),
          name: data.name,
          description: data.description,
          config: data.config,
          isPublic: true,
          createdBy: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({
          templates: [...state.templates, newTemplate],
        }));
      },

      updateTemplate: async (id: number, data: { name?: string; description?: string; config?: Record<string, unknown> }) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        set(state => ({
          templates: state.templates.map(template => {
            if (template.id === id) {
              return {
                ...template,
                ...data,
                updatedAt: new Date().toISOString(),
              };
            }
            return template;
          }),
        }));
      },

      deleteTemplate: async (id: number) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        set(state => ({
          templates: state.templates.filter(template => template.id !== id),
        }));
      },
    }),
    {
      name: 'admin-storage',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        adminUser: state.adminUser,
        token: state.token,
      }),
    }
  )
);
