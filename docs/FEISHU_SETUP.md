# 飞书应用配置指南

本文档详细说明如何在飞书开放平台配置应用，以启用多维表格插件的访问权限。

## 📋 前置要求

1. 飞书企业账号
2. 管理员权限（创建和管理应用）
3. 已安装飞书应用

## 🚀 配置步骤

### 第一步：创建应用

1. 访问 [飞书开放平台](https://open.feishu.cn)
2. 登录你的飞书账号
3. 点击"创建应用"
4. 选择"自建应用"
5. 填写应用信息：
   - **应用名称**：多维表格自定义排版插件
   - **应用描述**：支持多种视图和排版打印的飞书多维表格插件
   - **应用图标**：上传应用图标
6. 点击"创建"

### 第二步：获取凭证信息

创建成功后，进入应用详情页，获取以下信息：

1. **App ID**：在"凭证与基础信息"中找到
2. **App Secret**：在"凭证与基础信息"中找到

**重要**：这些信息需要配置到项目的环境变量中。

```env
NEXT_PUBLIC_FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
```

### 第三步：配置权限范围

在应用详情页，进入"权限管理"页面，配置以下权限：

#### 必需权限

| 权限名称 | 权限代码 | 用途 |
|---------|---------|------|
| 获取多维表格 | `bitable:app:readonly` | 读取多维表格数据 |
| 读取和修改多维表格 | `bitable:app` | 修改多维表格数据 |
| 获取、创建、更新、删除多维表格记录 | `bitable:app.record:readonly` / `bitable:app.record` | 操作表格记录 |

#### 配置步骤

1. 在"权限管理"页面，点击"申请权限"
2. 搜索并添加以下权限：
   - `bitable:app`
   - `bitable:app:readonly`
   - `bitable:app.record`
   - `bitable:app.record:readonly`
3. 选择权限范围：
   - **部分可见范围**：选择需要使用的多维表格
   - **全员可用**：所有用户都可以使用（推荐）

4. 点击"申请"

### 第四步：发布应用

1. 在应用详情页，点击"版本管理与发布"
2. 点击"创建版本"
3. 填写版本信息：
   - **版本号**：1.0.0
   - **更新说明**：初始发布
4. 提交审核
5. 审核通过后，点击"发布"

### 第五步：安装应用

1. 在飞书工作台，进入"应用管理"
2. 搜索你创建的应用
3. 点击"安装"
4. 选择安装范围：
   - **全员安装**：所有成员都可以使用
   - **部分成员安装**：指定成员使用
5. 确认安装

### 第六步：获取多维表格Token

在飞书多维表格中，获取应用的访问token：

1. 打开多维表格
2. 点击右上角"..."菜单
3. 选择"扩展插件" → "管理"
4. 查看或创建插件，获取 `app_token`

## 🔐 安全配置

### 1. IP白名单（可选）

如果你的应用部署在固定IP，可以设置IP白名单：

1. 在"凭证与基础信息"中，找到"IP白名单"
2. 添加你的服务器IP地址
3. 保存

### 2. 加密配置（可选）

为了安全，可以配置事件加密：

1. 在"事件订阅"中，获取 `Encrypt Key`
2. 在"凭证与基础信息"中，获取 `Verification Token`

配置到环境变量：

```env
FEISHU_ENCRYPT_KEY=your_encrypt_key
FEISHU_VERIFICATION_TOKEN=your_verification_token
```

### 3. 权限审核

飞书会对部分权限进行审核，通常需要1-3个工作日。

- 普通权限：自动通过
- 敏感权限：需要人工审核

## 📊 权限说明

### 多维表格相关权限

| 权限 | 说明 | 用途 |
|-----|------|------|
| `bitable:app:readonly` | 只读访问多维表格 | 查看表格数据 |
| `bitable:app` | 读写访问多维表格 | 修改表格数据 |
| `bitable:app.shared` | 访问共享的多维表格 | 访问共享表格 |
| `bitable:app.record:readonly` | 只读访问记录 | 查看记录 |
| `bitable:app.record` | 读写访问记录 | 修改记录 |

### 机器人权限

| 权限 | 说明 | 用途 |
|-----|------|------|
| `robot:send_message` | 发送消息 | 通知用户 |

## ⚙️ 环境变量配置

创建 `.env.local` 文件，配置以下变量：

```env
# 飞书应用配置
NEXT_PUBLIC_FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 可选配置
FEISHU_ENCRYPT_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_VERIFICATION_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 应用配置
NEXT_PUBLIC_APP_NAME=飞书多维表格自定义排版插件
NEXT_PUBLIC_APP_VERSION=2.0.0
```

## 🔍 调试与测试

### 1. 本地调试

```bash
# 复制环境变量配置
cp .env.example .env.local

# 编辑 .env.local，填入你的凭证
vim .env.local

# 启动开发服务器
pnpm dev
```

### 2. 测试API调用

```typescript
// 初始化飞书客户端
const client = getFeishuApiClient();
client.init({
  appId: process.env.FEISHU_APP_ID!,
  appSecret: process.env.FEISHU_APP_SECRET!,
});

// 测试获取表格
const tables = await client.getAppTables('your_app_token');
console.log(tables);
```

### 3. 查看日志

```bash
# 查看飞书API调用日志
tail -f /app/work/logs/bypass/app.log
```

## ❌ 常见问题

### Q1: 提示"app not found"

**原因**：应用未发布或未安装到企业

**解决**：
1. 检查应用是否已发布
2. 检查应用是否已安装到企业
3. 检查App ID是否正确

### Q2: 提示"permission denied"

**原因**：权限未配置或未通过审核

**解决**：
1. 检查权限配置是否完整
2. 等待权限审核通过
3. 检查权限范围是否包含目标表格

### Q3: 提示"tenant_access_token invalid"

**原因**：App Secret错误或已失效

**解决**：
1. 重新获取App Secret
2. 检查环境变量配置
3. 重启应用服务

### Q4: 无法访问多维表格

**原因**：多维表格未分享给应用

**解决**：
1. 在多维表格中，添加应用为协作者
2. 设置合适的权限（可查看、可编辑）
3. 确保应用有访问权限

### Q5: 权限审核被拒绝

**原因**：申请的权限不符合应用场景

**解决**：
1. 检查权限申请理由是否清晰
2. 确保权限与应用功能相关
3. 联系飞书客服说明情况

## 📞 获取帮助

- [飞书开放平台文档](https://open.feishu.cn/document)
- [飞书开发者社区](https://open.feishu.cn/community)
- [多维表格开发指南](https://open.feishu.cn/document/base-extensions/base-automation-extension-development-guide)

## 🔗 相关资源

- [飞书开放平台](https://open.feishu.cn)
- [多维表格API文档](https://open.feishu.cn/document/server-docs/bitable-v1/app-table/list)
- [权限管理文档](https://open.feishu.cn/document/server-docs/authorization-management/how-to-use)

---

**最后更新**：2025-01-12
**文档版本**：v1.0.0
