import { NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth/jwt';
import {
  getCredentialById,
  updateCredential,
  deleteCredential,
} from '@/lib/feishu-credentials';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/credentials/[id]
 * 更新凭证
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '无效的凭证 ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { appName, appId, appSecret, appType, isActive, description } = body;

    console.log('[Admin API] 管理员更新凭证:', { id, appName, admin: admin.username });

    const credential = await updateCredential(id, {
      appName,
      appId,
      appSecret,
      appType,
      isActive,
      description,
    });

    if (!credential) {
      return NextResponse.json(
        { success: false, error: '凭证不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: credential,
    });
  } catch (error) {
    console.error('[Admin API] 更新凭证失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '更新凭证失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/credentials/[id]
 * 删除凭证
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: '无效的凭证 ID' },
        { status: 400 }
      );
    }

    console.log('[Admin API] 管理员删除凭证:', { id, admin: admin.username });

    const success = await deleteCredential(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '凭证不存在或删除失败' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '凭证已删除',
    });
  } catch (error) {
    console.error('[Admin API] 删除凭证失败:', error);
    return NextResponse.json(
      { success: false, error: '删除凭证失败' },
      { status: 500 }
    );
  }
}
