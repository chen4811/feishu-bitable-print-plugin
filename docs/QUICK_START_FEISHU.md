# 飞书多维表格边栏插件 - 快速开始

## 🚀 5分钟快速部署

### 前置准备

1. ✅ Node.js 18+
2. ✅ pnpm 8+
3. ✅ 飞书开放平台账号
4. ✅ 256×256 的 PNG 图标文件

### 步骤 1：克隆项目

```bash
git clone <your-repo-url>
cd project-name
```

### 步骤 2：安装依赖

```bash
pnpm install
```

### 步骤 3：添加图标

⚠️ **重要！** 将你的 256×256 PNG 图标重命名为 `icon.png` 并放到 `public` 目录：

```bash
cp your-icon.png public/icon.png
```

### 步骤 4：构建插件

```bash
# 方法1：使用构建脚本（推荐）
./scripts/build-for-feishu.sh

# 方法2：手动构建
pnpm build
```

### 步骤 5：上传到飞书

1. 访问 [飞书开放平台](https://open.feishu.cn)
2. 创建应用 → 多维表格边栏插件
3. 上传 `feishu-plugin.zip` 或 `feishu-bitable-plugin-v2.0.0.zip`
4. 配置权限：`bitable:app:read`, `bitable:app:write`
5. 提交审核

### 步骤 6：测试

1. 审核通过后，在飞书表格中打开插件
2. 测试各项功能是否正常
3. 如果有问题，查看浏览器控制台

## 📦 构建产物

构建成功后会生成：

```
out/                      # 静态构建输出
├── manifest.json        # ✅ 插件配置
├── index.html           # ✅ 入口文件
├── icon.png             # ⚠️ 需要手动添加
├── _next/               # Next.js 资源
└── ...
```

## ⚙️ 配置说明

### manifest.json 关键配置

```json
{
  "id": "bitable_print_sidebar_plugin_2025",
  "name": {
    "zh-CN": "飞书多维表格排版打印插件"
  },
  "version": "2.0.0",
  "openModes": {
    "sidebar": {
      "height": 720,
      "width": 480
    }
  }
}
```

### next.config.mjs 关键配置

```javascript
export default {
  output: 'export',        // ✅ 必须静态导出
  images: {
    unoptimized: true,    // ✅ 禁用图片优化
  },
  trailingSlash: true,    // ✅ URL 尾斜杠
  turbopack: {},         // ✅ Turbopack 配置
};
```

## 🔧 常见问题

### Q: 构建失败怎么办？

```bash
# 清理缓存
rm -rf .next node_modules
pnpm install
pnpm build
```

### Q: 插件无法加载？

检查清单：
- [ ] manifest.json 格式正确
- [ ] 包含 index.html 和 icon.png
- [ ] 文件大小 < 10MB
- [ ] 权限配置正确

### Q: 图标显示异常？

- 确保是 PNG 格式
- 确保尺寸是 256×256
- 确保文件名是 icon.png

## 📚 更多文档

- [完整部署指南](./FEISHU_DEPLOYMENT.md)
- [插件开发指南](./FEISHU_PLUGIN.md)
- [主 README](../README.md)

## 🆘 获取帮助

- 飞书开放平台：https://open.feishu.cn
- 开发文档：https://open.feishu.cn/document/ukTMukTMukTM/ukTMukTMukTM

---

**最后更新**: 2025-01-12
