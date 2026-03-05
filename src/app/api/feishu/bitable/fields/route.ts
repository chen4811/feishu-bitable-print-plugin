import { NextResponse } from 'next/server';
import { listBitableFields, listAllBitableFields } from '@/lib/feishu-bitable';

export const dynamic = 'force-dynamic';

/**
 * GET /api/feishu/bitable/fields
 * 获取飞书多维表格字段列表
 * 
 * 查询参数：
 * - app_token: 多维表格 App 的唯一标识（必填）
 * - table_id: 数据表的唯一标识（必填）
 * - view_id: 视图的唯一标识（可选）
 * - page_size: 分页大小（可选，默认100，最大100）
 * - page_token: 分页标记（可选）
 * - all: 是否获取所有字段（可选，true 时自动处理分页）
 * - text_field_as_array: 字段描述是否以数组格式返回（可选）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 获取必要参数
    const app_token = searchParams.get('app_token');
    const table_id = searchParams.get('table_id');
    
    if (!app_token || !table_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少必要参数: app_token 和 table_id 为必填参数' 
        },
        { status: 400 }
      );
    }

    // 获取可选参数
    const view_id = searchParams.get('view_id') || undefined;
    const page_size = parseInt(searchParams.get('page_size') || '100', 10);
    const page_token = searchParams.get('page_token') || undefined;
    const all = searchParams.get('all') === 'true';
    const text_field_as_array = searchParams.get('text_field_as_array') === 'true';

    console.log('[API] 获取多维表格字段:', { app_token, table_id, view_id, all });

    if (all) {
      // 获取所有字段（自动处理分页）
      const fields = await listAllBitableFields({
        app_token,
        table_id,
        view_id,
        text_field_as_array,
      });

      return NextResponse.json({
        success: true,
        data: fields,
        total: fields.length,
      });
    } else {
      // 分页获取字段
      const result = await listBitableFields({
        app_token,
        table_id,
        view_id,
        page_size,
        page_token,
        text_field_as_array,
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
    console.error('[API] 获取多维表格字段失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取字段列表失败' 
      },
      { status: 500 }
    );
  }
}
