/**
 * 飞书 CoreHR 流程查询 API 封装
 * 用于查询飞书人事审批中心的流程实例
 */

import { getAppAccessToken } from './feishu-oauth';

// ==================== 类型定义 ====================

/**
 * 流程状态枚举
 */
export enum ProcessStatus {
  IN_PROGRESS = 1,      // 进行中
  REJECTED = 2,          // 已拒绝
  WITHDRAWN = 4,         // 已撤回
  REVOKED = 8,           // 已撤销
  COMPLETED = 9,         // 已完成
  REVOKING = 15,         // 撤销中
}

/**
 * 流程状态映射（用于显示）
 */
export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  [ProcessStatus.IN_PROGRESS]: '进行中',
  [ProcessStatus.REJECTED]: '已拒绝',
  [ProcessStatus.WITHDRAWN]: '已撤回',
  [ProcessStatus.REVOKED]: '已撤销',
  [ProcessStatus.COMPLETED]: '已完成',
  [ProcessStatus.REVOKING]: '撤销中',
};

/**
 * 流程实例查询参数
 */
export interface ProcessQueryParams {
  statuses?: ProcessStatus[];          // 流程状态列表
  page_token?: string;                  // 分页标记
  page_size: number;                    // 分页大小（1-100）
  modify_time_from: string;             // 修改时间起始值（毫秒时间戳）
  modify_time_to: string;               // 修改时间终止值（毫秒时间戳）
  flow_definition_id?: string;          // 流程定义ID
}

/**
 * 流程实例
 */
export interface ProcessInstance {
  process_id: string;                   // 流程实例ID
  flow_definition_id: string;           // 流程定义ID
  flow_definition_name: string;         // 流程定义名称
  status: ProcessStatus;                // 流程状态
  initiator_id: string;                 // 发起人ID
  initiator_name: string;               // 发起人姓名
  create_time: string;                  // 创建时间（毫秒时间戳）
  modify_time: string;                  // 修改时间（毫秒时间戳）
  business_key?: string;                // 业务Key
  form_data?: Record<string, any>;     // 表单数据
}

/**
 * 飞书 API 响应格式
 */
interface FeishuProcessListResponse {
  code: number;
  msg: string;
  data: {
    items: ProcessInstance[];
    page_token?: string;
    has_more: boolean;
  };
}

// ==================== API 封装 ====================

/**
 * 查询流程实例列表
 * @param params 查询参数
 * @returns 流程实例列表和分页信息
 */
