#!/bin/bash

# Cloudflare Tunnel Manager - Docker 停止脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

CONTAINER_NAME="cf-tunnel"

echo ""
echo "=========================================="
echo "  停止 Cloudflare Tunnel Manager"
echo "=========================================="
echo ""

# 检查容器是否存在
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_error "容器 ${CONTAINER_NAME} 不存在"
    exit 1
fi

# 检查容器是否正在运行
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_info "停止容器..."
    docker stop ${CONTAINER_NAME}
    print_success "容器已停止"
else
    print_info "容器未运行"
fi

echo ""
read -p "是否删除容器？(y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "删除容器..."
    docker rm ${CONTAINER_NAME}
    print_success "容器已删除"
    echo ""
    
    read -p "是否删除数据卷？(y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "删除数据卷..."
        docker volume rm cf-data
        print_success "数据卷已删除"
    else
        print_info "数据卷已保留"
    fi
fi

echo ""
