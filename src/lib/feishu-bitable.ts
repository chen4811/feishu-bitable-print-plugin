/**
 * 飞书多维表格 API 封装
 * 用于获取多维表格的字段、记录等数据
 */

import { getAppAccessToken } from './feishu-oauth';

// ==================== 类型定义 ====================

/**
 * 字段类型枚举
 */
export enum FieldType {
  TEXT = 1,              // 文本
  NUMBER = 2,            // 数字
  SINGLE_SELECT = 3,     // 单选
  MULTI_SELECT = 4,      // 多选
  DATE = 5,              // 日期
  CHECKBOX = 7,          // 复选框
  USER = 11,             // 人员
  PHONE = 13,            // 电话号码
  URL = 15,              // 超链接
  ATTACHMENT = 17,       // 附件
  LINK = 18,             // 单向关联
  LOOKUP = 19,           // 查找引用
  FORMULA = 20,          // 公式
  DUPLEX_LINK = 21,      // 双向关联
  LOCATION = 22,         // 地理位置
  GROUP_CHAT = 23,       // 群组
  CREATED_TIME = 1001,   // 创建时间
  MODIFIED_TIME = 1002,  // 最后更新时间
  CREATED_USER = 1003,   // 创建人
  MODIFIED_USER = 1004,  // 修改人
  AUTO_NUMBER = 1005,    // 自动编号
}

/**
 * 字段类型标签映射
 */
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  [FieldType.TEXT]: '文本',
  [FieldType.NUMBER]: '数字',
  [FieldType.SINGLE_SELECT]: '单选',
  [FieldType.MULTI_SELECT]: '多选',
  [FieldType.DATE]: '日期',
  [FieldType.CHECKBOX]: '复选框',
  [FieldType.USER]: '人员',
  [FieldType.PHONE]: '电话号码',
  [FieldType.URL]: '超链接',
  [FieldType.ATTACHMENT]: '附件',
  [FieldType.LINK]: '单向关联',
  [FieldType.LOOKUP]: '查找引用',
  [FieldType.FORMULA]: '公式',
  [FieldType.DUPLEX_LINK]: '双向关联',
  [FieldType.LOCATION]: '地理位置',
  [FieldType.GROUP_CHAT]: '群组',
  [FieldType.CREATED_TIME]: '创建时间',
  [FieldType.MODIFIED_TIME]: '最后更新时间',
  [FieldType.CREATED_USER]: '创建人',
  [FieldType.MODIFIED_USER]: '修改人',
  [FieldType.AUTO_NUMBER]: '自动编号',
};

/**
 * 单选/多选选项
 */
export interface FieldOption {
  name: string;
  id: string;
  color: number;
}

/**
 * 字段属性
 */
export interface FieldProperty {
  // 单选/多选字段
  options?: FieldOption[];
  // 数字/公式字段的显示格式
  formatter?: string;
  // 日期字段的显示格式
  date_formatter?: string;
  // 日期字段中新纪录自动填写创建时间
  auto_fill?: boolean;
  // 人员/关联字段中允许多个
  multiple?: boolean;
  // 单向/双向关联字段中关联的数据表ID
  table_id?: string;
  // 单向/双向关联字段中关联的数据表名称
  table_name?: string;
  // 双向关联字段中关联的数据表对应的字段名称
  back_field_name?: string;
  // 地理位置输入方式
  location?: {
    input_type: 'only_mobile' | 'not_limit';
  };
  // 公式字段的表达式
  formula_expression?: string;
  // 自动编号类型
  auto_serial?: {
    type: 'custom' | 'auto_increment_number';
    options?: Array<{
      type: string;
      value: string;
    }>;
  };
  // 货币币种
  currency_code?: string;
  // 评分字段设置
  rating?: {
    symbol: string;
  };
  // 进度/评分等字段的数据范围
  min?: number;
  max?: number;
  range_customize?: boolean;
  // 字段支持的编辑模式
  allowed_edit_modes?: {
    manual: boolean;
    scan: boolean;
  };
}

/**
 * 多维表格字段
 */
export interface BitableField {
  field_id: string;
  field_name: string;
  type: FieldType;
  ui_type: string;
  is_primary: boolean;
  is_hidden?: boolean;
  description?: string | Array<{ text: string; type: string }>;
  property?: FieldProperty;
}

/**
 * 获取字段列表响应
 */
export interface ListFieldsResponse {
  items: BitableField[];
  total: number;
  has_more: boolean;
  page_token?: string;
}

/**
 * 获取字段列表参数
 */
export interface ListFieldsParams {
  app_token: string;
  table_id: string;
  page_token?: string;
  page_size?: number;
  view_id?: string;
  text_field_as_array?: boolean;
}

// ==================== API 封装 ====================

/**
 * 获取租户访问令牌 (Tenant Access Token)
 * 用于访问多维表格等需要租户权限的 API
 */
export async function getTenantAccessToken(): Promise<string> {
  const { getSystemConfig } = await import('./system-config');
  
  console.log('[Feishu Bitable] 获取 tenant_access_token');
  
  const appId = await getSystemConfig('FEISHU_APP_ID');
  const appSecret = await getSystemConfig('FEISHU_APP_SECRET');

  if (!appId || !appSecret) {
    throw new Error('FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置');
  }

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  const result = await response.json();

  if (result.code !== 0) {
    console.error('[Feishu Bitable] 获取 tenant_access_token 失败:', result);
    throw new Error(`获取租户访问令牌失败: ${result.msg}`);
  }

  console.log('[Feishu Bitable] tenant_access_token 获取成功');
  return result.tenant_access_token;
}

