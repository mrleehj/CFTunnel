#!/bin/bash

# Cloudflare Tunnel Manager - 卸载脚本

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
        echo "使用方法: sudo bash uninstall.sh"
        exit 1
    fi
}

# 确认卸载
confirm_uninstall() {
    echo ""
    echo "=========================================="
    echo "  Cloudflare Tunnel Manager - 卸载程序"
    echo "=========================================="
    echo ""
    print_warning "此操作将卸载 Cloudflare Tunnel Manager"
    print_warning "安装目录 $INSTALL_DIR 将被删除"
    echo ""
    read -p "是否继续？(y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "已取消卸载"
        exit 0
    fi
}

# 停止并删除服务
remove_service() {
    print_info "停止并删除服务..."
    
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        systemctl stop ${SERVICE_NAME}
        print_success "服务已停止"
    fi
    
    if systemctl is-enabled --quiet ${SERVICE_NAME} 2>/dev/null; then
        systemctl disable ${SERVICE_NAME}
        print_success "服务已禁用"
    fi
    
    if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
        rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
        systemctl daemon-reload
        print_success "服务文件已删除"
    fi
}

# 删除安装目录
remove_install_dir() {
    print_info "删除安装目录..."
    
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
        print_success "安装目录已删除: $INSTALL_DIR"
    else
        print_warning "安装目录不存在: $INSTALL_DIR"
    fi
}

# 询问是否删除数据
remove_data() {
    echo ""
    print_warning "是否删除用户数据？"
    print_info "数据目录: ~/.cf_tunnel (包含配置、凭证、日志)"
    read -p "删除数据？(y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -d "$HOME/.cf_tunnel" ]; then
            rm -rf "$HOME/.cf_tunnel"
            print_success "数据目录已删除"
        fi
    else
        print_info "已保留数据目录"
    fi
}

# 主函数
main() {
    check_root
    confirm_uninstall
    remove_service
    remove_install_dir
    remove_data
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}卸载完成！${NC}"
    echo "=========================================="
    echo ""
}

main
