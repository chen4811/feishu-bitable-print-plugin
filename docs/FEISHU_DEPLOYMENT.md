# 飞书多维表格边栏插件 - 部署指南

## 📋 目录

1. [环境要求](#环境要求)
2. [项目配置](#项目配置)
3. [构建打包](#构建打包)
4. [上传部署](#上传部署)
5. [调试测试](#调试测试)
6. [常见问题](#常见问题)

## 环境要求

- Node.js 18+
- pnpm 8+
- 飞书开放平台账号

## 项目配置

### 1. manifest.json 配置

`public/manifest.json` 是飞书插件的核心配置文件，必须包含以下字段：

```json
{
  "manifestVersion": 0.1,
  "apiVersion": "0.1.0",
  "id": "插件唯一ID",
  "name": {
    "zh-CN": "中文名称",
    "en-US": "English Name"
  },
  "description": {
    "zh-CN": "中文描述",
    "en-US": "English Description"
  },
  "version": "1.0.0",
  "author": "作者名称",
  "icon": {
    "key": "icon.png"
  },
  "api": {
    "bitable": {
      "permissions": [
        "bitable:app:read",
        "bitable:app:write"
      ]
    }
  },
  "openModes": {
    "sidebar": {
      "height": 720,
      "width": 480
    }
  }
}
```

### 2. 关键文件

| 文件 | 说明 | 必需 |
|------|------|------|
| `public/manifest.json` | 插件配置文件 | ✅ 必需 |
| `public/index.html` | 插件入口文件 | ✅ 必需 |
| `public/icon.png` | 插件图标（256×256） | ✅ 必需 |

## 构建打包

### 方法一：使用构建脚本（推荐）

```bash
# 给脚本添加执行权限
chmod +x scripts/build-for-feishu.sh

# 运行构建脚本
./scripts/build-for-feishu.sh
```

### 方法二：手动构建

```bash
# 1. 安装依赖
pnpm install

# 2. 构建项目
pnpm build

# 3. 创建插件目录
mkdir -p feishu-plugin

# 4. 复制必要文件
cp -r out/* feishu-plugin/
cp public/manifest.json feishu-plugin/
cp public/index.html feishu-plugin/
cp public/icon.png feishu-plugin/

# 5. 打包
cd feishu-plugin
zip -r ../plugin.zip *
```

### 构建输出

构建完成后会生成以下文件：

```
feishu-plugin/
├── manifest.json        # 插件配置
├── index.html           # 入口文件
├── icon.png            # 插件图标
├── _next/              # Next.js 构建输出
└── ...
```

## 上传部署

### 步骤 1：登录飞书开放平台

访问：https://open.feishu.cn

### 步骤 2：创建应用

1. 进入「应用管理」
2. 点击「创建应用」
3. 选择「自建应用」
4. 填写应用信息

### 步骤 3：配置插件

1. 进入应用详情
2. 点击「插件管理」
3. 点击「创建插件」
4. 选择「多维表格 - 边栏插件」
5. 填写插件信息

### 步骤 4：上传插件包

1. 点击「上传插件」
2. 选择构建好的 `plugin.zip` 文件
3. 等待上传完成

### 步骤 5：配置权限

在「权限管理」中申请以下权限：

- `bitable:app:read` - 读取表格数据
- `bitable:app:write` - 写入表格数据

### 步骤 6：提交审核

1. 检查插件信息
2. 确认权限配置
3. 提交审核
4. 等待审核通过

### 步骤 7：发布上线

审核通过后，点击「发布」即可上线。

## 调试测试

### 本地调试

在飞书环境中，可以使用开发者工具调试：

1. 打开插件
2. 右键点击插件区域
3. 选择「检查」
4. 在开发者工具中查看控制台

### 测试清单

- [ ] 插件能正常加载
- [ ] 界面显示正常
- [ ] 多视图切换正常
- [ ] 打印功能正常
- [ ] 二维码生成正常
- [ ] 条形码生成正常
- [ ] PDF导出正常
- [ ] 批量操作正常

### 常见调试方法

```javascript
// 在控制台检查 SDK 是否加载
console.log(window.bitable);

// 检查是否在飞书环境中
console.log(typeof window.bitable !== 'undefined');

// 查看插件配置
console.log(require('./manifest.json'));
```

## 常见问题

### Q1: 插件无法加载

**可能原因：**
- manifest.json 格式错误
- 缺少必要文件
- 文件大小超过限制

**解决方案：**
- 检查 manifest.json 格式
- 确保包含 index.html 和 icon.png
- 压缩资源，减少文件大小

### Q2: 样式错乱

**可能原因：**
- Tailwind CSS 未正确配置
- 静态资源路径错误
- CSS 冲突

**解决方案：**
- 检查 next.config.mjs 配置
- 确认静态资源路径正确
- 使用 CSS 隔离

### Q3: API 调用失败

**可能原因：**
- 权限未配置
- API 版本不兼容
- SDK 初始化失败

**解决方案：**
- 检查权限配置
- 确认 API 版本
- 查看 SDK 初始化代码

### Q4: 打包失败

**可能原因：**
- Node.js 版本过低
- 依赖安装失败
- 构建错误

**解决方案：**
```bash
# 升级 Node.js
node --version  # 应该 >= 18

# 清理缓存
rm -rf node_modules .next
pnpm install

# 重新构建
pnpm build
```

### Q5: 上传失败

**可能原因：**
- 文件大小超过 10MB
- 插件包格式错误
- manifest.json 验证失败

**解决方案：**
- 压缩静态资源
- 检查 zip 包结构
- 使用 JSON 验证工具检查 manifest.json

### Q6: 审核不通过

**可能原因：**
- 功能不符合规范
- 权限申请不合理
- UI/UX 问题

**解决方案：**
- 参考飞书插件开发规范
- 只申请必要的权限
- 优化界面设计

## 注意事项

1. **文件大小限制**
   - 插件包总大小不能超过 10MB
   - 单个文件不能超过 5MB
   - 建议优化资源，减少体积

2. **图标要求**
   - 格式：PNG
   - 尺寸：256×256 像素
   - 大小：不超过 100KB

3. **CSP 限制**
   - 必须遵守飞书的内容安全策略
   - 不能使用外部脚本（CDN）
   - 图片必须使用飞书域名

4. **性能要求**
   - 加载时间 < 3秒
   - 首屏渲染 < 1秒
   - 避免使用过大的第三方库

5. **兼容性**
   - 支持飞书桌面端
   - 支持飞书移动端
   - 支持主流浏览器

## 更新插件

### 版本号管理

每次更新时，需要修改 `public/manifest.json` 中的版本号：

```json
{
  "version": "2.0.1"  // 修改版本号
}
```

### 更新流程

1. 修改代码
2. 更新版本号
3. 重新构建
4. 上传新版本
5. 提交审核
6. 发布上线

### 灰度发布

飞书支持灰度发布，可以逐步推送更新：

1. 上传新版本
2. 设置灰度比例（如 10%）
3. 观察反馈
4. 逐步扩大灰度
5. 全量发布

## 技术支持

- 飞书开放平台：https://open.feishu.cn
- 开发文档：https://open.feishu.cn/document/ukTMukTMukTM/ukTMukTMukTM
- 技术社区：https://open.feishu.cn/community

## 参考资料

- [飞书插件开发指南](https://open.feishu.cn/document/ukTMukTMukTM/ukTMukTMukTM)
- [多维表格 API](https://open.feishu.cn/document/ukTMukTMukTM/ukTMukTMukTM)
- [最佳实践](https://open.feishu.cn/document/ukTMukTMukTM/ukTMukTMukTM)

---

**最后更新**：2025-01-12
**文档版本**：v2.0.0
