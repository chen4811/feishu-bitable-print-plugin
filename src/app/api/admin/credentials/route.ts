import { NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth/jwt';
import {
  getAllCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
} from '@/lib/feishu-credentials';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/credentials
 * 获取所有应用凭证列表
 */
export async function GET(request: Request) {
  try {
    // 验证管理员身份
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    console.log('[Admin API] 管理员获取凭证列表:', admin.username);

    const credentials = await getAllCredentials();

    return NextResponse.json({
      success: true,
      data: credentials,
    });
  } catch (error) {
    console.error('[Admin API] 获取凭证列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取凭证列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/credentials
 * 创建新凭证
 */
export async function POST(request: Request) {
  try {
    // 验证管理员身份
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { appName, appId, appSecret, appType, description } = body;

    // 验证必填字段
    if (!appName || !appId || !appSecret) {
      return NextResponse.json(
        { success: false, error: '应用名称、AppID 和 AppSecret 为必填项' },
        { status: 400 }
      );
    }

    console.log('[Admin API] 管理员创建凭证:', { appName, appId, admin: admin.username });

    const credential = await createCredential({
      appName,
      appId,
      appSecret,
      appType: appType || 'internal',
      description,
    });

    return NextResponse.json({
      success: true,
      data: credential,
    });
  } catch (error) {
    console.error('[Admin API] 创建凭证失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '创建凭证失败' },
      { status: 500 }
    );
  }
}
