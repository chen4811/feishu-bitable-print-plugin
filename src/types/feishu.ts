// 飞书API相关类型定义

export interface FeishuAuthConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
}

export interface TenantAccessToken {
  tenant_access_token: string;
  expire: number;
}

export interface UserAccessToken {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
}

export interface FeishuBitable {
  app_token: string;
  table_id?: string;
  name: string;
}

export interface FeishuRecord {
  record_id: string;
  fields: Record<string, any>;
  created_time: number;
  last_modified_time: number;
}

export interface FeishuField {
  field_id: string;
  field_name: string;
  type: number;
  property: Record<string, any>;
}

export interface FeishuView {
  view_id: string;
  view_name: string;
  view_type: number;
  view_config: Record<string, any>;
}

export interface FeishuAppTable {
  table_id: string;
  name: string;
  default_view_id: string;
  field_ids: string[];
}

export interface FeishuSheet {
  sheet_id: string;
  name: string;
  index: number;
  tables: FeishuAppTable[];
}

// API响应格式
export interface FeishuApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

// 获取tenant_access_token请求
export interface GetTenantAccessTokenRequest {
  app_id: string;
  app_secret: string;
}

export interface GetTenantAccessTokenResponse {
  tenant_access_token: string;
  expire: number;
}

// 多维表格相关
export interface GetAppTableRequest {
  app_token: string;
}

export interface GetAppTableResponse {
  tables: FeishuAppTable[];
}

export interface GetTableFieldRequest {
  app_token: string;
  table_id: string;
  page_size?: number;
  page_token?: string;
}

export interface GetTableFieldResponse {
  has_more: boolean;
  page_token: string;
  items: FeishuField[];
}

export interface GetTableRecordRequest {
  app_token: string;
  table_id: string;
  page_size?: number;
  page_token?: string;
  view_id?: string;
  sort?: {
    field_id: string;
    desc?: boolean;
  }[];
  field_names?: string[];
  filter?: {
    conjunction?: 'and' | 'or';
    conditions?: Array<{
      field_id: string;
      operator: 'is' | 'isNot' | 'contains' | 'doesNotContain' | 'isEmpty' | 'isNotEmpty' | 'greater' | 'less' | 'greaterEqual' | 'lessEqual';
      value?: any[];
    }>;
  };
}

export interface GetTableRecordResponse {
  has_more: boolean;
  page_token: string;
  items: FeishuRecord[];
}

export interface CreateRecordRequest {
  app_token: string;
  table_id: string;
  fields: Record<string, any>;
}

export interface CreateRecordResponse {
  record: FeishuRecord;
}

export interface UpdateRecordRequest {
  app_token: string;
  table_id: string;
  record_id: string;
  fields: Record<string, any>;
}

export interface UpdateRecordResponse {
  record: FeishuRecord;
}

export interface DeleteRecordRequest {
  app_token: string;
  table_id: string;
  record_id: string;
}

export interface DeleteRecordResponse {
  success: boolean;
}

// 权限范围
export const FEISHU_SCOPES = {
  // 多维表格权限
  BITABLE: {
    APP: 'bitable:app',
    APP_READONLY: 'bitable:app:readonly',
    APP_SHARED: 'bitable:app.shared',
    APP_SHARED_READONLY: 'bitable:app.shared:readonly',
  },
  // 机器人权限
  ROBOT: {
    SEND_MESSAGE: 'robot:send_message',
  },
} as const;