export async function queryProcessInstances(
  params: ProcessQueryParams
): Promise<{
  items: ProcessInstance[];
  page_token?: string;
  has_more: boolean;
}> {
  console.log('[Feishu CoreHR] 查询流程实例列表，参数:', params);

  const appAccessToken = await getAppAccessToken();

  // 构建查询参数
  const searchParams = new URLSearchParams();
  
  // 处理状态列表（需要多次传递同一参数名）
  if (params.statuses && params.statuses.length > 0) {
    params.statuses.forEach(status => {
      searchParams.append('statuses', String(status));
    });
  }
  
  // 其他参数
  searchParams.set('page_size', String(params.page_size));
  searchParams.set('modify_time_from', params.modify_time_from);
  searchParams.set('modify_time_to', params.modify_time_to);
  
  if (params.page_token) {
    searchParams.set('page_token', params.page_token);
  }
  
  if (params.flow_definition_id) {
    searchParams.set('flow_definition_id', params.flow_definition_id);
  }

  const url = `https://open.feishu.cn/open-apis/corehr/v2/processes?${searchParams.toString()}`;
  
  console.log('[Feishu CoreHR] 请求URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${appAccessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

  const result: FeishuProcessListResponse = await response.json();

  console.log('[Feishu CoreHR] 飞书 API 响应:', result);

  if (result.code !== 0) {
    console.error('[Feishu CoreHR] 查询流程实例失败:', result);
    throw new Error(`查询流程实例失败: ${result.msg} (code: ${result.code})`);
  }

  return {
    items: result.data.items,
    page_token: result.data.page_token,
    has_more: result.data.has_more,
  };
}

/**
 * 获取最近的流程实例（默认查询最近30天的数据）
 * @param options 选项
 * @returns 流程实例列表
 */
export async function getRecentProcessInstances(options?: {
  statuses?: ProcessStatus[];
  limit?: number;
  days?: number;
}): Promise<ProcessInstance[]> {
  const { 
    statuses, 
    limit = 50, 
    days = 30 
  } = options || {};

  const now = Date.now();
  const modifyTimeTo = String(now);
  const modifyTimeFrom = String(now - days * 24 * 60 * 60 * 1000);

  let allItems: ProcessInstance[] = [];
  let pageToken: string | undefined;
  const pageSize = Math.min(limit, 100);

  do {
    const result = await queryProcessInstances({
      statuses,
      page_token: pageToken,
      page_size: pageSize,
      modify_time_from: modifyTimeFrom,
      modify_time_to: modifyTimeTo,
    });

    allItems = allItems.concat(result.items);
    pageToken = result.page_token;

    // 达到限制数量时停止
    if (allItems.length >= limit) {
      allItems = allItems.slice(0, limit);
      break;
    }

  } while (pageToken);

  return allItems;
}

/**
 * 格式化流程实例数据，便于模板使用
 * @param process 流程实例
 * @returns 格式化后的数据
 */
export function formatProcessForTemplate(process: ProcessInstance): Record<string, any> {
  return {
    // 基础信息
    '流程ID': process.process_id,
    '流程定义ID': process.flow_definition_id,
    '流程名称': process.flow_definition_name,
    
    // 状态信息
    '状态': PROCESS_STATUS_LABELS[process.status] || '未知状态',
    '状态码': process.status,
    
    // 发起人信息
    '发起人ID': process.initiator_id,
    '发起人': process.initiator_name,
    
    // 时间信息
    '创建时间': formatTimestamp(process.create_time),
    '修改时间': formatTimestamp(process.modify_time),
    
    // 业务Key
    '业务Key': process.business_key || '',
    
    // 表单数据（如果有）
    ...(process.form_data || {}),
  };
}

/**
 * 格式化时间戳为可读格式
 * @param timestamp 毫秒时间戳字符串
 * @returns 格式化后的时间字符串
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(Number(timestamp));
    if (isNaN(date.getTime())) {
      return '-';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

// ==================== 流程状态查询 ====================

/**
 * 流程状态查询结果
 */
export interface ProcessStatusResult {
  processId: string;
  status: string;
  statusText: string;
  color: string;
  rawData?: any;
}

/**
 * 状态颜色映射
 */
export const PROCESS_STATUS_COLORS: Record<string, string> = {
  'PENDING': '#FF7D00',     // 橙色 - 待处理
  'APPROVING': '#3370FF',   // 蓝色 - 审批中
  'APPROVED': '#00B42A',    // 绿色 - 已通过
  'REJECTED': '#F53F3F',    // 红色 - 已拒绝
  'CANCELLED': '#86909C',   // 灰色 - 已取消
  'COMPLETED': '#00B42A',   // 绿色 - 已完成
  'IN_PROGRESS': '#3370FF', // 蓝色 - 进行中
  'WITHDRAWN': '#86909C',   // 灰色 - 已撤回
  'REVOKED': '#86909C',     // 灰色 - 已撤销
  'REVOKING': '#FF7D00',    // 橙色 - 撤销中
  'UNKNOWN': '#86909C',     // 灰色 - 未知
};

/**
 * 状态文本映射
 */
export const PROCESS_STATUS_TEXTS: Record<string, string> = {
  'PENDING': '待处理',
  'APPROVING': '审批中',
  'APPROVED': '已通过',
  'REJECTED': '已拒绝',
  'CANCELLED': '已取消',
  'COMPLETED': '已完成',
  'IN_PROGRESS': '进行中',
  'WITHDRAWN': '已撤回',
  'REVOKED': '已撤销',
  'REVOKING': '撤销中',
  'UNKNOWN': '未知状态',
};

/**
 * 飞书 CoreHR 流程变量数据响应
 */
interface FeishuFlowVariableResponse {
  code: number;
  msg: string;
  data?: {
    process_id: string;
    process_status?: string;
    status?: string;
    variables?: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * 获取流程实例状态
 * 调用飞书 CoreHR API 获取流程的实时状态
 * 
 * @param processId 流程实例ID
 * @returns 流程状态结果
 */
export async function getProcessStatus(processId: string): Promise<ProcessStatusResult | null> {
  try {
    console.log('[Feishu CoreHR] 查询流程状态:', processId);

    const appAccessToken = await getAppAccessToken();

    // 调用飞书 CoreHR API 获取流程变量数据
    const response = await fetch(
      `https://open.feishu.cn/open-apis/corehr/v2/processes/${processId}/flow_variable_data`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${appAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: FeishuFlowVariableResponse = await response.json();

    if (data.code !== 0) {
      console.error('[Feishu CoreHR] API返回错误:', data.msg);
      return null;
    }

    // 提取流程状态
    const status = extractStatusFromResponse(data);
    
    return {
      processId,
      status,
      statusText: PROCESS_STATUS_TEXTS[status] || status,
      color: PROCESS_STATUS_COLORS[status] || PROCESS_STATUS_COLORS['UNKNOWN'],
      rawData: data.data,
    };

  } catch (error) {
    console.error('[Feishu CoreHR] 查询流程状态失败:', error);
    return null;
  }
}

/**
 * 从 API 响应中提取状态
 */
function extractStatusFromResponse(response: FeishuFlowVariableResponse): string {
  const data = response.data;
  if (!data) return 'UNKNOWN';

  // 尝试从多个可能的字段中提取状态
  const status = data.process_status || data.status;
  
  if (status) {
    return normalizeStatus(status);
  }

  // 从变量中提取
  if (data.variables) {
    return extractStatusFromVariables(data.variables);
  }

  return 'UNKNOWN';
}

/**
 * 从流程变量中提取状态
 */
function extractStatusFromVariables(variables: Record<string, any>): string {
  // 常见的状态字段名
  const statusFields = ['status', 'process_status', '审批状态', '流程状态', 'state'];
  
  for (const field of statusFields) {
    if (variables[field]) {
      return normalizeStatus(variables[field]);
    }
  }

  // 遍历所有变量查找状态
  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === 'string') {
      const upperValue = value.toUpperCase();
      if (PROCESS_STATUS_TEXTS[upperValue]) {
        return upperValue;
      }
    }
  }

  return 'UNKNOWN';
}

/**
 * 标准化状态值
 */
function normalizeStatus(status: string): string {
  const upperStatus = status.toUpperCase();
  
  // 直接匹配
  if (PROCESS_STATUS_TEXTS[upperStatus]) {
    return upperStatus;
  }

  // 中文状态映射
  const chineseMap: Record<string, string> = {
    '待处理': 'PENDING',
    '审批中': 'APPROVING',
    '进行中': 'IN_PROGRESS',
    '已通过': 'APPROVED',
    '已拒绝': 'REJECTED',
    '已取消': 'CANCELLED',
    '已完成': 'COMPLETED',
    '已撤回': 'WITHDRAWN',
    '已撤销': 'REVOKED',
    '撤销中': 'REVOKING',
  };

  if (chineseMap[status]) {
    return chineseMap[status];
  }

  // 数字状态码映射
  const numericMap: Record<string, string> = {
    '1': 'IN_PROGRESS',
    '2': 'REJECTED',
    '4': 'WITHDRAWN',
    '8': 'REVOKED',
    '9': 'COMPLETED',
    '15': 'REVOKING',
  };

  if (numericMap[status]) {
    return numericMap[status];
  }

  return 'UNKNOWN';
}

