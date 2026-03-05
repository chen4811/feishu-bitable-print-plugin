import { NextResponse } from 'next/server';
import { getRecordsByIds, searchRecords } from '@/lib/feishu-bitable';

export const dynamic = 'force-dynamic';

/**
 * POST /api/feishu/bitable/records/search
 * 搜索飞书多维表格记录
 * 
 * 请求体：
 * {
 *   app_token: string;      // 多维表格 App Token（必填）
 *   table_id: string;       // 数据表 ID（必填）
 *   record_ids?: string[];  // 记录ID数组（可选，优先使用）
 *   filter?: Filter;        // 筛选条件（可选）
 *   field_names?: string[]; // 指定返回的字段（可选）
 *   page_size?: number;     // 分页大小（可选，默认100）
 *   page_token?: string;    // 分页标记（可选）
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { app_token, table_id, record_ids, filter, field_names, page_size, page_token } = body;

    // 验证必需参数
    if (!app_token || !table_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少必要参数: app_token 和 table_id 为必填参数' 
        },
        { status: 400 }
      );
    }

    console.log('[API] 搜索多维表格记录:', { 
      app_token, 
      table_id, 
      hasRecordIds: !!record_ids,
      recordCount: record_ids?.length,
    });

    let records;

    // 如果提供了 record_ids，使用批量获取方式
    if (record_ids && Array.isArray(record_ids) && record_ids.length > 0) {
      records = await getRecordsByIds(app_token, table_id, record_ids);
      
      return NextResponse.json({
        success: true,
        data: records,
        total: records.length,
      });
    } else {
      // 使用筛选条件搜索
      const result = await searchRecords({
        app_token,
        table_id,
        field_names,
        filter,
        page_size: page_size || 100,
        page_token,
      });

      return NextResponse.json({
        success: true,
        data: result.items,
        total: result.total,
        has_more: result.has_more,
        page_token: result.page_token,
      });
    }
  } catch (error) {
    console.error('[API] 搜索多维表格记录失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '搜索记录失败' 
      },
      { status: 500 }
    );
  }
}
