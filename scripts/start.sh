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
    npx serve out --port ${DEPLOY_RUN_PORT} --single
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
