#!/bin/bash

# Cloudflare Tunnel Manager - 鍗歌浇鑴氭湰

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
        echo "浣跨敤鏂规硶: sudo bash uninstall.sh"
        exit 1
    fi
}

# 纭鍗歌浇
confirm_uninstall() {
    echo ""
    echo "=========================================="
    echo "  Cloudflare Tunnel Manager - 鍗歌浇绋嬪簭"
    echo "=========================================="
    echo ""
    print_warning "姝ゆ搷浣滃皢鍗歌浇 Cloudflare Tunnel Manager"
    print_warning "瀹夎鐩綍 $INSTALL_DIR 灏嗚鍒犻櫎"
    echo ""
    read -p "鏄惁缁х画锛?y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "宸插彇娑堝嵏杞?
        exit 0
    fi
}

# 鍋滄骞跺垹闄ゆ湇鍔?remove_service() {
    print_info "鍋滄骞跺垹闄ゆ湇鍔?.."
    
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        systemctl stop ${SERVICE_NAME}
        print_success "鏈嶅姟宸插仠姝?
    fi
    
    if systemctl is-enabled --quiet ${SERVICE_NAME} 2>/dev/null; then
        systemctl disable ${SERVICE_NAME}
        print_success "鏈嶅姟宸茬鐢?
    fi
    
    if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
        rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
        systemctl daemon-reload
        print_success "鏈嶅姟鏂囦欢宸插垹闄?
    fi
}

# 鍒犻櫎瀹夎鐩綍
remove_install_dir() {
    print_info "鍒犻櫎瀹夎鐩綍..."
    
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
        print_success "瀹夎鐩綍宸插垹闄? $INSTALL_DIR"
    else
        print_warning "瀹夎鐩綍涓嶅瓨鍦? $INSTALL_DIR"
    fi
}

# 璇㈤棶鏄惁鍒犻櫎鏁版嵁
remove_data() {
    echo ""
    print_warning "鏄惁鍒犻櫎鐢ㄦ埛鏁版嵁锛?
    print_info "鏁版嵁鐩綍: ~/.cf_tunnel (鍖呭惈閰嶇疆銆佸嚟璇併€佹棩蹇?"
    read -p "鍒犻櫎鏁版嵁锛?y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -d "$HOME/.cf_tunnel" ]; then
            rm -rf "$HOME/.cf_tunnel"
            print_success "鏁版嵁鐩綍宸插垹闄?
        fi
    else
        print_info "宸蹭繚鐣欐暟鎹洰褰?
    fi
}

# 涓诲嚱鏁?main() {
    check_root
    confirm_uninstall
    remove_service
    remove_install_dir
    remove_data
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}鍗歌浇瀹屾垚锛?{NC}"
    echo "=========================================="
    echo ""
}

main
