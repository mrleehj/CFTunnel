#!/bin/bash

# Cloudflare Tunnel Manager - 更新脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
INSTALL_DIR="/opt/cf-tunnel-manager"
SERVICE_NAME="cf-tunnel-manager"

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "请使用 root 权限运行此脚本"
        echo "使用方法: sudo bash update.sh"
        exit 1
    fi
}

# 检查安装
check_installation() {
    if [ ! -d "$INSTALL_DIR" ]; then
        print_error "未检测到安装，请先运行 install.sh"
        exit 1
    fi
}

# 停止服务
stop_service() {
    print_info "停止服务..."
    
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        systemctl stop ${SERVICE_NAME}
        print_success "服务已停止"
    fi
}

# 备份当前版本
backup_current() {
    print_info "备份当前版本..."
    
    BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    cp -r "$INSTALL_DIR" "$BACKUP_DIR"
    
    print_success "已备份到: $BACKUP_DIR"
}

# 更新文件
update_files() {
    print_info "更新应用文件..."
    
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    # 复制新文件（保留 node_modules）
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' \
        "$SCRIPT_DIR/" "$INSTALL_DIR/"
    
    print_success "文件更新完成"
}

# 更新依赖
update_dependencies() {
    print_info "更新项目依赖..."
    
    cd "$INSTALL_DIR"
    npm install --production
    
    print_success "依赖更新完成"
}

# 重新构建前端
rebuild_frontend() {
    print_info "重新构建前端..."
    
    cd "$INSTALL_DIR"
    npm run build
    
    print_success "前端构建完成"
}

# 启动服务
start_service() {
    print_info "启动服务..."
    
    systemctl start ${SERVICE_NAME}
    
    sleep 2
    
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        print_success "服务启动成功"
    else
        print_error "服务启动失败"
        print_info "查看日志: journalctl -u ${SERVICE_NAME} -f"
        exit 1
    fi
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  Cloudflare Tunnel Manager - 更新程序"
    echo "=========================================="
    echo ""
    
    check_root
    check_installation
    stop_service
    backup_current
    update_files
    update_dependencies
    rebuild_frontend
    start_service
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}更新完成！${NC}"
    echo "=========================================="
    echo ""
    echo "📋 查看状态: systemctl status ${SERVICE_NAME}"
    echo "📋 查看日志: journalctl -u ${SERVICE_NAME} -f"
    echo ""
}

main
