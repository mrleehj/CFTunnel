#!/bin/bash

# Cloudflare Tunnel Manager - Linux 涓€閿畨瑁呰剼鏈?
# 鏀寔 Ubuntu/Debian/CentOS/RHEL
# 
# 浣跨敤鏂规硶:
# 1. 浠?GitHub 鐩存帴瀹夎:
#    curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
# 
# 2. 鍏嬮殕鍚庡畨瑁?
#    git clone https://github.com/mrleehj/CFTunnel.git
#    cd CFTunnel
#    sudo bash install.sh

set -e

# 棰滆壊瀹氫箟
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 閰嶇疆
INSTALL_DIR="/opt/cf-tunnel-manager"
SERVICE_NAME="cf-tunnel-manager"
PORT=3000

# GitHub Release 閰嶇疆
GITHUB_REPO_OWNER="mrleehj"
GITHUB_REPO_NAME="CFTunnel"
RELEASE_VERSION=${RELEASE_VERSION:-latest}  # 鍙互鎸囧畾鐗堟湰,榛樿浣跨敤鏈€鏂扮増

# GitHub Release 涓嬭浇鍦板潃锛堝涓暅鍍忥級
GITHUB_RELEASE_MIRRORS=(
    "https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download"
    "https://kkgithub.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download"
    "https://hub.bgithub.xyz/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download"
)

# Gitee Release 閰嶇疆锛堝浗鍐呴暅鍍忥級
GITEE_REPO_OWNER="mrleehj"
GITEE_REPO_NAME="CFTunnel"
GITEE_RELEASE_URL="https://gitee.com/${GITEE_REPO_OWNER}/${GITEE_REPO_NAME}/releases/download"

# 瀹夎鍖呮枃浠跺悕
PACKAGE_NAME="cf-tunnel-manager.tar.gz"

# 鑷姩閫夋嫨婧愶紙浼樺厛浣跨敤 Gitee锛?
USE_GITEE=${USE_GITEE:-auto}

# 鎵撳嵃甯﹂鑹茬殑娑堟伅
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
        echo "浣跨敤鏂规硶: sudo bash install.sh"
        exit 1
    fi
}

# 妫€娴嬫搷浣滅郴缁?
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        print_error "鏃犳硶妫€娴嬫搷浣滅郴缁?
        exit 1
    fi
    
    print_info "妫€娴嬪埌鎿嶄綔绯荤粺: $OS $VERSION"
}

