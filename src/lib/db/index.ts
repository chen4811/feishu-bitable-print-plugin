// 数据库连接配置
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// 创建连接池
const pool = new Pool({
  connectionString: process.env.PGDATABASE_URL || process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db',
  max: 20,
  idleTimeoutMillis: 30000,
});

// 初始化 Drizzle ORM
export const db = drizzle(pool, { schema });
