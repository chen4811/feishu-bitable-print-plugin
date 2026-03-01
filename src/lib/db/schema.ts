// 数据库 Schema 定义
import { pgTable, serial, text, timestamp, jsonb, boolean, varchar, integer, uniqueIndex } from 'drizzle-orm/pg-core';

// 用户表
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  feishuUserId: text('feishu_user_id').unique().notNull(),
  feishuUnionId: text('feishu_union_id'),
  name: text('name'),
  avatar: text('avatar'),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 用户表格授权表 - 核心：用户与授权码的关联
export const userTableAuthorizations = pgTable('user_table_authorizations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  tableId: text('table_id').notNull(),
  tableName: text('table_name'),
  // 授权码（加密存储）
  appToken: text('app_token').notNull(),
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    // 唯一约束：一个用户对一个表格只有一个授权码
    userTableUnique: uniqueIndex('user_table_unique').on(table.userId, table.tableId),
  };
});

// 模板表
export const templates = pgTable('templates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  // 模板数据（JSON格式存储完整的编辑器状态
  data: jsonb('data').notNull(),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 模板分享表
export const templateShares = pgTable('template_shares', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => templates.id),
  shareToken: varchar('share_token', { length: 64 }).unique().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
