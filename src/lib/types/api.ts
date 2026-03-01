// API 通用类型定义

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 模板相关类型
export interface Template {
  id: number;
  userId: number;
  name: string;
  description?: string;
  thumbnail?: string;
  data: any;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  thumbnail?: string;
  data: any;
  userId: number;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  thumbnail?: string;
  data?: any;
  isPublic?: boolean;
}

// 用户相关类型
export interface User {
  id: number;
  feishuUserId: string;
  feishuUnionId?: string;
  name?: string;
  avatar?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// 飞书相关类型
export interface FeishuUserInfo {
  sub: string;
  name: string;
  picture: string;
  email: string;
  union_id?: string;
}