# 娴嬭瘯涓嬭浇鍦板潃杩炴帴閫熷害
test_download_url() {
    local url=$1
    local timeout=5
    
    # 浣跨敤 curl 娴嬭瘯 HEAD 璇锋眰
    if timeout $timeout curl -fsSL -I "$url" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# 涓嬭浇瀹夎鍖?
download_package() {
    print_info "鍑嗗涓嬭浇瀹夎鍖?.."
    
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # 閫夋嫨涓嬭浇婧?
    DOWNLOAD_URL=""
    
    if [ "$USE_GITEE" = "yes" ]; then
        # 寮哄埗浣跨敤 Gitee
        DOWNLOAD_URL="${GITEE_RELEASE_URL}/${RELEASE_VERSION}/${PACKAGE_NAME}"
        print_info "浣跨敤 Gitee Release 婧?
    elif [ "$USE_GITEE" = "no" ]; then
        # 寮哄埗浣跨敤 GitHub锛堟櫤鑳介€夋嫨鏈€蹇暅鍍忥級
        print_info "娴嬭瘯 GitHub Release 闀滃儚..."
        
        for mirror in "${GITHUB_RELEASE_MIRRORS[@]}"; do
            test_url="${mirror}/${RELEASE_VERSION}/${PACKAGE_NAME}"
            print_info "娴嬭瘯: $mirror"
            if test_download_url "$test_url"; then
                DOWNLOAD_URL="$test_url"
                print_success "閫夋嫨闀滃儚: $mirror"
                break
            else
                print_warning "闀滃儚涓嶅彲鐢? $mirror"
            fi
        done
        
        if [ -z "$DOWNLOAD_URL" ]; then
            print_error "鎵€鏈?GitHub Release 闀滃儚鍧囦笉鍙敤"
            print_info "寤鸿灏濊瘯: USE_GITEE=yes bash install.sh"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    else
        # 鑷姩閫夋嫨锛氫紭鍏?Gitee锛屽け璐ュ垯灏濊瘯 GitHub 闀滃儚
        print_info "鑷姩閫夋嫨涓嬭浇婧?.."
        
        # 娴嬭瘯 Gitee Release
        gitee_url="${GITEE_RELEASE_URL}/${RELEASE_VERSION}/${PACKAGE_NAME}"
        print_info "娴嬭瘯 Gitee Release..."
        if test_download_url "$gitee_url"; then
            DOWNLOAD_URL="$gitee_url"
            print_success "浣跨敤 Gitee Release 婧愶紙鍥藉唴鎺ㄨ崘锛?
        else
            print_warning "Gitee Release 涓嶅彲鐢紝灏濊瘯 GitHub 闀滃儚..."
            
            # 娴嬭瘯鎵€鏈?GitHub 闀滃儚
            for mirror in "${GITHUB_RELEASE_MIRRORS[@]}"; do
                test_url="${mirror}/${RELEASE_VERSION}/${PACKAGE_NAME}"
                print_info "娴嬭瘯: $mirror"
                if test_download_url "$test_url"; then
                    DOWNLOAD_URL="$test_url"
                    print_success "閫夋嫨闀滃儚: $mirror"
                    break
                else
                    print_warning "闀滃儚涓嶅彲鐢? $mirror"
                fi
            done
            
            if [ -z "$DOWNLOAD_URL" ]; then
                print_error "鎵€鏈変笅杞芥簮鍧囦笉鍙敤"
                print_info "鍙兘鐨勫師鍥?"
                print_info "1. 缃戠粶杩炴帴闂"
                print_info "2. Release 鐗堟湰涓嶅瓨鍦?
                print_info "3. 璇疯闂?https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases 妫€鏌?
                rm -rf "$TEMP_DIR"
                exit 1
            fi
        fi
    fi
    
    print_info "涓嬭浇鍦板潃: $DOWNLOAD_URL"
    print_info "寮€濮嬩笅杞藉畨瑁呭寘..."
    
    # 涓嬭浇瀹夎鍖?
    if curl -fsSL -o "$PACKAGE_NAME" "$DOWNLOAD_URL"; then
        print_success "瀹夎鍖呬笅杞藉畬鎴?
    else
        print_error "涓嬭浇澶辫触"
        print_info "璇锋鏌ョ綉缁滆繛鎺ユ垨鎵嬪姩涓嬭浇瀹夎鍖?
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # 瑙ｅ帇瀹夎鍖?
    print_info "瑙ｅ帇瀹夎鍖?.."
    mkdir -p cf-tunnel-manager
    tar -xzf "$PACKAGE_NAME" -C cf-tunnel-manager
    
    if [ $? -ne 0 ]; then
        print_error "瑙ｅ帇澶辫触"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    PROJECT_DIR="$TEMP_DIR/cf-tunnel-manager"
    print_success "瀹夎鍖呰В鍘嬪畬鎴?
}

# 妫€鏌ラ」鐩枃浠舵垨涓嬭浇瀹夎鍖?
check_or_download_package() {
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    # 妫€鏌ユ槸鍚﹀湪椤圭洰鐩綍涓紙鏈湴瀹夎锛?
    if [ -f "$SCRIPT_DIR/package.json" ] && [ -d "$SCRIPT_DIR/server" ] && [ -d "$SCRIPT_DIR/dist" ]; then
        print_info "妫€娴嬪埌瀹屾暣椤圭洰鏂囦欢锛屼娇鐢ㄦ湰鍦版枃浠跺畨瑁?
        PROJECT_DIR="$SCRIPT_DIR"
        return 0
    fi
    
    # 濡傛灉涓嶅湪椤圭洰鐩綍锛屼笅杞藉畨瑁呭寘
    print_info "鏈娴嬪埌椤圭洰鏂囦欢锛屼粠 Release 涓嬭浇瀹夎鍖?.."
    download_package
}

# 娴嬭瘯闀滃儚婧愯繛鎺ラ€熷害
test_mirror_speed() {
    local mirror=$1
    local timeout=5
    
    # 浣跨敤 git ls-remote 娴嬭瘯杩炴帴
    if timeout $timeout git ls-remote "$mirror" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# 瀹夎 Node.js
install_nodejs() {
    print_info "妫€鏌?Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js 宸插畨瑁? $NODE_VERSION"
        
        # 妫€鏌ョ増鏈槸鍚?>= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_warning "Node.js 鐗堟湰杩囦綆锛岄渶瑕佸崌绾у埌 18 鎴栨洿楂樼増鏈?
            NEED_INSTALL=true
        else
            return 0
        fi
    else
        NEED_INSTALL=true
    fi
    
    if [ "$NEED_INSTALL" = true ]; then
        print_info "瀹夎 Node.js 18.x..."
        
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
        elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
        else
            print_error "涓嶆敮鎸佺殑鎿嶄綔绯荤粺: $OS"
            print_info "璇锋墜鍔ㄥ畨瑁?Node.js 18 鎴栨洿楂樼増鏈? https://nodejs.org/"
            exit 1
        fi
        
        print_success "Node.js 瀹夎瀹屾垚: $(node -v)"
    fi
}

# 鍒涘缓瀹夎鐩綍
create_install_dir() {
    print_info "鍒涘缓瀹夎鐩綍: $INSTALL_DIR"
    
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "瀹夎鐩綍宸插瓨鍦紝灏嗚繘琛屽浠?.."
        BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        mv "$INSTALL_DIR" "$BACKUP_DIR"
        print_info "宸插浠藉埌: $BACKUP_DIR"
    fi
    
    mkdir -p "$INSTALL_DIR"
    print_success "瀹夎鐩綍鍒涘缓瀹屾垚"
}

# 澶嶅埗鏂囦欢
copy_files() {
    print_info "澶嶅埗搴旂敤鏂囦欢..."
    
    # 浣跨敤妫€娴嬪埌鐨勯」鐩洰褰?
    cd "$PROJECT_DIR"
    
    # 澶嶅埗 server 鐩綍
    if [ -d "server" ]; then
        cp -r server "$INSTALL_DIR/"
    fi
    
    # 澶嶅埗 dist 鐩綍
    if [ -d "dist" ]; then
        cp -r dist "$INSTALL_DIR/"
    fi
    
    # 澶嶅埗閰嶇疆鏂囦欢
    cp package.json "$INSTALL_DIR/" 2>/dev/null || true
    cp package-lock.json "$INSTALL_DIR/" 2>/dev/null || true
    cp .npmrc "$INSTALL_DIR/" 2>/dev/null || true
    
    # 澶嶅埗鑴氭湰
    cp install.sh "$INSTALL_DIR/" 2>/dev/null || true
    cp uninstall.sh "$INSTALL_DIR/" 2>/dev/null || true
    cp update.sh "$INSTALL_DIR/" 2>/dev/null || true
    
    # 澶嶅埗 CLI 绠＄悊宸ュ叿
    if [ -f "cftm.js" ]; then
        cp cftm.js "$INSTALL_DIR/"
        chmod +x "$INSTALL_DIR/cftm.js"
    fi
    
    # 澶嶅埗鏂囨。
    cp *.md "$INSTALL_DIR/" 2>/dev/null || true
    
    print_success "鏂囦欢澶嶅埗瀹屾垚"
}

# 瀹夎渚濊禆
install_dependencies() {
    print_info "瀹夎椤圭洰渚濊禆..."
    
    cd "$INSTALL_DIR"
    
    # 妫€鏌ユ槸鍚﹀凡鏈?dist 鐩綍
    if [ -d "$INSTALL_DIR/dist" ]; then
        # 宸叉湁鏋勫缓鏂囦欢,鍙畨瑁呯敓浜т緷璧?
        print_info "妫€娴嬪埌宸叉瀯寤烘枃浠?浠呭畨瑁呯敓浜т緷璧?.."
        npm install --omit=dev
    else
        # 闇€瑕佹瀯寤?瀹夎鎵€鏈変緷璧?
        print_info "闇€瑕佹瀯寤哄墠绔?瀹夎鎵€鏈変緷璧?.."
        npm install
    fi
    
    print_success "渚濊禆瀹夎瀹屾垚"
}

# 妫€鏌ュ墠绔瀯寤烘枃浠?
check_frontend() {
    print_info "妫€鏌ュ墠绔瀯寤烘枃浠?.."
    
    if [ ! -d "$INSTALL_DIR/dist" ]; then
        print_error "鏈壘鍒板墠绔瀯寤烘枃浠?(dist 鐩綍)"
        print_info "瀹夎鍖呭彲鑳戒笉瀹屾暣,璇烽噸鏂颁笅杞?
        exit 1
    fi
    
    print_success "鍓嶇鏋勫缓鏂囦欢妫€鏌ュ畬鎴?
}

# 鍒涘缓 systemd 鏈嶅姟
create_systemd_service() {
    print_info "鍒涘缓 systemd 鏈嶅姟..."
    
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
    print_success "systemd 鏈嶅姟鍒涘缓瀹屾垚"
}

# 閰嶇疆闃茬伀澧?
configure_firewall() {
    print_info "閰嶇疆闃茬伀澧?.."
    
    # 妫€鏌?firewalld
    if command -v firewall-cmd &> /dev/null; then
        if systemctl is-active --quiet firewalld; then
            firewall-cmd --permanent --add-port=${PORT}/tcp
            firewall-cmd --reload
            print_success "firewalld 瑙勫垯宸叉坊鍔?
        fi
    fi
    
    # 妫€鏌?ufw
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            ufw allow ${PORT}/tcp
            print_success "ufw 瑙勫垯宸叉坊鍔?
        fi
    fi
}

# 鍚姩鏈嶅姟
start_service() {
    print_info "鍚姩鏈嶅姟..."
    
    systemctl enable ${SERVICE_NAME}
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

# 鑾峰彇鏈嶅姟鍣?IP
get_server_ip() {
    # 灏濊瘯鑾峰彇鍏綉 IP
    PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "")
    
    # 鑾峰彇鍐呯綉 IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    
    if [ -n "$PUBLIC_IP" ]; then
        SERVER_IP=$PUBLIC_IP
    else
        SERVER_IP=$LOCAL_IP
    fi
}

# 鎵撳嵃瀹夎淇℃伅
print_installation_info() {
    get_server_ip
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}瀹夎瀹屾垚锛?{NC}"
    echo "=========================================="
    echo ""
    echo "馃摝 瀹夎鐩綍: $INSTALL_DIR"
    echo "馃殌 鏈嶅姟鍚嶇О: $SERVICE_NAME"
    echo "馃摗 鐩戝惉绔彛: $PORT"
    echo ""
    echo "馃寪 璁块棶鍦板潃:"
    echo "   - http://${SERVER_IP}:${PORT}"
    if [ "$SERVER_IP" != "$LOCAL_IP" ] && [ -n "$LOCAL_IP" ]; then
        echo "   - http://${LOCAL_IP}:${PORT} (鍐呯綉)"
    fi
    echo ""
    echo "馃搵 甯哥敤鍛戒护 (cftm):"
    echo ""
    echo "  鏈嶅姟绠＄悊:"
    echo "   cftm start      # 鍚姩鏈嶅姟"
    echo "   cftm stop       # 鍋滄鏈嶅姟"
    echo "   cftm restart    # 閲嶅惎鏈嶅姟"
    echo "   cftm service    # 鏌ョ湅鏈嶅姟鐘舵€?
    echo "   cftm logs       # 鏌ョ湅鏈嶅姟鏃ュ織"
    echo ""
    echo "  鐢ㄦ埛绠＄悊:"
    echo "   cftm reset-admin        # 閲嶇疆绠＄悊鍛樺瘑鐮?
    echo "   cftm change-password    # 淇敼瀵嗙爜"
    echo "   cftm list-users         # 鏌ョ湅鐢ㄦ埛鍒楄〃"
    echo "   cftm add-user           # 娣诲姞鐢ㄦ埛"
    echo "   cftm remove-user <鐢ㄦ埛> # 鍒犻櫎鐢ㄦ埛"
    echo ""
    echo "  绯荤粺淇℃伅:"
    echo "   cftm status     # 绯荤粺鐘舵€?
    echo "   cftm --help     # 鏌ョ湅甯姪"
    echo ""
    echo "馃搧 鏁版嵁鐩綍: ~/.cloudflare-tunnel-manager"
    echo ""
    echo "=========================================="
    echo ""
}

# 鍒涘缓 cftm 鍛戒护閾炬帴
create_cftm_command() {
    print_info "鍒涘缓 cftm 鍛戒护..."
    
    if [ -f "$INSTALL_DIR/cftm.js" ]; then
        # 鍒涘缓杞摼鎺ュ埌 /usr/local/bin
        ln -sf "$INSTALL_DIR/cftm.js" /usr/local/bin/cftm
        chmod +x /usr/local/bin/cftm
        print_success "cftm 鍛戒护鍒涘缓瀹屾垚"
        print_info "鐜板湪鍙互鍦ㄤ换浣曚綅缃娇鐢?'cftm' 鍛戒护绠＄悊绯荤粺"
    else
        print_warning "鏈壘鍒?cftm.js 鏂囦欢锛岃烦杩囧懡浠ゅ垱寤?
    fi
}

# 涓诲嚱鏁?
main() {
    echo ""
    echo "=========================================="
    echo "  Cloudflare Tunnel Manager - 瀹夎绋嬪簭"
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

# 杩愯涓诲嚱鏁?
main
