#!/bin/bash

# Cloudflare Tunnel Manager - Linux 一键安装脚本
# 支持 Ubuntu/Debian/CentOS/RHEL
# 
# 使用方法:
# 1. 从 GitHub 直接安装:
#    curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
# 
# 2. 克隆后安装:
#    git clone https://github.com/mrleehj/CFTunnel.git
#    cd CFTunnel
#    sudo bash install.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
INSTALL_DIR="/opt/cf-tunnel-manager"
SERVICE_NAME="cf-tunnel-manager"
PORT=3000

# GitHub Release 配置
GITHUB_REPO_OWNER="mrleehj"
GITHUB_REPO_NAME="CFTunnel"
RELEASE_VERSION=${RELEASE_VERSION:-latest}  # 可以指定版本,默认使用最新版

# 如果使用 latest，需要获取真实的版本号
if [ "$RELEASE_VERSION" = "latest" ]; then
    print_info "获取最新版本号..."
    # 尝试从 GitHub API 获取最新版本
    LATEST_VERSION=$(curl -fsSL "https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' 2>/dev/null)
    
    if [ -n "$LATEST_VERSION" ]; then
        RELEASE_VERSION="$LATEST_VERSION"
        print_success "最新版本: $RELEASE_VERSION"
    else
        # 如果 API 失败，使用固定版本
        RELEASE_VERSION="v1.0.0"
        print_warning "无法获取最新版本，使用默认版本: $RELEASE_VERSION"
    fi
fi

# GitHub Release 下载地址（多个镜像）
GITHUB_RELEASE_MIRRORS=(
    "https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download"
    "https://kkgithub.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download"
    "https://hub.bgithub.xyz/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download"
)

# Gitee Release 配置（国内镜像）
GITEE_REPO_OWNER="mrleehj"
GITEE_REPO_NAME="CFTunnel"
GITEE_RELEASE_URL="https://gitee.com/${GITEE_REPO_OWNER}/${GITEE_REPO_NAME}/releases/download"

# 安装包文件名（根据版本号动态生成）
if [ "$RELEASE_VERSION" = "latest" ]; then
    PACKAGE_NAME="cf-tunnel-manager-v1.0.0.tar.gz"
else
    PACKAGE_NAME="cf-tunnel-manager-${RELEASE_VERSION}.tar.gz"
fi

# 自动选择源（优先使用 Gitee）
USE_GITEE=${USE_GITEE:-auto}

# 打印带颜色的消息
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
        echo "使用方法: sudo bash install.sh"
        exit 1
    fi
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        print_error "无法检测操作系统"
        exit 1
    fi
    
    print_info "检测到操作系统: $OS $VERSION"
}

