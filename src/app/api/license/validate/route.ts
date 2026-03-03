import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { 
  normalizeLicenseCode, 
  calculateExpiryDate,
  calculateDaysRemaining,
  getDurationDays,
} from '@/lib/license-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/license/validate
 * 验证并绑定授权码
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, userId, userName } = body;
    
    // 参数验证
    if (!code || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 标准化授权码
    const normalizedCode = normalizeLicenseCode(code);
    
    if (normalizedCode.length !== 16) {
      return NextResponse.json(
        { success: false, error: '授权码格式不正确' },
        { status: 400 }
      );
    }
    
    const client = getSupabaseClient();
    
    // 1. 查找授权码
    const { data: license, error: findError } = await client
      .from('plugin_licenses')
      .select('*')
      .eq('code', normalizedCode)
      .single();
    
    if (findError || !license) {
      console.log('[License Validate] 授权码不存在:', normalizedCode);
      return NextResponse.json(
        { success: false, error: '授权码不存在' },
        { status: 404 }
      );
    }
    
    // 2. 检查授权码状态
    if (license.status === 'revoked') {
      return NextResponse.json(
        { success: false, error: '授权码已被作废' },
        { status: 400 }
      );
    }
    
    if (license.status === 'expired') {
      return NextResponse.json(
        { success: false, error: '授权码已过期' },
        { status: 400 }
      );
    }
    
    // 3. 检查是否已被其他用户绑定
    if (license.bound_user_id && license.bound_user_id !== userId) {
      return NextResponse.json(
        { success: false, error: '授权码已被其他用户使用' },
        { status: 400 }
      );
    }
    
    // 4. 检查是否已绑定当前用户（续期场景）
    if (license.bound_user_id === userId && license.valid_until) {
      // 已绑定当前用户，延长有效期
      const currentValidUntil = new Date(license.valid_until);
      const now = new Date();
      
      // 如果已过期，从今天开始计算；否则从原到期日开始计算
      const startDate = currentValidUntil > now ? currentValidUntil : now;
      const newValidUntil = calculateExpiryDate(startDate, license.duration_days);
      
      // 确保 userId 是字符串类型
      const userIdStr = String(userId);
      
      const { error: updateError } = await client
        .from('plugin_licenses')
        .update({
          valid_until: newValidUntil.toISOString(),
          status: 'active',
        })
        .eq('id', license.id);
      
      if (updateError) {
        console.error('[License Validate] 更新授权码失败:', updateError);
        return NextResponse.json(
          { success: false, error: '激活授权码失败' },
          { status: 500 }
        );
      }
      
      // 记录绑定历史
      await client.from('user_license_bindings').insert({
        license_id: license.id,
        user_id: userIdStr,
        user_name: userName,
        valid_until: newValidUntil.toISOString(),
        status: 'active',
      });
      
      const daysRemaining = calculateDaysRemaining(newValidUntil);
      
      return NextResponse.json({
        success: true,
        data: {
          message: '授权码续期成功',
          validUntil: newValidUntil.toISOString(),
          daysRemaining,
          isRenewal: true,
        },
      });
    }
    
    // 5. 新绑定用户
    const validUntil = calculateExpiryDate(new Date(), license.duration_days);
    
    // 确保 userId 是字符串类型（与登录查询时一致）
    const userIdStr = String(userId);
    
    const { error: updateError } = await client
      .from('plugin_licenses')
      .update({
        status: 'active',
        bound_user_id: userIdStr,
        bound_user_name: userName,
        bound_at: new Date().toISOString(),
        valid_until: validUntil.toISOString(),
      })
      .eq('id', license.id);
    
    if (updateError) {
      console.error('[License Validate] 绑定授权码失败:', updateError);
      return NextResponse.json(
        { success: false, error: '激活授权码失败' },
        { status: 500 }
      );
    }
    
    // 记录绑定历史
    await client.from('user_license_bindings').insert({
      license_id: license.id,
      user_id: userId,
      user_name: userName,
      valid_until: validUntil.toISOString(),
      status: 'active',
    });
    
    const daysRemaining = calculateDaysRemaining(validUntil);
    
    return NextResponse.json({
      success: true,
      data: {
        message: '授权码激活成功',
        validUntil: validUntil.toISOString(),
        daysRemaining,
        isRenewal: false,
      },
    });
    
  } catch (error) {
    console.error('[License Validate] 验证授权码错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '验证授权码失败' },
      { status: 500 }
    );
  }
}
