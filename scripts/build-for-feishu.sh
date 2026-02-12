#!/bin/bash

# 飞书插件构建脚本

set -e

echo "========================================="
echo "  飞书多维表格边栏插件构建工具"
echo "========================================="
echo ""

# 检查环境
echo "📋 检查环境..."

if ! command_exists pnpm; then
    echo "❌ 未找到 pnpm，请先安装"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ 未找到 package.json，请确认在项目根目录"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 清理旧文件
echo "🧹 清理旧构建文件..."
rm -rf out dist
echo "✅ 清理完成"
echo ""

# 安装依赖
echo "📦 安装依赖..."
pnpm install
echo "✅ 依赖安装完成"
echo ""

# 构建
echo "🔨 构建项目..."
NODE_ENV=production pnpm build
echo "✅ 构建完成"
echo ""

# 检查构建输出
if [ ! -d "out" ]; then
    echo "❌ 构建失败：未找到 out 目录"
    exit 1
fi

echo "📊 构建统计:"
echo "   - 文件数量: $(find out -type f | wc -l)"
echo "   - 总大小: $(du -sh out | cut -f1)"
echo ""

# 检查必要文件
echo "📋 检查必要文件..."

required_files=(
    "public/manifest.json"
    "public/index.html"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo "❌ 缺少必要文件:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

echo "✅ 必要文件检查通过"
echo ""

# 检查图标
if [ ! -f "public/icon.png" ]; then
    echo "⚠️  警告: 未找到 icon.png"
    echo "   请手动添加 256x256 的 icon.png 到 public 目录"
fi

# 创建插件包
echo "📦 创建插件包..."
mkdir -p feishu-plugin

# 复制文件
cp -r out/* feishu-plugin/
cp public/manifest.json feishu-plugin/
cp public/index.html feishu-plugin/

if [ -f "public/icon.png" ]; then
    cp public/icon.png feishu-plugin/
fi

echo "✅ 插件包创建完成"
echo ""

# 检查大小
echo "📊 检查插件大小..."
size=$(du -sm feishu-plugin | cut -f1)
echo "   插件总大小: ${size}MB"

if [ "$size" -gt 10 ]; then
    echo "⚠️  警告: 插件大小超过 10MB，可能会影响上传"
fi

echo ""

# 创建压缩包
version=$(grep '"version"' public/manifest.json | cut -d'"' -f4)
zip_name="feishu-bitable-plugin-v${version}.zip"

echo "📦 创建压缩包: ${zip_name}"
cd feishu-plugin
zip -r "../${zip_name}" * -x "*.DS_Store" -x "__MACOSX/*"
cd ..

echo "✅ 压缩包创建完成"
echo ""

# 生成报告
echo "📝 生成报告..."
cat > build-report.txt << EOF
飞书多维表格边栏插件构建报告
================================

构建时间: $(date)
插件版本: ${version}
插件大小: ${size}MB

文件列表:
EOF

cd feishu-plugin
find . -type f | sort >> ../build-report.txt
cd ..

echo "✅ 报告生成完成: build-report.txt"
echo ""

echo "========================================="
echo "✅ 构建完成！"
echo "========================================="
echo ""
echo "📦 构建产物:"
echo "   - feishu-plugin/ (插件目录)"
echo "   - ${zip_name} (压缩包)"
echo "   - build-report.txt (构建报告)"
echo ""
echo "🚀 下一步:"
echo "   1. 登录飞书开放平台: https://open.feishu.cn"
echo "   2. 进入「应用管理」→「插件管理」"
echo "   3. 创建/更新插件"
echo "   4. 上传 ${zip_name} 文件"
echo "   5. 配置插件信息"
echo "   6. 提交审核"
echo ""
echo "⚠️  注意事项:"
echo "   - 确保已在 public 目录添加 256x256 的 icon.png"
echo "   - 插件大小不应超过 10MB"
echo "   - manifest.json 必须符合飞书规范"
