import { NextResponse } from 'next/server';
import { getProcessStatus } from '@/lib/feishu-corehr';

export const dynamic = 'force-dynamic';

/**
 * GET /api/feishu/corehr/processes/[id]/status
 * 获取单个流程实例的状态
 * 
 * 路径参数：
 * - id: 流程实例ID
 * 
 * 返回：
 * - status: 状态码
 * - statusText: 状态显示文本
 * - color: 状态颜色
 * - rawData: 原始数据
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processId } = await params;

    if (!processId) {
      return NextResponse.json(
        { success: false, error: '流程实例ID不能为空' },
        { status: 400 }
      );
    }

    console.log('[API] 查询流程状态:', processId);

    // 调用飞书 CoreHR API 获取流程状态
    const statusResult = await getProcessStatus(processId);

    if (!statusResult) {
      return NextResponse.json(
        { success: false, error: '无法获取流程状态' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: statusResult,
    });

  } catch (error) {
    console.error('[API] 查询流程状态失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '查询流程状态失败',
      },
      { status: 500 }
    );
  }
}
