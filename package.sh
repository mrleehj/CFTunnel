#!/bin/bash

# Cloudflare Tunnel Manager - 鎵撳寘鑴氭湰
# 鐢ㄤ簬鍦ㄦ湰鍦版墦鍖咃紝鐒跺悗涓婁紶鍒版湇鍔″櫒瀹夎

set -e

# 棰滆壊瀹氫箟
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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 鑾峰彇鐗堟湰鍙?VERSION=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="cf-tunnel-manager-${VERSION}.tar.gz"

echo ""
echo "=========================================="
echo "  Cloudflare Tunnel Manager - 鎵撳寘宸ュ叿"
echo "=========================================="
echo ""

# 妫€鏌?Node.js
print_info "妫€鏌?Node.js..."
if ! command -v node &> /dev/null; then
    print_error "鏈畨瑁?Node.js"
    print_info "璇疯闂?https://nodejs.org/ 瀹夎 Node.js"
    exit 1
fi
print_success "Node.js 鐗堟湰: $(node -v)"

# 妫€鏌ヤ緷璧?print_info "妫€鏌ラ」鐩緷璧?.."
if [ ! -d "node_modules" ]; then
    print_warning "鏈畨瑁呬緷璧栵紝姝ｅ湪瀹夎..."
    npm install
fi
print_success "渚濊禆妫€鏌ュ畬鎴?

# 鏋勫缓鍓嶇
print_info "鏋勫缓鍓嶇搴旂敤..."
npm run build
print_success "鍓嶇鏋勫缓瀹屾垚"

# 鍒涘缓涓存椂鐩綍
print_info "鍑嗗鎵撳寘鏂囦欢..."
TEMP_DIR="cf-tunnel-manager-temp"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# 澶嶅埗蹇呰鏂囦欢
print_info "澶嶅埗鏂囦欢..."

# 澶嶅埗鏈嶅姟鍣ㄤ唬鐮?cp -r server "$TEMP_DIR/"

# 澶嶅埗鏋勫缓鍚庣殑鍓嶇
cp -r dist "$TEMP_DIR/"

# 澶嶅埗閰嶇疆鏂囦欢
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/" 2>/dev/null || true

# 澶嶅埗瀹夎鑴氭湰
cp install.sh "$TEMP_DIR/"
cp uninstall.sh "$TEMP_DIR/"
cp update.sh "$TEMP_DIR/"

# 澶嶅埗 CLI 绠＄悊宸ュ叿
cp cftm.js "$TEMP_DIR/"

# 杞崲涓?Unix 鎹㈣绗︼紙LF锛?if command -v dos2unix &> /dev/null; then
    dos2unix "$TEMP_DIR/cftm.js" 2>/dev/null || sed -i 's/\r$//' "$TEMP_DIR/cftm.js"
else
    sed -i 's/\r$//' "$TEMP_DIR/cftm.js"
fi

chmod +x "$TEMP_DIR/cftm.js"

# 澶嶅埗鏂囨。
cp README.md "$TEMP_DIR/"
cp INSTALL.md "$TEMP_DIR/"
cp DEPLOY.md "$TEMP_DIR/"
cp SECURITY.md "$TEMP_DIR/"
cp PROJECT_STRUCTURE.md "$TEMP_DIR/" 2>/dev/null || true

# 鍒涘缓 .npmrc锛堜娇鐢ㄥ浗鍐呴暅鍍忓姞閫燂級
cat > "$TEMP_DIR/.npmrc" << EOF
registry=https://registry.npmmirror.com
EOF

print_success "鏂囦欢澶嶅埗瀹屾垚"

# 鎵撳寘
print_info "鍒涘缓鍘嬬缉鍖?.."
tar -czf "$PACKAGE_NAME" -C "$TEMP_DIR" .
print_success "鍘嬬缉鍖呭垱寤哄畬鎴? $PACKAGE_NAME"

# 娓呯悊涓存椂鐩綍
rm -rf "$TEMP_DIR"

# 鑾峰彇鏂囦欢澶у皬
SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)

# 鍒涘缓閮ㄧ讲鑴氭湰
print_info "鍒涘缓閮ㄧ讲鑴氭湰..."
cat > "deploy-${VERSION}.sh" << 'DEPLOY_SCRIPT'
#!/bin/bash

# 鑷姩閮ㄧ讲鑴氭湰

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
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

# 妫€鏌?root 鏉冮檺
if [ "$EUID" -ne 0 ]; then 
    print_error "璇蜂娇鐢?root 鏉冮檺杩愯"
    echo "浣跨敤鏂规硶: sudo bash deploy-*.sh"
    exit 1
fi

# 鏌ユ壘鍘嬬缉鍖?PACKAGE=$(ls cf-tunnel-manager-*.tar.gz 2>/dev/null | head -n 1)

if [ -z "$PACKAGE" ]; then
    print_error "鏈壘鍒板畨瑁呭寘 (cf-tunnel-manager-*.tar.gz)"
    exit 1
fi

print_info "鎵惧埌瀹夎鍖? $PACKAGE"

# 瑙ｅ帇鍒颁复鏃剁洰褰?TEMP_DIR=$(mktemp -d)
print_info "瑙ｅ帇瀹夎鍖?.."
tar -xzf "$PACKAGE" -C "$TEMP_DIR"

# 杩涘叆涓存椂鐩綍骞惰繍琛屽畨瑁呰剼鏈?cd "$TEMP_DIR"
chmod +x install.sh
bash install.sh

# 娓呯悊
cd -
rm -rf "$TEMP_DIR"

print_success "閮ㄧ讲瀹屾垚锛?
DEPLOY_SCRIPT

chmod +x "deploy-${VERSION}.sh"
print_success "閮ㄧ讲鑴氭湰鍒涘缓瀹屾垚: deploy-${VERSION}.sh"

echo ""
echo "=========================================="
echo -e "${GREEN}鎵撳寘瀹屾垚锛?{NC}"
echo "=========================================="
echo ""
echo "馃摝 瀹夎鍖? $PACKAGE_NAME"
echo "馃搳 鏂囦欢澶у皬: $SIZE"
echo "馃殌 閮ㄧ讲鑴氭湰: deploy-${VERSION}.sh"
echo ""
echo "馃搵 閮ㄧ讲姝ラ:"
echo ""
echo "1. 涓婁紶鏂囦欢鍒版湇鍔″櫒:"
echo "   scp $PACKAGE_NAME deploy-${VERSION}.sh user@your-server:/tmp/"
echo ""
echo "2. SSH 鐧诲綍鏈嶅姟鍣?"
echo "   ssh user@your-server"
echo ""
echo "3. 杩愯閮ㄧ讲鑴氭湰:"
echo "   cd /tmp"
echo "   sudo bash deploy-${VERSION}.sh"
echo ""
echo "=========================================="
echo ""
