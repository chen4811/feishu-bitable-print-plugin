import { NextRequest, NextResponse } from 'next/server';
import { getFeishuApiClient } from '@/lib/feishu/client';

/**
 * 获取飞书多维表格数据
 * GET /api/feishu/bitables?appToken=xxx&tableId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const appToken = searchParams.get('appToken');
    const tableId = searchParams.get('tableId');
    const operation = searchParams.get('operation') || 'records';

    if (!appToken) {
      return NextResponse.json(
        { error: '缺少appToken参数' },
        { status: 400 }
      );
    }

    const client = getFeishuApiClient();

    switch (operation) {
      case 'tables':
        // 获取所有表格
        const tables = await client.getAppTables(appToken);
        return NextResponse.json(tables);

      case 'fields':
        // 获取表格字段
        if (!tableId) {
          return NextResponse.json(
            { error: '缺少tableId参数' },
            { status: 400 }
          );
        }
        const fields = await client.getTableFields(appToken, tableId);
        return NextResponse.json(fields);

      case 'records':
        // 获取记录
        if (!tableId) {
          return NextResponse.json(
            { error: '缺少tableId参数' },
            { status: 400 }
          );
        }
        const records = await client.getAllRecords(appToken, tableId);
        return NextResponse.json({ items: records });

      default:
        return NextResponse.json(
          { error: '不支持的操作类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('获取飞书数据失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

/**
 * 创建记录
 * POST /api/feishu/bitables
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appToken, tableId, fields } = body;

    if (!appToken || !tableId || !fields) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const client = getFeishuApiClient();
    const result = await client.createRecord(appToken, tableId, fields);

    return NextResponse.json(result);
  } catch (error) {
    console.error('创建记录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

/**
 * 更新记录
 * PUT /api/feishu/bitables
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { appToken, tableId, recordId, fields } = body;

    if (!appToken || !tableId || !recordId || !fields) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const client = getFeishuApiClient();
    const result = await client.updateRecord(appToken, tableId, recordId, fields);

    return NextResponse.json(result);
  } catch (error) {
    console.error('更新记录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

/**
 * 删除记录
 * DELETE /api/feishu/bitables?appToken=xxx&tableId=xxx&recordId=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const appToken = searchParams.get('appToken');
    const tableId = searchParams.get('tableId');
    const recordId = searchParams.get('recordId');

    if (!appToken || !tableId || !recordId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const client = getFeishuApiClient();
    const result = await client.deleteRecord(appToken, tableId, recordId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('删除记录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
