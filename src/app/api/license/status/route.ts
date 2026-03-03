import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { calculateDaysRemaining, getLicenseStatusInfo } from '@/lib/license-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/license/status?userId=xxx
 * 查询用户授权状态
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }
    
    const client = getSupabaseClient();
    
    // 确保 userId 是字符串类型
    const userIdStr = String(userId);
    
    // 查询用户当前有效的授权
    const { data: licenses, error } = await client
      .from('plugin_licenses')
      .select('*')
      .eq('bound_user_id', userIdStr)
      .in('status', ['active', 'unused'])
      .order('valid_until', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('[License Status] 查询授权状态失败:', error);
      return NextResponse.json(
        { success: false, error: '查询授权状态失败' },
        { status: 500 }
      );
    }
    
    // 没有找到授权记录
    if (!licenses || licenses.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasLicense: false,
          isValid: false,
          isExpired: true,
          requireInput: true,
        },
      });
    }
    
    const license = licenses[0];
    const now = new Date();
    const validUntil = license.valid_until ? new Date(license.valid_until) : null;
    
    // 检查是否过期
    const isExpired = !validUntil || validUntil < now;
    const daysRemaining = validUntil ? calculateDaysRemaining(validUntil) : -1;
    
    // 如果已过期，更新状态
    if (isExpired && license.status !== 'expired') {
      await client
        .from('plugin_licenses')
        .update({ status: 'expired' })
        .eq('id', license.id);
      
      // 更新绑定记录状态
      await client
        .from('user_license_bindings')
        .update({ status: 'expired' })
        .eq('license_id', license.id)
        .eq('user_id', userIdStr);
    }
    
    const statusInfo = getLicenseStatusInfo(daysRemaining);
    
    return NextResponse.json({
      success: true,
      data: {
        hasLicense: true,
        isValid: !isExpired,
        isExpired,
        requireInput: isExpired,
        licenseCode: license.code,
        licenseType: license.type,
        durationDays: license.duration_days,
        validUntil: license.valid_until,
        boundAt: license.bound_at,
        daysRemaining: isExpired ? 0 : daysRemaining,
        status: statusInfo.status,
        statusColor: statusInfo.color,
        statusMessage: statusInfo.message,
      },
    });
    
  } catch (error) {
    console.error('[License Status] 查询授权状态错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '查询授权状态失败' },
      { status: 500 }
    );
  }
}
