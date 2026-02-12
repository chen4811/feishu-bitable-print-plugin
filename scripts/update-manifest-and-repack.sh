#!/bin/bash

# 更新 manifest.json 并重新打包插件

set -e

echo "========================================="
echo "  更新 manifest.json 并重新打包"
echo "========================================="
echo ""

# 检查插件目录
if [ ! -d "feishu-plugin" ]; then
    echo "❌ 错误：未找到 feishu-plugin 目录"
    echo "请先运行 pnpm build 构建项目"
    exit 1
fi

# 复制新的 manifest.json
echo "📋 更新 manifest.json..."
cp public/manifest.json feishu-plugin/
echo "✅ manifest.json 已更新"
echo ""

# 复制 index.html
echo "📋 更新 index.html..."
cp public/index.html feishu-plugin/
echo "✅ index.html 已更新"
echo ""

# 检查 icon.png
if [ -f "feishu-plugin/icon.png" ]; then
    echo "✅ 找到 icon.png"
else
    echo "⚠️  警告：未找到 icon.png"
    echo "   请添加 256×256 的 PNG 图标"
fi
echo ""

# 重新打包
echo "🔄 重新打包插件..."
rm -f feishu-bitable-plugin-v2.0.0.zip
node scripts/create-zip.js

echo ""
echo "========================================="
echo "✅ 打包完成！"
echo "========================================="
echo ""
echo "📦 插件包: feishu-bitable-plugin-v2.0.0.zip"
echo ""
echo "📝 下一步:"
echo "1. 登录飞书开放平台: https://open.feishu.cn"
echo "2. 创建/选择应用"
echo "3. 进入「插件管理」"
echo "4. 创建多维表格边栏插件"
echo "5. 上传插件包"
echo ""
echo "⚠️  重要提醒:"
echo "不要使用飞书开发者工具的 BlockTypeID 开发方式！"
echo "请通过飞书开放平台的插件管理功能进行开发。"
echo ""
