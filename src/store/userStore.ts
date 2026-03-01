import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useTemplateStore } from './templateStore';

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  feishuUserId?: string;
}

interface UserStore {
  user: User | null;
  isLoggedIn: boolean;
  authCode: string | null;
  isAuthCodeBound: boolean;
  authToken: string | null; // JWT token
  
  // 飞书登录
  feishuLogin: (userInfo: User) => void;
  
  // 绑定授权码
  bindAuthCode: (authCode: string) => void;
  
  // 设置 JWT token
  setAuthToken: (token: string | null) => void;
  
  // 退出登录
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      authCode: null,
      isAuthCodeBound: false,
      authToken: null,
      
      feishuLogin: (userInfo: User) => {
        console.log('[userStore] feishuLogin 被调用');
        console.log('[userStore] 用户信息:', userInfo);
        
        // 生成模拟 JWT token（实际应用中应该从服务器获取）
        const mockToken = btoa(JSON.stringify({
          userId: 1, // 模拟用户 ID
          feishuUserId: userInfo.feishuUserId,
          name: userInfo.name,
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 天过期
        }));
        
        set({
          user: userInfo,
          isLoggedIn: true,
          authToken: mockToken,
        });
        
        // 同步 token 到 templateStore
        useTemplateStore.getState().setAuthToken(mockToken);
        
        // 从服务器加载模板
        useTemplateStore.getState().fetchTemplatesFromServer();
        
        console.log('[userStore] 登录状态已设置，token 已生成');
      },
      
      bindAuthCode: (authCode: string) => {
        console.log('[userStore] bindAuthCode 被调用');
        console.log('[userStore] 授权码:', authCode);
        set({
          authCode,
          isAuthCodeBound: true,
        });
        console.log('[userStore] 授权码已绑定');
      },
      
      setAuthToken: (token: string | null) => {
        console.log('[userStore] setAuthToken 被调用');
        set({ authToken: token });
        
        // 同步到 templateStore
        if (token) {
          useTemplateStore.getState().setAuthToken(token);
        }
      },
      
      logout: () => {
        console.log('[userStore] logout 被调用');
        set({
          user: null,
          isLoggedIn: false,
          authCode: null,
          isAuthCodeBound: false,
          authToken: null,
        });
        
        // 清除 templateStore 的 token
        useTemplateStore.getState().setAuthToken(null);
        
        console.log('[userStore] 已退出登录');
      },
    }),
    {
      name: 'user-storage',
      // 不要持久化 authToken（安全考虑）
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        authCode: state.authCode,
        isAuthCodeBound: state.isAuthCodeBound,
      }),
    }
  )
);

// 初始化时同步 token 到 templateStore
if (typeof window !== 'undefined') {
  const initSync = () => {
    const userState = useUserStore.getState();
    if (userState.authToken) {
      useTemplateStore.getState().setAuthToken(userState.authToken);
    }
  };
  
  // 延迟执行确保 store 已初始化
  setTimeout(initSync, 100);
}
