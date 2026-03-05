import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systemConfigs } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// 表是否存在的缓存
let tableChecked = false;

/**
 * 检查并创建 system_configs 表
 */
async function ensureTableExists() {
  if (tableChecked) return;
  
  try {
    // 尝试查询表，如果失败则创建表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_configs (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log('[System Config API] system_configs 表已创建或已存在');
    tableChecked = true;
  } catch (error) {
    console.error('[System Config API] 创建表失败:', error);
    throw error;
  }
}

// 获取系统配置
export async function GET(request: Request) {
  try {
    await ensureTableExists();
    
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      // 获取单个配置
      const config = await db.query.systemConfigs.findFirst({
        where: eq(systemConfigs.key, key),
      });

      if (!config) {
        return NextResponse.json(
          { success: false, error: '配置不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: config,
      });
    }

    // 获取所有配置
    const configs = await db.query.systemConfigs.findMany({
      orderBy: (configs, { asc }) => [asc(configs.key)],
    });

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('[System Config API] 获取配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// 更新或创建系统配置
export async function POST(request: Request) {
  try {
    await ensureTableExists();
    
    const body = await request.json();
    const { key, value, description, isEncrypted } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 检查配置是否已存在
    const existingConfig = await db.query.systemConfigs.findFirst({
      where: eq(systemConfigs.key, key),
    });

    if (existingConfig) {
      // 更新现有配置
      await db
        .update(systemConfigs)
        .set({
          value: String(value),
          description: description || existingConfig.description,
          isEncrypted: isEncrypted ?? existingConfig.isEncrypted,
          updatedAt: new Date(),
        })
        .where(eq(systemConfigs.key, key));
    } else {
      // 创建新配置
      await db.insert(systemConfigs).values({
        key,
        value: String(value),
        description,
        isEncrypted: isEncrypted ?? false,
      });
    }

    return NextResponse.json({
      success: true,
      message: existingConfig ? '配置已更新' : '配置已创建',
    });
  } catch (error) {
    console.error('[System Config API] 保存配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}

// 批量更新配置
export async function PUT(request: Request) {
  try {
    await ensureTableExists();
    
    const body = await request.json();
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { success: false, error: 'configs 必须是数组' },
        { status: 400 }
      );
    }

    for (const config of configs) {
      const { key, value, description, isEncrypted } = config;

      if (!key || value === undefined) {
        continue;
      }

      const existingConfig = await db.query.systemConfigs.findFirst({
        where: eq(systemConfigs.key, key),
      });

      if (existingConfig) {
        await db
          .update(systemConfigs)
          .set({
            value: String(value),
            description: description || existingConfig.description,
            isEncrypted: isEncrypted ?? existingConfig.isEncrypted,
            updatedAt: new Date(),
          })
          .where(eq(systemConfigs.key, key));
      } else {
        await db.insert(systemConfigs).values({
          key,
          value: String(value),
          description,
          isEncrypted: isEncrypted ?? false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: '批量配置已保存',
    });
  } catch (error) {
    console.error('[System Config API] 批量保存配置失败:', error);
    return NextResponse.json(
      { success: false, error: '批量保存配置失败' },
      { status: 500 }
    );
  }
}