# 测试下载地址连接速度
test_download_url() {
    local url=$1
    local timeout=5
    
    # 使用 curl 测试 HEAD 请求
    if timeout $timeout curl -fsSL -I "$url" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# 下载安装包
download_package() {
    print_info "准备下载安装包..."
    
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # 选择下载源
    DOWNLOAD_URL=""
    
    if [ "$USE_GITEE" = "yes" ]; then
        # 强制使用 Gitee
        DOWNLOAD_URL="${GITEE_RELEASE_URL}/${RELEASE_VERSION}/${PACKAGE_NAME}"
        print_info "使用 Gitee Release 源"
    elif [ "$USE_GITEE" = "no" ]; then
        # 强制使用 GitHub（智能选择最快镜像）
        print_info "测试 GitHub Release 镜像..."
        
        for mirror in "${GITHUB_RELEASE_MIRRORS[@]}"; do
            test_url="${mirror}/${RELEASE_VERSION}/${PACKAGE_NAME}"
            print_info "测试: $mirror"
            if test_download_url "$test_url"; then
                DOWNLOAD_URL="$test_url"
                print_success "选择镜像: $mirror"
                break
            else
                print_warning "镜像不可用: $mirror"
            fi
        done
        
        if [ -z "$DOWNLOAD_URL" ]; then
            print_error "所有 GitHub Release 镜像均不可用"
            print_info "建议尝试: USE_GITEE=yes bash install.sh"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    else
        # 自动选择：优先 Gitee，失败则尝试 GitHub 镜像
        print_info "自动选择下载源..."
        
        # 测试 Gitee Release
        gitee_url="${GITEE_RELEASE_URL}/${RELEASE_VERSION}/${PACKAGE_NAME}"
        print_info "测试 Gitee Release..."
        if test_download_url "$gitee_url"; then
            DOWNLOAD_URL="$gitee_url"
            print_success "使用 Gitee Release 源（国内推荐）"
        else
            print_warning "Gitee Release 不可用，尝试 GitHub 镜像..."
            
            # 测试所有 GitHub 镜像
            for mirror in "${GITHUB_RELEASE_MIRRORS[@]}"; do
                test_url="${mirror}/${RELEASE_VERSION}/${PACKAGE_NAME}"
                print_info "测试: $mirror"
                if test_download_url "$test_url"; then
                    DOWNLOAD_URL="$test_url"
                    print_success "选择镜像: $mirror"
                    break
                else
                    print_warning "镜像不可用: $mirror"
                fi
            done
            
            if [ -z "$DOWNLOAD_URL" ]; then
                print_error "所有下载源均不可用"
                print_info "可能的原因:"
                print_info "1. 网络连接问题"
                print_info "2. Release 版本不存在"
                print_info "3. 请访问 https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases 检查"
                rm -rf "$TEMP_DIR"
                exit 1
            fi
        fi
    fi
    
    print_info "下载地址: $DOWNLOAD_URL"
    print_info "开始下载安装包..."
    
    # 下载安装包
    if curl -fsSL -o "$PACKAGE_NAME" "$DOWNLOAD_URL"; then
        print_success "安装包下载完成"
    else
        print_error "下载失败"
        print_info "请检查网络连接或手动下载安装包"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # 解压安装包
    print_info "解压安装包..."
    mkdir -p cf-tunnel-manager
    tar -xzf "$PACKAGE_NAME" -C cf-tunnel-manager
    
    if [ $? -ne 0 ]; then
        print_error "解压失败"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    PROJECT_DIR="$TEMP_DIR/cf-tunnel-manager"
    print_success "安装包解压完成"
}

# 检查项目文件或下载安装包
check_or_download_package() {
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    # 检查是否在项目目录中（本地安装）
    if [ -f "$SCRIPT_DIR/package.json" ] && [ -d "$SCRIPT_DIR/server" ] && [ -d "$SCRIPT_DIR/dist" ]; then
        print_info "检测到完整项目文件，使用本地文件安装"
        PROJECT_DIR="$SCRIPT_DIR"
        return 0
    fi
    
    # 如果不在项目目录，下载安装包
    print_info "未检测到项目文件，从 Release 下载安装包..."
    download_package
}

# 安装 Node.js
install_nodejs() {
    print_info "检查 Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js 已安装: $NODE_VERSION"
        
        # 检查版本是否 >= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_warning "Node.js 版本过低，需要升级到 18 或更高版本"
            NEED_INSTALL=true
        else
            return 0
        fi
    else
        NEED_INSTALL=true
    fi
    
    if [ "$NEED_INSTALL" = true ]; then
        print_info "安装 Node.js 18.x..."
        
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
        elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
        else
            print_error "不支持的操作系统: $OS"
            print_info "请手动安装 Node.js 18 或更高版本: https://nodejs.org/"
            exit 1
        fi
        
        print_success "Node.js 安装完成: $(node -v)"
    fi
}

# 创建安装目录
create_install_dir() {
    print_info "创建安装目录: $INSTALL_DIR"
    
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "安装目录已存在，将进行备份..."
        BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        mv "$INSTALL_DIR" "$BACKUP_DIR"
        print_info "已备份到: $BACKUP_DIR"
    fi
    
    mkdir -p "$INSTALL_DIR"
    print_success "安装目录创建完成"
}

# 复制文件
copy_files() {
    print_info "复制应用文件..."
    
    # 使用检测到的项目目录
    cd "$PROJECT_DIR"
    
    # 复制 server 目录
    if [ -d "server" ]; then
        cp -r server "$INSTALL_DIR/"
    fi
    
    # 复制 dist 目录
    if [ -d "dist" ]; then
        cp -r dist "$INSTALL_DIR/"
    fi
    
    # 复制配置文件
    cp package.json "$INSTALL_DIR/" 2>/dev/null || true
    cp package-lock.json "$INSTALL_DIR/" 2>/dev/null || true
    cp .npmrc "$INSTALL_DIR/" 2>/dev/null || true
    
    # 复制脚本
    cp install.sh "$INSTALL_DIR/" 2>/dev/null || true
    cp uninstall.sh "$INSTALL_DIR/" 2>/dev/null || true
    cp update.sh "$INSTALL_DIR/" 2>/dev/null || true
    
    # 复制 CLI 管理工具
    if [ -f "cftm.js" ]; then
        cp cftm.js "$INSTALL_DIR/"
        chmod +x "$INSTALL_DIR/cftm.js"
    fi
    
    # 复制文档
    cp *.md "$INSTALL_DIR/" 2>/dev/null || true
    
    print_success "文件复制完成"
}

# 安装依赖
install_dependencies() {
    print_info "安装生产环境依赖..."
    
    cd "$INSTALL_DIR"
    
    # 只安装生产依赖（dist 目录已经构建好）
    npm install --omit=dev
    
    print_success "依赖安装完成"
}

# 检查前端构建文件
check_frontend() {
    print_info "检查前端构建文件..."
    
    if [ ! -d "$INSTALL_DIR/dist" ]; then
        print_error "未找到前端构建文件 (dist 目录)"
        print_info "安装包可能不完整,请重新下载"
        exit 1
    fi
    
    print_success "前端构建文件检查完成"
}

# 创建 systemd 服务
create_systemd_service() {
    print_info "创建 systemd 服务..."
    
    cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Cloudflare Tunnel Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
Environment=PORT=${PORT}
ExecStart=/usr/bin/node ${INSTALL_DIR}/server/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    print_success "systemd 服务创建完成"
}

# 配置防火墙
configure_firewall() {
    print_info "配置防火墙..."
    
    # 检查 firewalld
    if command -v firewall-cmd &> /dev/null; then
        if systemctl is-active --quiet firewalld; then
            firewall-cmd --permanent --add-port=${PORT}/tcp
            firewall-cmd --reload
            print_success "firewalld 规则已添加"
        fi
    fi
    
    # 检查 ufw
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            ufw allow ${PORT}/tcp
            print_success "ufw 规则已添加"
        fi
    fi
}

# 启动服务
start_service() {
    print_info "启动服务..."
    
    systemctl enable ${SERVICE_NAME}
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

# 获取服务器 IP
get_server_ip() {
    # 尝试获取公网 IP
    PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "")
    
    # 获取内网 IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    
    if [ -n "$PUBLIC_IP" ]; then
        SERVER_IP=$PUBLIC_IP
    else
        SERVER_IP=$LOCAL_IP
    fi
}

# 打印安装信息
print_installation_info() {
    get_server_ip
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}安装完成！${NC}"
    echo "=========================================="
    echo ""
    echo "📦 安装目录: $INSTALL_DIR"
    echo "🚀 服务名称: $SERVICE_NAME"
    echo "📡 监听端口: $PORT"
    echo ""
    echo "🌐 访问地址:"
    echo "   - http://${SERVER_IP}:${PORT}"
    if [ "$SERVER_IP" != "$LOCAL_IP" ] && [ -n "$LOCAL_IP" ]; then
        echo "   - http://${LOCAL_IP}:${PORT} (内网)"
    fi
    echo ""
    echo "📋 常用命令 (cftm):"
    echo ""
    echo "  服务管理:"
    echo "   cftm start      # 启动服务"
    echo "   cftm stop       # 停止服务"
    echo "   cftm restart    # 重启服务"
    echo "   cftm service    # 查看服务状态"
    echo "   cftm logs       # 查看服务日志"
    echo ""
    echo "  用户管理:"
    echo "   cftm reset-admin        # 重置管理员密码"
    echo "   cftm change-password    # 修改密码"
    echo "   cftm list-users         # 查看用户列表"
    echo "   cftm add-user           # 添加用户"
    echo "   cftm remove-user <用户> # 删除用户"
    echo ""
    echo "  系统信息:"
    echo "   cftm status     # 系统状态"
    echo "   cftm --help     # 查看帮助"
    echo ""
    echo "📁 数据目录: ~/.cloudflare-tunnel-manager"
    echo ""
    echo "=========================================="
    echo ""
}

# 创建 cftm 命令链接
create_cftm_command() {
    print_info "创建 cftm 命令..."
    
    if [ -f "$INSTALL_DIR/cftm.js" ]; then
        # 创建软链接到 /usr/local/bin
        ln -sf "$INSTALL_DIR/cftm.js" /usr/local/bin/cftm
        chmod +x /usr/local/bin/cftm
        print_success "cftm 命令创建完成"
        print_info "现在可以在任何位置使用 'cftm' 命令管理系统"
    else
        print_warning "未找到 cftm.js 文件，跳过命令创建"
    fi
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  Cloudflare Tunnel Manager - 安装程序"
    echo "=========================================="
    echo ""
    
    check_root
    detect_os
    check_or_download_package
    install_nodejs
    create_install_dir
    copy_files
    install_dependencies
    check_frontend
    create_cftm_command
    create_systemd_service
    configure_firewall
    start_service
    print_installation_info
}

# 运行主函数
main
