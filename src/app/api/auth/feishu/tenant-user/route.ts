/**
 * 使用 tenant_access_token 获取用户信息
 * 当客户端无法直接获取用户信息时的降级方案
 */

import { NextResponse } from 'next/server';
import { getSystemConfig } from '@/lib/system-config';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/feishu/tenant-user
 * 使用 tenant_access_token 获取用户信息
 * 
 * 请求体：
 * {
 *   tenantAccessToken: string;
 * }
 */
export async function POST(request: Request) {
  try {
    console.log('[TenantUser] ========== 使用 tenant_access_token 获取用户信息 ==========');

    const body = await request.json();
    const { tenantAccessToken } = body;

    if (!tenantAccessToken) {
      return NextResponse.json(
        { success: false, error: '缺少 tenant_access_token' },
        { status: 400 }
      );
    }

    console.log('[TenantUser] 尝试获取当前用户信息...');

    // 使用 tenant_access_token 调用 OpenAPI 获取当前用户信息
    // 尝试多种 API 端点
    let feishuUser: any = null;
    let apiErrors: string[] = [];

    // 方法1: 使用 contact/v3/users/me
    if (!feishuUser) {
      try {
        console.log('[TenantUser] 尝试调用 contact/v3/users/me...');
        const response = await fetch('https://open.feishu.cn/open-apis/contact/v3/users/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tenantAccessToken}`,
          },
        });
        
        const result = await response.json();
        console.log('[TenantUser] contact/v3/users/me 响应:', result.code);
        
        if (result.code === 0 && result.data?.user) {
          feishuUser = result.data.user;
          console.log('[TenantUser] 通过 contact/v3/users/me 获取成功');
        } else {
          apiErrors.push(`contact/v3/users/me: ${result.msg}`);
        }
      } catch (e) {
        apiErrors.push(`contact/v3/users/me: ${e}`);
      }
    }

    // 方法2: 使用 authen/v1/user_info
    if (!feishuUser) {
      try {
        console.log('[TenantUser] 尝试调用 authen/v1/user_info...');
        const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tenantAccessToken}`,
          },
        });
        
        const result = await response.json();
        console.log('[TenantUser] authen/v1/user_info 响应:', result.code);
        
        if (result.code === 0 && result.data) {
          feishuUser = result.data;
          console.log('[TenantUser] 通过 authen/v1/user_info 获取成功');
        } else {
          apiErrors.push(`authen/v1/user_info: ${result.msg}`);
        }
      } catch (e) {
        apiErrors.push(`authen/v1/user_info: ${e}`);
      }
    }

    // 方法3: 使用 passport/v1/session
    if (!feishuUser) {
      try {
        console.log('[TenantUser] 尝试获取 session 信息...');
        const response = await fetch('https://open.feishu.cn/open-apis/passport/v1/session', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tenantAccessToken}`,
          },
        });
        
        const result = await response.json();
        console.log('[TenantUser] passport/v1/session 响应:', result.code);
        
        if (result.code === 0 && result.data) {
          feishuUser = result.data;
          console.log('[TenantUser] 通过 passport/v1/session 获取成功');
        } else {
          apiErrors.push(`passport/v1/session: ${result.msg}`);
        }
      } catch (e) {
        apiErrors.push(`passport/v1/session: ${e}`);
      }
    }

    if (!feishuUser) {
      console.error('[TenantUser] 所有 API 调用失败:', apiErrors);
      return NextResponse.json(
        { success: false, error: '无法获取用户信息: ' + apiErrors.join('; ') },
        { status: 500 }
      );
    }

    console.log('[TenantUser] 获取到飞书用户信息:', {
      userId: feishuUser.user_id || feishuUser.union_id,
      name: feishuUser.name,
    });

    // 标准化用户数据
    const userInfo = {
      id: feishuUser.user_id || feishuUser.union_id || feishuUser.open_id || '',
      name: feishuUser.name || feishuUser.display_name || '未知用户',
      avatar: feishuUser.avatar_url || feishuUser.avatar || feishuUser.avatar_thumb || '',
      feishuUserId: feishuUser.user_id || feishuUser.union_id || feishuUser.open_id || '',
      email: feishuUser.email || '',
      mobile: feishuUser.mobile || '',
    };

    if (!userInfo.id) {
      return NextResponse.json(
        { success: false, error: '用户信息中缺少ID' },
        { status: 500 }
      );
    }

    // 同步用户到数据库
    console.log('[TenantUser] 同步用户到数据库...');
    
    const client = getSupabaseClient();
    
    // 查找现有用户
    const { data: existingUsers } = await client
      .from('users')
      .select('*')
      .eq('feishu_user_id', userInfo.id);

    let dbUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

    if (dbUser) {
      // 更新现有用户
      console.log('[TenantUser] 更新现有用户:', dbUser.id);
      await client
        .from('users')
        .update({
          name: userInfo.name || dbUser.name,
          avatar: userInfo.avatar || dbUser.avatar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbUser.id);
    } else {
      // 创建新用户
      console.log('[TenantUser] 创建新用户');
      const { data: newUsers } = await client
        .from('users')
        .insert({
          feishu_user_id: userInfo.id,
          name: userInfo.name || '未知用户',
          avatar: userInfo.avatar || '',
        })
        .select();
      dbUser = newUsers?.[0];
    }

    if (!dbUser) {
      throw new Error('数据库操作失败');
    }

    console.log('[TenantUser] 用户同步成功:', dbUser.id);

    // 生成 JWT
    const jwtToken = generateToken({
      userId: dbUser.id,
      feishuUserId: userInfo.id,
      name: userInfo.name,
    });

    console.log('[TenantUser] JWT 生成成功');

    console.log('[TenantUser] ========== 登录成功 ==========');

    return NextResponse.json({
      success: true,
      userInfo: {
        id: dbUser.id,
        name: dbUser.name,
        avatar: dbUser.avatar,
        feishuUserId: userInfo.id,
      },
      token: jwtToken,
    });
  } catch (error) {
    console.error('[TenantUser] 登录失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '登录失败' 
      },
      { status: 500 }
    );
  }
}
