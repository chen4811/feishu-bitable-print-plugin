/**
 * 飞书API客户端
 * 封装飞书开放平台的API调用
 */

import {
  FeishuAuthConfig,
  FeishuApiResponse,
  GetTenantAccessTokenRequest,
  GetTenantAccessTokenResponse,
  GetAppTableRequest,
  GetAppTableResponse,
  GetTableFieldRequest,
  GetTableFieldResponse,
  GetTableRecordRequest,
  GetTableRecordResponse,
  CreateRecordRequest,
  CreateRecordResponse,
  UpdateRecordRequest,
  UpdateRecordResponse,
  DeleteRecordRequest,
  DeleteRecordResponse,
} from '@/types/feishu';
import { TokenManager, CacheManager } from './token-manager';

export class FeishuApiClient {
  private static instance: FeishuApiClient;
  private config: FeishuAuthConfig | null = null;
  private tokenManager: TokenManager;
  private cacheManager: CacheManager;
  private readonly BASE_URL = 'https://open.feishu.cn/open-apis';

  private constructor() {
    this.tokenManager = TokenManager.getInstance();
    this.cacheManager = CacheManager.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): FeishuApiClient {
    if (!FeishuApiClient.instance) {
      FeishuApiClient.instance = new FeishuApiClient();
    }
    return FeishuApiClient.instance;
  }

  /**
   * 初始化配置
   */
  public init(config: FeishuAuthConfig): void {
    this.config = config;
  }

  /**
   * 检查是否已初始化
   */
  private checkInitialized(): void {
    if (!this.config) {
      throw new Error('飞书API客户端未初始化，请先调用init方法');
    }
  }

  /**
   * 获取或刷新tenant_access_token
   */
  private async getTenantAccessToken(): Promise<string> {
    // 检查是否有有效的token
    const existingToken = this.tokenManager.getTenantToken();
    if (existingToken) {
      return existingToken;
    }

    this.checkInitialized();

    // 请求新的token
    const response = await fetch(`${this.BASE_URL}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.config!.appId,
        app_secret: this.config!.appSecret,
      } as GetTenantAccessTokenRequest),
    });

    const result: FeishuApiResponse<GetTenantAccessTokenResponse> = await response.json();

    if (result.code !== 0) {
      throw new Error(`获取tenant_access_token失败: ${result.msg} (code: ${result.code})`);
    }

    // 保存token
    this.tokenManager.setTenantToken(result.data.tenant_access_token, result.data.expire);

    return result.data.tenant_access_token;
  }

  /**
   * 发送API请求
   */
  private async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<FeishuApiResponse<T>> {
    const token = await this.getTenantAccessToken();

    const response = await fetch(`${this.BASE_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result: FeishuApiResponse<T> = await response.json();

    if (result.code !== 0) {
      throw new Error(`API请求失败: ${result.msg} (code: ${result.code})`);
    }

    return result;
  }

  /**
   * 获取多维表格的所有表格
   */
  public async getAppTables(appToken: string): Promise<GetAppTableResponse> {
    const cacheKey = `app_tables_${appToken}`;
    const cached = this.cacheManager.get<GetAppTableResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.request<GetAppTableResponse>(`/bitable/v1/apps/${appToken}/tables`);

    // 缓存5分钟
    this.cacheManager.set(cacheKey, result, 300);

    return result;
  }

  /**
   * 获取表格字段
   */
  public async getTableFields(
    appToken: string,
    tableId: string,
    pageSize: number = 100,
    pageToken?: string
  ): Promise<GetTableFieldResponse> {
    const params = new URLSearchParams({ page_size: String(pageSize) });
    if (pageToken) {
      params.append('page_token', pageToken);
    }

    return this.request<GetTableFieldResponse>(
      `/bitable/v1/apps/${appToken}/tables/${tableId}/fields?${params.toString()}`
    );
  }

  /**
   * 获取表格记录
   */
  public async getTableRecords(
    appToken: string,
    tableId: string,
    options: Partial<GetTableRecordRequest> = {}
  ): Promise<GetTableRecordResponse> {
    const params = new URLSearchParams();
    if (options.page_size) params.append('page_size', String(options.page_size));
    if (options.page_token) params.append('page_token', options.page_token);
    if (options.view_id) params.append('view_id', options.view_id);
    if (options.field_names) params.append('field_names', options.field_names.join(','));
    if (options.sort) {
      params.append('sort', JSON.stringify(options.sort));
    }
    if (options.filter) {
      params.append('filter', JSON.stringify(options.filter));
    }

    return this.request<GetTableRecordResponse>(
      `/bitable/v1/apps/${appToken}/tables/${tableId}/records?${params.toString()}`
    );
  }

  /**
   * 创建记录
   */
  public async createRecord(
    appToken: string,
    tableId: string,
    fields: Record<string, any>
  ): Promise<CreateRecordResponse> {
    return this.request<CreateRecordResponse>(`/bitable/v1/apps/${appToken}/tables/${tableId}/records`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    });
  }

  /**
   * 更新记录
   */
  public async updateRecord(
    appToken: string,
    tableId: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<UpdateRecordResponse> {
    return this.request<UpdateRecordResponse>(
      `/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ fields }),
      }
    );
  }

  /**
   * 删除记录
   */
  public async deleteRecord(
    appToken: string,
    tableId: string,
    recordId: string
  ): Promise<DeleteRecordResponse> {
    return this.request<DeleteRecordResponse>(
      `/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * 批量获取所有记录
   */
  public async getAllRecords(
    appToken: string,
    tableId: string,
    options: Partial<GetTableRecordRequest> = {}
  ): Promise<GetTableRecordResponse['items']> {
    const allRecords: GetTableRecordResponse['items'] = [];
    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getTableRecords(appToken, tableId, {
        ...options,
        page_size: 100,
        page_token,
      });

      allRecords.push(...response.items);
      hasMore = response.has_more;
      pageToken = response.page_token;
    }

    return allRecords;
  }
}

/**
 * 获取飞书API客户端实例
 */
export function getFeishuApiClient(): FeishuApiClient {
  return FeishuApiClient.getInstance();
}
