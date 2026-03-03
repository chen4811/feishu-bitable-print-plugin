import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/lib/auth';
import { 
  generateLicenseCodes, 
  getDurationDays,
  type LicenseType 
} from '@/lib/license-utils';

export const dynamic = 'force-dynamic';

/**
 * 验证管理员权限
 */
async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: '未授权', status: 401 };
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return { error: 'Token 无效', status: 401 };
  }

  // 检查是否是管理员
  const client = getSupabaseClient();
  const { data: admin } = await client
    .from('admins')
    .select('*')
    .eq('user_id', decoded.userId)
    .single();

  if (!admin) {
    return { error: '无管理员权限', status: 403 };
  }

  return { userId: decoded.userId, admin };
}

/**
 * GET /api/admin/licenses
 * 获取授权码列表
 */
export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    
    const client = getSupabaseClient();
    
    let query = client
      .from('plugin_licenses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data: licenses, error } = await query;

    if (error) {
      console.error('[Admin Licenses API] 查询失败:', error);
      return NextResponse.json(
        { error: '查询授权码失败' },
        { status: 500 }
      );
    }

    // 处理数据，计算剩余天数等
    const processedLicenses = licenses?.map(license => {
      const now = new Date();
      const validUntil = license.valid_until ? new Date(license.valid_until) : null;
      
      let daysRemaining = null;
      if (validUntil) {
        daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        ...license,
        days_remaining: daysRemaining,
        is_expired: daysRemaining !== null && daysRemaining < 0,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: processedLicenses,
    });
  } catch (error) {
    console.error('[Admin Licenses API] 获取授权码列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取授权码列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/licenses
 * 批量生成授权码
 */
export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json();
    const { count = 1, type = 'month', prefix = '' } = body;
    
    // 验证参数
    if (count < 1 || count > 100) {
      return NextResponse.json(
        { error: '生成数量必须在1-100之间' },
        { status: 400 }
      );
    }
    
    const validTypes = ['day', 'week', 'month', 'quarter', 'year'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: '无效的有效期类型' },
        { status: 400 }
      );
    }

    const durationDays = getDurationDays(type as LicenseType);
    const codes = generateLicenseCodes(count, type as LicenseType, prefix);
    
    const client = getSupabaseClient();
    
    // 批量插入数据库
    const insertData = codes.map(code => ({
      code: code.replace(/-/g, ''), // 存储时不带分隔符
      type,
      duration_days: durationDays,
      status: 'unused',
      created_by: auth.userId,
    }));
    
    const { data: inserted, error } = await client
      .from('plugin_licenses')
      .insert(insertData)
      .select();

    if (error) {
      console.error('[Admin Licenses API] 插入授权码失败:', error);
      return NextResponse.json(
        { error: '生成授权码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        codes: codes, // 返回带格式的授权码
        count: codes.length,
        type,
        duration_days: durationDays,
      },
    });
  } catch (error) {
    console.error('[Admin Licenses API] 生成授权码错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成授权码失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/licenses
 * 作废授权码
 */
export async function DELETE(request: Request) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: '缺少授权码ID' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 更新状态为作废
    const { error } = await client
      .from('plugin_licenses')
      .update({ 
        status: 'revoked',
        expires_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[Admin Licenses API] 作废授权码失败:', error);
      return NextResponse.json(
        { error: '作废授权码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '授权码已作废',
    });
  } catch (error) {
    console.error('[Admin Licenses API] 作废授权码错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '作废授权码失败' },
      { status: 500 }
    );
  }
}
