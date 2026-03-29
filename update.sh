#!/bin/bash

# Cloudflare Tunnel Manager - 鏇存柊鑴氭湰

set -e

# 棰滆壊瀹氫箟
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 閰嶇疆
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

# 妫€鏌ユ槸鍚︿负 root 鐢ㄦ埛
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "璇蜂娇鐢?root 鏉冮檺杩愯姝よ剼鏈?
        echo "浣跨敤鏂规硶: sudo bash update.sh"
        exit 1
    fi
}

# 妫€鏌ュ畨瑁?check_installation() {
    if [ ! -d "$INSTALL_DIR" ]; then
        print_error "鏈娴嬪埌瀹夎锛岃鍏堣繍琛?install.sh"
        exit 1
    fi
}

# 鍋滄鏈嶅姟
stop_service() {
    print_info "鍋滄鏈嶅姟..."
    
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        systemctl stop ${SERVICE_NAME}
        print_success "鏈嶅姟宸插仠姝?
    fi
}

# 澶囦唤褰撳墠鐗堟湰
backup_current() {
    print_info "澶囦唤褰撳墠鐗堟湰..."
    
    BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    cp -r "$INSTALL_DIR" "$BACKUP_DIR"
    
    print_success "宸插浠藉埌: $BACKUP_DIR"
}

# 鏇存柊鏂囦欢
update_files() {
    print_info "鏇存柊搴旂敤鏂囦欢..."
    
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    # 澶嶅埗鏂版枃浠讹紙淇濈暀 node_modules锛?    rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' \
        "$SCRIPT_DIR/" "$INSTALL_DIR/"
    
    print_success "鏂囦欢鏇存柊瀹屾垚"
}

# 鏇存柊渚濊禆
update_dependencies() {
    print_info "鏇存柊椤圭洰渚濊禆..."
    
    cd "$INSTALL_DIR"
    npm install --production
    
    print_success "渚濊禆鏇存柊瀹屾垚"
}

# 閲嶆柊鏋勫缓鍓嶇
rebuild_frontend() {
    print_info "閲嶆柊鏋勫缓鍓嶇..."
    
    cd "$INSTALL_DIR"
    npm run build
    
    print_success "鍓嶇鏋勫缓瀹屾垚"
}

# 鍚姩鏈嶅姟
start_service() {
    print_info "鍚姩鏈嶅姟..."
    
    systemctl start ${SERVICE_NAME}
    
    sleep 2
    
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        print_success "鏈嶅姟鍚姩鎴愬姛"
    else
        print_error "鏈嶅姟鍚姩澶辫触"
        print_info "鏌ョ湅鏃ュ織: journalctl -u ${SERVICE_NAME} -f"
        exit 1
    fi
}

# 涓诲嚱鏁?main() {
    echo ""
    echo "=========================================="
    echo "  Cloudflare Tunnel Manager - 鏇存柊绋嬪簭"
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
    echo -e "${GREEN}鏇存柊瀹屾垚锛?{NC}"
    echo "=========================================="
    echo ""
    echo "馃搵 鏌ョ湅鐘舵€? systemctl status ${SERVICE_NAME}"
    echo "馃搵 鏌ョ湅鏃ュ織: journalctl -u ${SERVICE_NAME} -f"
    echo ""
}

main
