# 飞书多维表格自定义排版插件

一个功能丰富的飞书多维表格自定义排版插件，支持多种视图布局和灵活的数据展示方式。

## ✨ 功能特性

### 📊 多种视图模式
- **表格视图（Grid View）**：经典的行列表格展示，支持排序和筛选
- **看板视图（Kanban View）：** 按状态分组的看板展示，直观的任务管理
- **卡片视图（Gallery View）**：卡片式网格展示，支持分组功能
- **时间轴视图（Timeline View）**：按时间线展示任务，清晰的时间规划

### 🎨 视觉设计
- 现代化的 UI 设计，基于 shadcn/ui 组件库
- 支持深色模式
- 流畅的动画和过渡效果
- 响应式布局，适配不同屏幕尺寸

### 🔧 功能组件
- **任务卡片**：统一的任务展示组件，包含标题、状态、优先级、进度、负责人、标签等信息
- **实时搜索**：支持按任务名称和描述搜索
- **视图切换**：快速切换不同的视图模式
- **数据统计**：显示记录数量、最后更新时间等信息

## 🚀 技术栈

- **框架**：Next.js 16 (App Router)
- **UI 组件**：shadcn/ui (基于 Radix UI)
- **样式**：Tailwind CSS 4
- **语言**：TypeScript 5
- **图标**：lucide-react

## 📁 项目结构

```
src/
├── app/
│   ├── page.tsx          # 主页面
│   ├── layout.tsx        # 布局文件
│   └── globals.css       # 全局样式
├── components/
│   ├── ui/               # shadcn/ui 组件库
│   └── views/            # 自定义视图组件
│       ├── TaskCard.tsx      # 任务卡片组件
│       ├── GridView.tsx      # 表格视图
│       ├── KanbanView.tsx    # 看板视图
│       ├── GalleryView.tsx   # 卡片视图
│       └── TimelineView.tsx  # 时间轴视图
├── types/
│   └── bitable.ts        # 类型定义
└── data/
    └── mockData.ts       # 模拟数据
```

## 🎯 数据模型

### 字段类型
- `text`：文本字段
- `number`：数字字段
- `select`：单选字段
- `multiSelect`：多选字段
- `date`：日期字段
- `person`：人员字段
- `checkbox`：复选框字段
- `url`：URL 字段
- `email`：邮箱字段

### 视图配置
每个视图可以配置：
- 标题字段
- 状态字段
- 负责人字段
- 日期字段
- 分组字段
- 排序规则
- 筛选规则

## 📖 使用说明

### 🚀 快速开始

#### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

项目将在 http://localhost:5000 上运行

#### 生产部署

本项目提供多种部署方式，根据需求选择：

| 部署方式 | 难度 | 推荐度 | 文档 |
|---------|------|--------|------|
| **Vercel** | ⭐ 简单 | ⭐⭐⭐⭐⭐ | [详细教程](docs/DEPLOY_VERCEL.md) |
| **Docker** | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ | [详细教程](docs/DEPLOY_DOCKER.md) |
| **传统服务器** | ⭐⭐⭐⭐ 复杂 | ⭐⭐⭐ | [主部署指南](docs/DEPLOYMENT.md) |

**推荐新手使用 Vercel 部署，零配置、自动 HTTPS、全球 CDN 加速！**

#### 快速部署到 Vercel

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 登录并部署
vercel login
vercel

# 生产环境部署
vercel --prod
```

### 📦 Docker 部署（快速）

```bash
# 构建镜像
docker build -t bitable-plugin .

# 运行容器
docker run -d -p 5000:5000 --name bitable-plugin bitable-plugin

# 访问应用
http://localhost:5000
```

更多部署详情请查看 [部署指南](docs/DEPLOYMENT.md)

### 视图切换
点击顶部工具栏的视图标签即可切换不同的视图模式：
- 表格视图：适合批量查看和编辑数据
- 看板视图：适合按状态管理任务流程
- 卡片视图：适合视觉化展示任务卡片
- 时间轴视图：适合按时间规划任务

### 搜索功能
在搜索框中输入关键词，可以实时过滤任务：
- 支持按任务名称搜索
- 支持按任务描述搜索

## 🎨 自定义样式

### 颜色方案
- 待开始：灰色
- 进行中：蓝色
- 已完成：绿色
- 已延期：红色

### 优先级颜色
- 低：浅灰色
- 中：浅蓝色
- 高：橙色
- 紧急：红色

## 🔮 未来规划

- [ ] 支持更多字段类型
- [ ] 添加拖拽排序功能
- [ ] 实现数据导入导出
- [ ] 添加字段编辑功能
- [ ] 支持视图保存和恢复
- [ ] 集成飞书开放平台 API
- [ ] 添加图表统计功能
- [ ] 支持自定义主题颜色

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发起 Discussion

---

**插件版本**：v1.0.0
**最后更新**：2025-01-12
