#!/bin/bash

# 重新打包插件（包含图标）

set -e

echo "========================================="
echo "  重新打包飞书插件（包含图标）"
echo "========================================="
echo ""

# 检查 icon.png
if [ ! -f "feishu-plugin/icon.png" ]; then
    echo "❌ 错误：未找到 icon.png 文件"
    echo ""
    echo "请先执行以下操作："
    echo "1. 准备 256×256 的 PNG 图标"
    echo "2. 复制到 feishu-plugin/icon.png"
    echo "3. 重新运行此脚本"
    echo ""
    exit 1
fi

echo "✅ 找到 icon.png 文件"
echo ""

# 检查图标尺寸
image_info=$(file feishu-plugin/icon.png)
echo "📋 图标信息: $image_info"
echo ""

# 重新创建 zip
echo "🔄 重新创建 ZIP 文件..."
rm -f feishu-bitable-plugin-v2.0.0.zip
node scripts/create-zip.js

echo ""
echo "========================================="
echo "✅ 打包完成！"
echo "========================================="
echo ""
echo "📦 新的插件包: feishu-bitable-plugin-v2.0.0.zip"
echo ""
echo "现在可以上传到飞书开放平台了！"
