#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    # 使用静态文件服务器提供静态导出的内容
    # output: 'export' 配置会将静态文件输出到 out 目录
    # 使用 -p 指定端口，-s 用于单页应用（所有路由重定向到 index.html）
    npx serve out -p ${DEPLOY_RUN_PORT} -s
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
