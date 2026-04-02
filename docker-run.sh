#!/bin/bash

# Cloudflare Tunnel Manager - Docker 快速启动脚本

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
CONTAINER_NAME="cf-tunnel"
IMAGE_NAME="cf-tunnel-manager:latest"
PORT=${PORT:-3000}
VOLUME_NAME="cf-data"

echo ""
echo "=========================================="
echo "  Cloudflare Tunnel Manager - Docker"
echo "=========================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查容器是否已存在
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_warning "容器 ${CONTAINER_NAME} 已存在"
    
    # 检查是否正在运行
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_info "容器正在运行"
        echo ""
        read -p "是否重启容器？(y/N): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "重启容器..."
            docker restart ${CONTAINER_NAME}
            print_success "容器已重启"
        fi
    else
        print_info "启动现有容器..."
        docker start ${CONTAINER_NAME}
        print_success "容器已启动"
    fi
else
    # 检查镜像是否存在
    if ! docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}$"; then
        print_warning "镜像 ${IMAGE_NAME} 不存在"
        print_info "请先构建镜像: bash docker-build.sh"
        exit 1
    fi
    
    # 创建数据卷
    if ! docker volume ls --format '{{.Name}}' | grep -q "^${VOLUME_NAME}$"; then
        print_info "创建数据卷: ${VOLUME_NAME}"
        docker volume create ${VOLUME_NAME}
    fi
    
    # 运行容器
    print_info "启动新容器..."
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p ${PORT}:3000 \
        -v ${VOLUME_NAME}:/data \
        --restart unless-stopped \
        ${IMAGE_NAME}
    
    print_success "容器已启动"
fi

# 等待服务就绪
print_info "等待服务启动..."
sleep 3

# 检查容器状态
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_success "服务运行正常"
    echo ""
    echo "=========================================="
    echo "  访问地址"
    echo "=========================================="
    echo ""
    echo "  http://localhost:${PORT}"
    echo ""
    
    # 获取服务器 IP
    if command -v hostname &> /dev/null; then
        SERVER_IP=$(hostname -I | awk '{print $1}')
        if [ -n "$SERVER_IP" ]; then
            echo "  http://${SERVER_IP}:${PORT}"
            echo ""
        fi
    fi
    
    echo "=========================================="
    echo "  常用命令"
    echo "=========================================="
    echo ""
    echo "  查看日志:   docker logs -f ${CONTAINER_NAME}"
    echo "  停止容器:   docker stop ${CONTAINER_NAME}"
    echo "  重启容器:   docker restart ${CONTAINER_NAME}"
    echo "  进入容器:   docker exec -it ${CONTAINER_NAME} sh"
    echo "  删除容器:   docker rm -f ${CONTAINER_NAME}"
    echo ""
else
    print_error "容器启动失败"
    echo ""
    print_info "查看日志:"
    docker logs ${CONTAINER_NAME}
    exit 1
fi
