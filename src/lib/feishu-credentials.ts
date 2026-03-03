/**
 * 飞书应用凭证管理服务
 * 用于管理多个飞书应用的凭证（AppID, AppSecret）
 */

import { db } from '@/lib/db';
import { feishuAppCredentials } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

// 加密密钥（应该从环境变量读取）
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'your-encryption-key-min-32-chars-long!';

/**
 * 加密文本
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * 解密文本
 */
function decrypt(text: string): string {
  const parts = text.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 凭证信息（不包含敏感信息）
 */
export interface CredentialInfo {
  id: number;
  appName: string;
  appId: string;
  appType: string;
  isActive: boolean;
  description: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 完整凭证信息（包含密钥）
 */
export interface CredentialWithSecret extends CredentialInfo {
  appSecret: string;
}

/**
 * 创建凭证
 */
export async function createCredential(data: {
  appName: string;
  appId: string;
  appSecret: string;
  appType?: string;
  description?: string;
}): Promise<CredentialInfo> {
  const encryptedSecret = encrypt(data.appSecret);
  
  const [credential] = await db
    .insert(feishuAppCredentials)
    .values({
      appName: data.appName,
      appId: data.appId,
      appSecret: encryptedSecret,
      appType: data.appType || 'internal',
      description: data.description,
    })
    .returning({
      id: feishuAppCredentials.id,
      appName: feishuAppCredentials.appName,
      appId: feishuAppCredentials.appId,
      appType: feishuAppCredentials.appType,
      isActive: feishuAppCredentials.isActive,
      description: feishuAppCredentials.description,
      lastUsedAt: feishuAppCredentials.lastUsedAt,
      createdAt: feishuAppCredentials.createdAt,
      updatedAt: feishuAppCredentials.updatedAt,
    });
  
  return credential;
}

/**
 * 获取所有凭证列表
 */
export async function getAllCredentials(): Promise<CredentialInfo[]> {
  return await db
    .select({
      id: feishuAppCredentials.id,
      appName: feishuAppCredentials.appName,
      appId: feishuAppCredentials.appId,
      appType: feishuAppCredentials.appType,
      isActive: feishuAppCredentials.isActive,
      description: feishuAppCredentials.description,
      lastUsedAt: feishuAppCredentials.lastUsedAt,
      createdAt: feishuAppCredentials.createdAt,
      updatedAt: feishuAppCredentials.updatedAt,
    })
    .from(feishuAppCredentials)
    .orderBy(desc(feishuAppCredentials.createdAt));
}

/**
 * 根据 ID 获取凭证
 */
export async function getCredentialById(id: number): Promise<CredentialWithSecret | null> {
  const [credential] = await db
    .select()
    .from(feishuAppCredentials)
    .where(eq(feishuAppCredentials.id, id))
    .limit(1);
  
  if (!credential) {
    return null;
  }
  
  // 解密密钥
  const decryptedSecret = decrypt(credential.appSecret);
  
  return {
    ...credential,
    appSecret: decryptedSecret,
  };
}

/**
 * 根据 AppID 获取凭证
 */
export async function getCredentialByAppId(appId: string): Promise<CredentialWithSecret | null> {
  const [credential] = await db
    .select()
    .from(feishuAppCredentials)
    .where(eq(feishuAppCredentials.appId, appId))
    .limit(1);
  
  if (!credential) {
    return null;
  }
  
  // 解密密钥
  const decryptedSecret = decrypt(credential.appSecret);
  
  return {
    ...credential,
    appSecret: decryptedSecret,
  };
}

/**
 * 更新凭证
 */
export async function updateCredential(
  id: number,
  data: {
    appName?: string;
    appId?: string;
    appSecret?: string;
    appType?: string;
    isActive?: boolean;
    description?: string;
  }
): Promise<CredentialInfo | null> {
  const updateData: any = {
    updatedAt: new Date(),
  };
  
  if (data.appName !== undefined) updateData.appName = data.appName;
  if (data.appId !== undefined) updateData.appId = data.appId;
  if (data.appSecret !== undefined) updateData.appSecret = encrypt(data.appSecret);
  if (data.appType !== undefined) updateData.appType = data.appType;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.description !== undefined) updateData.description = data.description;
  
  const [credential] = await db
    .update(feishuAppCredentials)
    .set(updateData)
    .where(eq(feishuAppCredentials.id, id))
    .returning({
      id: feishuAppCredentials.id,
      appName: feishuAppCredentials.appName,
      appId: feishuAppCredentials.appId,
      appType: feishuAppCredentials.appType,
      isActive: feishuAppCredentials.isActive,
      description: feishuAppCredentials.description,
      lastUsedAt: feishuAppCredentials.lastUsedAt,
      createdAt: feishuAppCredentials.createdAt,
      updatedAt: feishuAppCredentials.updatedAt,
    });
  
  return credential || null;
}

/**
 * 删除凭证
 */
export async function deleteCredential(id: number): Promise<boolean> {
  const result = await db
    .delete(feishuAppCredentials)
    .where(eq(feishuAppCredentials.id, id));
  
  return result.rowCount ? result.rowCount > 0 : false;
}

/**
 * 更新最后使用时间
 */
export async function updateLastUsedAt(id: number): Promise<void> {
  await db
    .update(feishuAppCredentials)
    .set({ lastUsedAt: new Date() })
    .where(eq(feishuAppCredentials.id, id));
}
