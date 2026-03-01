import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  
  // 飞书登录
  feishuLogin: (userInfo: User) => void;
  
  // 绑定授权码
  bindAuthCode: (authCode: string) => void;
  
  // 退出登录
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      authCode: null,
      isAuthCodeBound: false,
      
      feishuLogin: (userInfo: User) => {
        console.log('[userStore] feishuLogin 被调用');
        console.log('[userStore] 用户信息:', userInfo);
        set({
          user: userInfo,
          isLoggedIn: true,
        });
        console.log('[userStore] 登录状态已设置');
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
      
      logout: () => {
        console.log('[userStore] logout 被调用');
        set({
          user: null,
          isLoggedIn: false,
          authCode: null,
          isAuthCodeBound: false,
        });
        console.log('[userStore] 已退出登录');
      },
    }),
    {
      name: 'user-storage',
    }
  )
);
