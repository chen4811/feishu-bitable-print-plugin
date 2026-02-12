# 飞书多维表格边栏插件

## 插件信息

- **插件ID**: bitable_print_sidebar_plugin
- **版本**: 2.0.0
- **类型**: 边栏插件
- **大小**: 480px × 720px

## 功能特性

### 1. 多视图展示
- 表格视图
- 看板视图
- 卡片视图
- 时间轴视图

### 2. 排版打印
- 批量打印
- 二维码生成
- 条形码生成
- PDF导出
- 模板管理

## 开发指南

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 构建插件

```bash
# 构建静态文件
pnpm build

# 打包插件
pnpm package
```

## 目录结构

```
project/
├── public/                  # 静态资源目录
│   ├── manifest.json        # 插件配置文件（必选）
│   ├── index.html           # 入口文件（必选）
│   └── assets/             # 静态资源
│       ├── icon.png        # 插件图标
│       └── ...
├── out/                    # 构建输出目录
│   ├── index.html
│   ├── _next/
│   └── ...
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
├── manifest.json           # 备用配置文件
└── next.config.mjs
```

## manifest.json 配置

插件配置文件必须包含以下字段：

```json
{
  "manifestVersion": 0.1,
  "id": "插件ID",
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

## 飞书 API 使用

### 初始化

```javascript
import { bitable } from '@lark-base-open/js-sdk';

// 获取 bitable 实例
const bitableInstance = await bitable.getInstance();

// 获取表格数据
const table = await bitableInstance.getActiveTable();
const records = await table.getRecords();
```

### 权限说明

插件需要申请以下权限：

- `bitable:app:read` - 读取表格数据
- `bitable:app:write` - 写入表格数据

## 注意事项

1. **静态导出**：插件必须使用静态导出模式，不能依赖服务器端渲染
2. **文件大小**：插件包总大小不能超过 10MB
3. **图标要求**：图标必须是 PNG 格式，尺寸 256×256 像素
4. **CSP限制**：必须遵守飞书的内容安全策略
5. **性能优化**：避免使用过大的第三方库
6. **兼容性**：需要兼容飞书桌面端和移动端

## 部署流程

1. 本地构建：`pnpm build`
2. 打包插件：`pnpm package`
3. 上传到飞书开放平台
4. 提交审核
5. 发布上线

## 常见问题

### Q1: 插件无法加载
- 检查 manifest.json 格式是否正确
- 确认文件大小是否超限
- 检查是否有服务器端渲染代码

### Q2: 样式错乱
- 检查 Tailwind CSS 是否正确配置
- 确认静态资源路径是否正确
- 检查是否有 CSS 冲突

### Q3: API 调用失败
- 检查权限是否正确配置
- 确认 API 版本是否兼容
- 查看浏览器控制台错误信息

## 更新日志

### v2.0.0 (2025-01-12)
- 新增排版打印功能
- 新增二维码/条形码生成
- 新增 PDF 导出
- 新增批量打印

### v1.0.0 (2025-01-10)
- 初始版本发布
- 支持多视图展示
- 支持基础数据展示
