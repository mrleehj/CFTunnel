#!/bin/bash

# Cloudflare Tunnel Manager - 打包脚本
# 用于在本地打包，然后上传到服务器安装

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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取版本号
VERSION=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="cf-tunnel-manager-${VERSION}.tar.gz"

echo ""
echo "=========================================="
echo "  Cloudflare Tunnel Manager - 打包工具"
echo "=========================================="
echo ""

# 检查 Node.js
print_info "检查 Node.js..."
if ! command -v node &> /dev/null; then
    print_error "未安装 Node.js"
    print_info "请访问 https://nodejs.org/ 安装 Node.js"
    exit 1
fi
print_success "Node.js 版本: $(node -v)"

# 检查依赖
print_info "检查项目依赖..."
if [ ! -d "node_modules" ]; then
    print_warning "未安装依赖，正在安装..."
    npm install
fi
print_success "依赖检查完成"

# 构建前端
print_info "构建前端应用..."
npm run build
print_success "前端构建完成"

# 创建临时目录
print_info "准备打包文件..."
TEMP_DIR="cf-tunnel-manager-temp"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# 复制必要文件
print_info "复制文件..."

# 复制服务器代码
cp -r server "$TEMP_DIR/"

# 复制构建后的前端
cp -r dist "$TEMP_DIR/"

# 复制配置文件
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/" 2>/dev/null || true

# 复制安装脚本
cp install.sh "$TEMP_DIR/"
cp uninstall.sh "$TEMP_DIR/"
cp update.sh "$TEMP_DIR/"

# 复制 CLI 管理工具
cp cftm.js "$TEMP_DIR/"

# 转换为 Unix 换行符（LF）
if command -v dos2unix &> /dev/null; then
    dos2unix "$TEMP_DIR/cftm.js" 2>/dev/null || sed -i 's/\r$//' "$TEMP_DIR/cftm.js"
else
    sed -i 's/\r$//' "$TEMP_DIR/cftm.js"
fi

chmod +x "$TEMP_DIR/cftm.js"

# 复制文档
cp README.md "$TEMP_DIR/"
cp INSTALL.md "$TEMP_DIR/"
cp DEPLOY.md "$TEMP_DIR/"
cp SECURITY.md "$TEMP_DIR/"
cp PROJECT_STRUCTURE.md "$TEMP_DIR/" 2>/dev/null || true

# 创建 .npmrc（使用国内镜像加速）
cat > "$TEMP_DIR/.npmrc" << EOF
registry=https://registry.npmmirror.com
EOF

print_success "文件复制完成"

# 打包
print_info "创建压缩包..."
tar -czf "$PACKAGE_NAME" -C "$TEMP_DIR" .
print_success "压缩包创建完成: $PACKAGE_NAME"

# 清理临时目录
rm -rf "$TEMP_DIR"

# 获取文件大小
SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)

# 创建部署脚本
print_info "创建部署脚本..."
cat > "deploy-${VERSION}.sh" << 'DEPLOY_SCRIPT'
#!/bin/bash

# 自动部署脚本

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

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用 root 权限运行"
    echo "使用方法: sudo bash deploy-*.sh"
    exit 1
fi

# 查找压缩包
PACKAGE=$(ls cf-tunnel-manager-*.tar.gz 2>/dev/null | head -n 1)

if [ -z "$PACKAGE" ]; then
    print_error "未找到安装包 (cf-tunnel-manager-*.tar.gz)"
    exit 1
fi

print_info "找到安装包: $PACKAGE"

# 解压到临时目录
TEMP_DIR=$(mktemp -d)
print_info "解压安装包..."
tar -xzf "$PACKAGE" -C "$TEMP_DIR"

# 进入临时目录并运行安装脚本
cd "$TEMP_DIR"
chmod +x install.sh
bash install.sh

# 清理
cd -
rm -rf "$TEMP_DIR"

print_success "部署完成！"
DEPLOY_SCRIPT

chmod +x "deploy-${VERSION}.sh"
print_success "部署脚本创建完成: deploy-${VERSION}.sh"

echo ""
echo "=========================================="
echo -e "${GREEN}打包完成！${NC}"
echo "=========================================="
echo ""
echo "📦 安装包: $PACKAGE_NAME"
echo "📏 文件大小: $SIZE"
echo "🚀 部署脚本: deploy-${VERSION}.sh"
echo ""
echo "📝 部署步骤:"
echo ""
echo "1. 上传文件到服务器:"
echo "   scp $PACKAGE_NAME deploy-${VERSION}.sh user@your-server:/tmp/"
echo ""
echo "2. SSH 登录服务器:"
echo "   ssh user@your-server"
echo ""
echo "3. 运行部署脚本:"
echo "   cd /tmp"
echo "   sudo bash deploy-${VERSION}.sh"
echo ""
echo "=========================================="
echo ""
