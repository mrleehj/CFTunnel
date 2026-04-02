#!/bin/bash

# Cloudflare Tunnel Manager - Docker Hub 推送脚本

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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 配置
DOCKER_USERNAME=${DOCKER_USERNAME:-"mrleehj"}  # 可通过环境变量覆盖
IMAGE_NAME="cf-tunnel-manager"
FULL_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

echo ""
echo "=========================================="
echo "  Docker Hub 镜像推送"
echo "=========================================="
echo ""

# 读取版本号
if [ -f "VERSION" ]; then
    VERSION=$(cat VERSION | tr -d '[:space:]')
else
    print_error "VERSION 文件不存在"
    exit 1
fi

print_info "镜像信息:"
echo "  用户名: ${DOCKER_USERNAME}"
echo "  仓库名: ${IMAGE_NAME}"
echo "  完整名: ${FULL_NAME}"
echo "  版本号: ${VERSION}"
echo ""

# 检查镜像是否存在
if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "${FULL_NAME}:${VERSION}"; then
    print_error "镜像 ${FULL_NAME}:${VERSION} 不存在"
    print_info "请先运行: bash docker-build.sh"
    exit 1
fi

if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "${FULL_NAME}:latest"; then
    print_error "镜像 ${FULL_NAME}:latest 不存在"
    print_info "请先运行: bash docker-build.sh"
    exit 1
fi

print_success "镜像检查通过"
echo ""

# 显示镜像信息
print_info "镜像详情:"
docker images ${FULL_NAME} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

# 检查是否已登录
print_info "检查 Docker Hub 登录状态..."
if ! docker info 2>/dev/null | grep -q "Username"; then
    print_warning "未登录 Docker Hub"
    print_info "请输入 Docker Hub 凭证:"
    docker login
    echo ""
fi

print_success "已登录 Docker Hub"
echo ""

# 确认推送
print_warning "即将推送以下镜像到 Docker Hub:"
echo "  - ${FULL_NAME}:${VERSION}"
echo "  - ${FULL_NAME}:latest"
echo ""
read -p "确认推送？(y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "已取消推送"
    exit 0
fi

echo ""

# 推送版本标签
print_info "推送版本标签: ${VERSION}"
docker push ${FULL_NAME}:${VERSION}
print_success "版本标签推送完成"
echo ""

# 推送 latest 标签
print_info "推送 latest 标签"
docker push ${FULL_NAME}:latest
print_success "latest 标签推送完成"
echo ""

# 完成
echo "=========================================="
echo -e "${GREEN}镜像推送完成！${NC}"
echo "=========================================="
echo ""
print_info "用户可以使用以下命令拉取镜像:"
echo ""
echo "  # 拉取最新版本"
echo "  docker pull ${FULL_NAME}:latest"
echo ""
echo "  # 拉取指定版本"
echo "  docker pull ${FULL_NAME}:${VERSION}"
echo ""
print_info "Docker Hub 地址:"
echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
echo ""
print_info "使用示例:"
echo "  docker run -d --name cf-tunnel -p 3000:3000 -v cf-data:/data ${FULL_NAME}:latest"
echo ""

# 提示后续操作
print_info "建议后续操作:"
echo "  1. 访问 Docker Hub 完善仓库描述"
echo "  2. 添加仓库标签（tags）"
echo "  3. 更新 README.md 中的镜像地址"
echo "  4. 创建 Git 标签: git tag -a v${VERSION} -m 'Release v${VERSION}'"
echo "  5. 推送标签: git push origin v${VERSION}"
echo ""
