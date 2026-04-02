#!/bin/bash

# Cloudflare Tunnel Manager - Docker 镜像构建脚本
# 支持多架构构建和版本管理

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

# 读取版本号
if [ -f "VERSION" ]; then
    VERSION=$(cat VERSION | tr -d '[:space:]')
else
    VERSION="latest"
fi

# 镜像名称
IMAGE_NAME="cf-tunnel-manager"
REGISTRY=${REGISTRY:-""}  # 可以设置为 Docker Hub 用户名或私有仓库

if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}"
fi

print_info "构建 Docker 镜像"
print_info "镜像名称: ${FULL_IMAGE_NAME}"
print_info "版本: ${VERSION}"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装"
    exit 1
fi

# 构建镜像
print_info "开始构建镜像..."
docker build \
    --build-arg VERSION=${VERSION} \
    -t ${FULL_IMAGE_NAME}:${VERSION} \
    -t ${FULL_IMAGE_NAME}:latest \
    .

if [ $? -eq 0 ]; then
    print_success "镜像构建完成"
    echo ""
    print_info "镜像标签:"
    echo "  - ${FULL_IMAGE_NAME}:${VERSION}"
    echo "  - ${FULL_IMAGE_NAME}:latest"
    echo ""
    
    # 显示镜像信息
    print_info "镜像信息:"
    docker images ${FULL_IMAGE_NAME} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    
    # 提示运行命令
    print_info "运行容器:"
    echo "  docker run -d -p 3000:3000 -v cf-data:/data --name cf-tunnel ${FULL_IMAGE_NAME}:latest"
    echo ""
    
    # 提示推送命令
    if [ -n "$REGISTRY" ]; then
        print_info "推送到仓库:"
        echo "  docker push ${FULL_IMAGE_NAME}:${VERSION}"
        echo "  docker push ${FULL_IMAGE_NAME}:latest"
        echo ""
    fi
else
    print_error "镜像构建失败"
    exit 1
fi
