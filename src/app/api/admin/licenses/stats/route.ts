import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/lib/auth/jwt';

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

  // 检查是否是管理员类型
  if (decoded.type !== 'admin') {
    return { error: '无管理员权限', status: 403 };
  }

  // 获取管理员ID (兼容新旧格式：优先使用 adminId，回退到 userId)
  const adminId = (decoded as any).adminId || (decoded as any).userId;
  if (!adminId) {
    return { error: 'Token 格式错误', status: 401 };
  }

  // 检查是否是管理员
  const client = getSupabaseClient();
  const { data: admin } = await client
    .from('admins')
    .select('*')
    .eq('id', adminId)
    .single();

  if (!admin) {
    return { error: '无管理员权限', status: 403 };
  }

  return { userId: adminId, admin };
}

/**
 * GET /api/admin/licenses/stats
 * 获取授权码统计数据
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
    const client = getSupabaseClient();
    
    // 获取各种状态的授权码数量
    const { data: statusData, error: statusError } = await client
      .from('plugin_licenses')
      .select('status');

    if (statusError) {
      console.error('[Admin Licenses Stats API] 查询状态统计失败:', statusError);
      return NextResponse.json(
        { error: '获取统计数据失败' },
        { status: 500 }
      );
    }

    // 统计各状态数量
    const stats = {
      total: statusData?.length || 0,
      unused: 0,
      active: 0,
      expired: 0,
      revoked: 0,
    };

    statusData?.forEach(item => {
      if (item.status && stats.hasOwnProperty(item.status)) {
        stats[item.status as keyof typeof stats]++;
      }
    });

    // 获取各类型授权码数量
    const { data: typeData, error: typeError } = await client
      .from('plugin_licenses')
      .select('type');

    if (typeError) {
      console.error('[Admin Licenses Stats API] 查询类型统计失败:', typeError);
      return NextResponse.json(
        { error: '获取统计数据失败' },
        { status: 500 }
      );
    }

    const typeStats: Record<string, number> = {
      day: 0,
      week: 0,
      month: 0,
      quarter: 0,
      year: 0,
    };

    typeData?.forEach(item => {
      if (item.type && typeStats.hasOwnProperty(item.type)) {
        typeStats[item.type]++;
      }
    });

    // 获取今日生成的授权码数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayCount, error: todayError } = await client
      .from('plugin_licenses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (todayError) {
      console.error('[Admin Licenses Stats API] 查询今日统计失败:', todayError);
    }

    // 获取最近7天生成的趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: trendData, error: trendError } = await client
      .from('plugin_licenses')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (trendError) {
      console.error('[Admin Licenses Stats API] 查询趋势数据失败:', trendError);
    }

    // 按日期分组统计
    const dailyStats: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = 0;
    }

    trendData?.forEach(item => {
      const dateStr = new Date(item.created_at).toISOString().split('T')[0];
      if (dailyStats.hasOwnProperty(dateStr)) {
        dailyStats[dateStr]++;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        status: stats,
        type: typeStats,
        today: todayCount || 0,
        dailyTrend: Object.entries(dailyStats)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count })),
      },
    });
  } catch (error) {
    console.error('[Admin Licenses Stats API] 获取统计数据错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取统计数据失败' },
      { status: 500 }
    );
  }
}
