# 飞书开发者工具加载插件错误解决方案

## ❌ 错误信息

```
该BlockTypeID对应的小组件不支持当前方式开发。
如需调试其他小组件，请前往"项目详情"修改BlockTypeID

BlockTypeID: blk_698d829dea010cbd4f294012
CLI ID: cli_a9073e804b39dcb2
```

## 🔍 问题原因

这个错误说明你在飞书开发者工具中选择了错误的 BlockTypeID。

**飞书多维表格边栏插件**不应该通过"小程序"或"小组件"的方式开发，而是应该通过**飞书开放平台**的插件管理功能进行开发。

## ✅ 正确的开发方式

### 方法 1：通过飞书开放平台（推荐）

#### 步骤 1：创建飞书开放平台应用

1. 访问 [飞书开放平台](https://open.feishu.cn)
2. 登录你的飞书账号
3. 进入「应用管理」
4. 点击「创建应用」
5. 选择「自建应用」
6. 填写应用基本信息

#### 步骤 2：创建插件

1. 进入应用详情页面
2. 在左侧菜单找到「插件管理」
3. 点击「创建插件」
4. 选择插件类型：**多维表格 - 边栏插件**
5. 填写插件信息：
   - 插件名称：飞书多维表格排版打印插件
   - 插件描述：支持多维度排版、批量打印、二维码/条形码生成、PDF导出等功能

#### 步骤 3：上传插件包

1. 点击「上传插件」
2. 选择 `feishu-bitable-plugin-v2.0.0.zip` 文件
3. 等待上传完成
4. 点击「保存」

#### 步骤 4：配置权限

1. 进入「权限管理」
2. 申请以下权限：
   - `bitable:app:read` - 读取表格数据
   - `bitable:app:write` - 写入表格数据
3. 点击「申请」

#### 步骤 5：提交审核

1. 返回「插件管理」
2. 检查插件配置
3. 点击「提交审核」
4. 等待审核通过（通常 1-3 个工作日）

#### 步骤 6：在飞书表格中测试

1. 审核通过后，打开任意飞书多维表格
2. 点击右上角的「...」菜单
3. 选择「插件」
4. 找到你的插件并点击打开
5. 测试各项功能

### 方法 2：通过飞书开发者工具（需正确配置）

如果你必须使用开发者工具，请确保：

#### 1. 创建正确的应用类型

1. 打开 [飞书开发者工具](https://open.feishu.cn/app)
2. 创建新应用时选择正确的类型
3. 不要选择"小程序"或"小组件"
4. 选择"飞书应用"类型

#### 2. 配置正确的 BlockTypeID

飞书多维表格边栏插件不应该使用 BlockTypeID 开发。如果你在开发者工具中看到这个错误，说明你选择了错误的开发模式。

**正确的做法是**：
- 不使用 BlockTypeID
- 通过飞书开放平台的插件管理功能进行开发

## 🚫 错误的开发方式

### ❌ 不要这样做

1. **不要在飞书开发者工具中选择"小组件"或"小程序"**
   - 这是为其他类型的应用设计的
   - 多维表格边栏插件不支持这种方式

2. **不要使用任意的 BlockTypeID**
   - BlockTypeID 是为特定类型的小组件设计的
   - 边栏插件不需要 BlockTypeID

3. **不要在飞书开发者工具中直接加载插件包**
   - 应该通过飞书开放平台的插件管理功能

## 📋 正确的开发流程对比

### ❌ 错误流程（导致 BlockTypeID 错误）

```
飞书开发者工具
  → 创建小组件
  → 选择 BlockTypeID
  → 加载插件包
  → ❌ 错误：该BlockTypeID对应的小组件不支持当前方式开发
```

### ✅ 正确流程

```
飞书开放平台
  → 创建应用
  → 插件管理
  → 创建多维表格边栏插件
  → 上传插件包
  → ✅ 成功
```

## 🔧 manifest.json 配置说明

### 飞书多维表格边栏插件的标准配置

```json
{
  "manifestVersion": 0.1,
  "apiVersion": "0.1.0",
  "id": "插件唯一ID",
  "name": {
    "zh-CN": "插件中文名称"
  },
  "version": "1.0.0",
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
  },
  "widgets": {
    "sidebar": {
      "url": "index.html",
      "size": {
        "height": 720,
        "width": 480
      }
    }
  }
}
```

### 关键配置说明

- `openModes.sidebar`: 定义边栏插件的尺寸
- `widgets.sidebar`: 定义边栏插件的入口
- `api.bitable.permissions`: 定义需要的 API 权限

## 🎯 快速解决方案

### 立即修复

1. **关闭飞书开发者工具**

2. **打开飞书开放平台**
   - 访问：https://open.feishu.cn

3. **按照"方法 1"的步骤创建插件**

4. **不要使用飞书开发者工具的 BlockTypeID 开发**

## 📞 获取帮助

### 官方资源

- 飞书开放平台：https://open.feishu.cn
- 插件开发文档：https://open.feishu.cn/document/ukTMukTMukTM/ukTMukTMukTM
- 多维表格 API：https://open.feishu.cn/document/ukTMukTMukTM/ukTMukTMukTM

### 联系支持

- 飞书开发者社区：https://open.feishu.cn/community
- 技术支持：在开放平台提交工单

## 📚 相关文档

- [快速开始指南](./QUICK_START_FEISHU.md)
- [完整部署指南](./FEISHU_DEPLOYMENT.md)
- [下载说明](../DOWNLOAD_INSTRUCTIONS.md)

## ⚠️ 重要提醒

**飞书多维表格边栏插件不支持 BlockTypeID 开发方式！**

请通过飞书开放平台的插件管理功能进行开发，而不是通过飞书开发者工具的 BlockTypeID。

---

**最后更新**: 2025-01-12