/**
 * 获取多维表格字段列表
 * @param params 查询参数
 * @returns 字段列表
 */
export async function listBitableFields(params: ListFieldsParams): Promise<ListFieldsResponse> {
  const { app_token, table_id, page_token, page_size = 100, view_id, text_field_as_array } = params;
  
  console.log('[Feishu Bitable] 获取字段列表:', { app_token, table_id, view_id });

  const tenantAccessToken = await getTenantAccessToken();

  // 构建查询参数
  const queryParams = new URLSearchParams();
  if (page_token) queryParams.append('page_token', page_token);
  if (page_size) queryParams.append('page_size', page_size.toString());
  if (view_id) queryParams.append('view_id', view_id);
  if (text_field_as_array) queryParams.append('text_field_as_array', 'true');

  const queryString = queryParams.toString();
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/fields${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tenantAccessToken}`,
    },
  });

  const result = await response.json();

  if (result.code !== 0) {
    console.error('[Feishu Bitable] 获取字段列表失败:', result);
    throw new Error(`获取字段列表失败: ${result.msg} (错误码: ${result.code})`);
  }

  console.log('[Feishu Bitable] 获取字段列表成功:', {
    total: result.data?.total,
    itemCount: result.data?.items?.length,
    has_more: result.data?.has_more,
  });

  return {
    items: result.data.items || [],
    total: result.data.total || 0,
    has_more: result.data.has_more || false,
    page_token: result.data.page_token,
  };
}

/**
 * 获取所有字段（自动处理分页）
 * @param params 查询参数
 * @returns 所有字段列表
 */
export async function listAllBitableFields(params: Omit<ListFieldsParams, 'page_token'>): Promise<BitableField[]> {
  const allFields: BitableField[] = [];
  let pageToken: string | undefined;
  
  do {
    const response = await listBitableFields({
      ...params,
      page_token: pageToken,
      page_size: 100,
    });
    
    allFields.push(...response.items);
    pageToken = response.page_token;
  } while (pageToken);

  console.log('[Feishu Bitable] 获取所有字段完成，总数:', allFields.length);
  return allFields;
}

// ==================== 记录操作 ====================

/**
 * 筛选条件
 */
export interface FilterCondition {
  field_name: string;
  operator: 'is' | 'isNot' | 'contains' | 'doesNotContain' | 'isEmpty' | 'isNotEmpty' | 'isGreater' | 'isGreaterEqual' | 'isLess' | 'isLessEqual';
  value?: any;
}

/**
 * 筛选条件组
 */
export interface Filter {
  conjunction: 'and' | 'or';
  conditions: FilterCondition[];
}

/**
 * 多维表格记录
 */
export interface BitableRecord {
  record_id: string;
  fields: Record<string, any>;
  created_time: number;
  updated_time: number;
}

/**
 * 搜索记录参数
 */
export interface SearchRecordsParams {
  app_token: string;
  table_id: string;
  field_names?: string[];
  filter?: Filter;
  page_token?: string;
  page_size?: number;
}

/**
 * 搜索记录响应
 */
export interface SearchRecordsResponse {
  items: BitableRecord[];
  total: number;
  has_more: boolean;
  page_token?: string;
}

/**
 * 根据记录ID批量获取记录
 * @param appToken 多维表格 App Token
 * @param tableId 数据表 ID
 * @param recordIds 记录ID数组
 * @returns 记录列表
 */
export async function getRecordsByIds(
  appToken: string,
  tableId: string,
  recordIds: string[]
): Promise<BitableRecord[]> {
  console.log('[Feishu Bitable] 根据ID批量获取记录:', { appToken, tableId, recordCount: recordIds.length });

  const tenantAccessToken = await getTenantAccessToken();

  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`;

  const payload = {
    field_names: [], // 空数组表示获取所有字段
    filter: {
      conjunction: 'and' as const,
      conditions: [
        {
          field_name: 'record_id',
          operator: 'is' as const,
          value: recordIds,
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tenantAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (result.code !== 0) {
    console.error('[Feishu Bitable] 获取记录失败:', result);
    throw new Error(`获取记录失败: ${result.msg} (错误码: ${result.code})`);
  }

  console.log('[Feishu Bitable] 获取记录成功:', {
    total: result.data?.total,
    itemCount: result.data?.items?.length,
  });

  return result.data?.items || [];
}

/**
 * 搜索记录
 * @param params 搜索参数
 * @returns 记录列表
 */
export async function searchRecords(params: SearchRecordsParams): Promise<SearchRecordsResponse> {
  const { app_token, table_id, field_names, filter, page_token, page_size = 100 } = params;

  console.log('[Feishu Bitable] 搜索记录:', { app_token, table_id, page_size });

  const tenantAccessToken = await getTenantAccessToken();

  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/search`;

  const payload: any = {};
  if (field_names) payload.field_names = field_names;
  if (filter) payload.filter = filter;
  if (page_token) payload.page_token = page_token;
  if (page_size) payload.page_size = page_size;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tenantAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (result.code !== 0) {
    console.error('[Feishu Bitable] 搜索记录失败:', result);
    throw new Error(`搜索记录失败: ${result.msg} (错误码: ${result.code})`);
  }

  return {
    items: result.data?.items || [],
    total: result.data?.total || 0,
    has_more: result.data?.has_more || false,
    page_token: result.data?.page_token,
  };
}
