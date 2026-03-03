import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    console.log('[Debug Licenses API] 调试API被调用');
    console.log('[Debug Licenses API] 查询参数 userId:', userId);
    
    const client = createClient();
    
    // 查询所有授权码
    const { data: allLicenses, error: allError } = await client
      .from('plugin_licenses')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('[Debug Licenses API] 所有授权码数量:', allLicenses?.length || 0);
    if (allLicenses && allLicenses.length > 0) {
      console.log('[Debug Licenses API] 所有授权码详情:', allLicenses.map(l => ({
        id: l.id,
        code: l.code,
        bound_user_id: l.bound_user_id,
        status: l.status,
        valid_until: l.valid_until,
        created_at: l.created_at
      })));
    }
    
    if (allError) {
      console.error('[Debug Licenses API] 查询所有授权码失败:', allError);
    }
    
    let userLicenses = null;
    if (userId) {
      const { data: userData, error: userError } = await client
        .from('plugin_licenses')
        .select('*')
        .eq('bound_user_id', userId);
      
      userLicenses = userData;
      console.log('[Debug Licenses API] 指定用户的授权码数量:', userData?.length || 0);
      if (userError) {
        console.error('[Debug Licenses API] 查询用户授权码失败:', userError);
      }
    }
    
    const now = new Date();
    return NextResponse.json({
      success: true,
      currentTime: now.toISOString(),
      totalLicenses: allLicenses?.length || 0,
      allLicenses: allLicenses?.map(l => ({
        id: l.id,
        code: l.code,
        bound_user_id: l.bound_user_id,
        status: l.status,
        valid_until: l.valid_until,
        isExpired: l.valid_until ? new Date(l.valid_until).getTime() < now.getTime() : true,
        created_at: l.created_at
      })) || [],
      userLicenses: userLicenses?.map(l => ({
        id: l.id,
        code: l.code,
        bound_user_id: l.bound_user_id,
        status: l.status,
        valid_until: l.valid_until,
        isExpired: l.valid_until ? new Date(l.valid_until).getTime() < now.getTime() : true,
      })) || null,
    });
  } catch (error) {
    console.error('[Debug Licenses API] 错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
