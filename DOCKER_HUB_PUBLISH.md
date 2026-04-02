# Docker Hub 发布指南

本文档介绍如何将 Cloudflare Tunnel Manager 镜像发布到 Docker Hub。

## 📋 目录

- [前置准备](#前置准备)
- [注册 Docker Hub](#注册-docker-hub)
- [本地构建镜像](#本地构建镜像)
- [推送到 Docker Hub](#推送到-docker-hub)
- [验证镜像](#验证镜像)
- [更新镜像](#更新镜像)
- [常见问题](#常见问题)

---

## 前置准备

### 1. 安装 Docker

确保已安装 Docker：

```bash
docker --version
```

如果未安装，请访问：https://docs.docker.com/get-docker/

### 2. 检查项目文件

确保以下文件存在：

```bash
cd cf-linux
ls -la Dockerfile .dockerignore VERSION
```

---

## 注册 Docker Hub

### 1. 创建账号

访问 https://hub.docker.com/ 注册账号

**建议用户名**：
- 使用 GitHub 用户名保持一致
- 例如：`mrleehj`

### 2. 创建仓库（可选）

登录后可以创建仓库，或者推送时自动创建。

**仓库命名建议**：
- `cf-tunnel-manager` 或 `cloudflare-tunnel-manager`

---

## 本地构建镜像

### 1. 读取版本号

```bash
cd cf-linux
VERSION=$(cat VERSION | tr -d '[:space:]')
echo "当前版本: $VERSION"
```

### 2. 设置镜像名称

```bash
# 替换为你的 Docker Hub 用户名
DOCKER_USERNAME="mrleehj"
IMAGE_NAME="cf-tunnel-manager"
FULL_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

echo "镜像名称: ${FULL_NAME}"
```

### 3. 构建镜像

```bash
# 构建镜像并打标签
docker build \
  -t ${FULL_NAME}:${VERSION} \
  -t ${FULL_NAME}:latest \
  .
```

**预期输出**：
```
[+] Building 120.5s (18/18) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 1.23kB
 ...
 => => naming to docker.io/mrleehj/cf-tunnel-manager:1.3.0
 => => naming to docker.io/mrleehj/cf-tunnel-manager:latest
```

### 4. 验证镜像

```bash
# 查看镜像
docker images ${FULL_NAME}

# 预期输出
REPOSITORY                        TAG       IMAGE ID       CREATED         SIZE
mrleehj/cf-tunnel-manager        1.3.0     abc123def456   2 minutes ago   180MB
mrleehj/cf-tunnel-manager        latest    abc123def456   2 minutes ago   180MB
```

### 5. 本地测试

```bash
# 运行容器测试
docker run -d \
  --name cf-tunnel-test \
  -p 3000:3000 \
  -v cf-data-test:/data \
  ${FULL_NAME}:latest

# 等待启动
sleep 5

# 检查状态
docker ps | grep cf-tunnel-test

# 测试访问
curl http://localhost:3000/api/health

# 清理测试容器
docker stop cf-tunnel-test
docker rm cf-tunnel-test
docker volume rm cf-data-test
```

---

## 推送到 Docker Hub

### 1. 登录 Docker Hub

```bash
docker login
```

**输入信息**：
- Username: 你的 Docker Hub 用户名
- Password: 你的密码或访问令牌

**成功提示**：
```
Login Succeeded
```

### 2. 推送镜像

```bash
# 推送版本标签
docker push ${FULL_NAME}:${VERSION}

# 推送 latest 标签
docker push ${FULL_NAME}:latest
```

**推送过程**：
```
The push refers to repository [docker.io/mrleehj/cf-tunnel-manager]
abc123def456: Pushed
def456ghi789: Pushed
...
1.3.0: digest: sha256:abc123... size: 2345
latest: digest: sha256:abc123... size: 2345
```

### 3. 查看推送结果

访问：https://hub.docker.com/r/你的用户名/cf-tunnel-manager

---

## 验证镜像

### 1. 删除本地镜像

```bash
# 删除本地镜像以测试拉取
docker rmi ${FULL_NAME}:${VERSION}
docker rmi ${FULL_NAME}:latest
```

### 2. 从 Docker Hub 拉取

```bash
# 拉取镜像
docker pull ${FULL_NAME}:latest

# 验证
docker images ${FULL_NAME}
```

### 3. 运行测试

```bash
# 运行容器
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  ${FULL_NAME}:latest

# 访问测试
curl http://localhost:3000/api/health

# 浏览器访问
# http://localhost:3000
```

---

## 更新镜像

### 发布新版本流程

#### 1. 更新版本号

```bash
# 编辑 VERSION 文件
echo "1.3.1" > VERSION

# 提交到 Git
git add VERSION
git commit -m "chore: bump version to 1.3.1"
git push
```

#### 2. 重新构建

```bash
# 读取新版本
VERSION=$(cat VERSION | tr -d '[:space:]')

# 构建新镜像
docker build \
  -t ${FULL_NAME}:${VERSION} \
  -t ${FULL_NAME}:latest \
  .
```

#### 3. 推送新版本

```bash
# 推送版本标签
docker push ${FULL_NAME}:${VERSION}

# 推送 latest 标签
docker push ${FULL_NAME}:latest
```

#### 4. 创建 Git 标签

```bash
# 创建标签
git tag -a v${VERSION} -m "Release v${VERSION}"

# 推送标签
git push origin v${VERSION}
```

---

## 使用推送脚本

### 创建自动化脚本

创建 `docker-push.sh`：

```bash
#!/bin/bash

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 配置
DOCKER_USERNAME="mrleehj"  # 修改为你的用户名
IMAGE_NAME="cf-tunnel-manager"
FULL_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

# 读取版本
if [ -f "VERSION" ]; then
    VERSION=$(cat VERSION | tr -d '[:space:]')
else
    VERSION="latest"
fi

print_info "准备推送镜像"
print_info "镜像: ${FULL_NAME}"
print_info "版本: ${VERSION}"
echo ""

# 检查是否已登录
if ! docker info | grep -q "Username"; then
    print_info "请先登录 Docker Hub"
    docker login
fi

# 推送镜像
print_info "推送版本标签: ${VERSION}"
docker push ${FULL_NAME}:${VERSION}

print_info "推送 latest 标签"
docker push ${FULL_NAME}:latest

print_success "镜像推送完成"
echo ""
print_info "镜像地址:"
echo "  docker pull ${FULL_NAME}:${VERSION}"
echo "  docker pull ${FULL_NAME}:latest"
echo ""
print_info "Docker Hub 地址:"
echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
echo ""
```

### 使用脚本

```bash
# 添加执行权限
chmod +x docker-push.sh

# 运行脚本
bash docker-push.sh
```

---

## 配置仓库信息

### 1. 设置仓库描述

登录 Docker Hub，进入仓库设置：

**Short Description**（简短描述）：
```
Cloudflare Tunnel Manager - Web-based management interface for cloudflared
```

**Full Description**（完整描述）：
```markdown
# Cloudflare Tunnel Manager

Web-based management interface for Cloudflare Tunnel (cloudflared).

## Features

- 🚀 Easy deployment with Docker
- 🔐 Secure authentication with JWT
- 🌐 Web-based management interface
- 📊 Real-time tunnel status monitoring
- 📝 Log viewing and management
- 🔧 Multiple tunnel support

## Quick Start

```bash
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  --restart unless-stopped \
  mrleehj/cf-tunnel-manager:latest
```

Visit http://localhost:3000

## Documentation

- GitHub: https://github.com/mrleehj/CFTunnel
- Docker Guide: https://github.com/mrleehj/CFTunnel/blob/main/cf-linux/DOCKER.md

## Support

- Issues: https://github.com/mrleehj/CFTunnel/issues
- Discussions: https://github.com/mrleehj/CFTunnel/discussions
```

### 2. 添加标签

在仓库设置中添加标签：

```
cloudflare, tunnel, cloudflared, docker, web-interface, management, proxy
```

---

## 常见问题

### 1. 推送失败：unauthorized

**问题**：
```
unauthorized: authentication required
```

**解决**：
```bash
# 重新登录
docker logout
docker login
```

### 2. 推送失败：denied

**问题**：
```
denied: requested access to the resource is denied
```

**原因**：
- 仓库名称不正确
- 没有权限

**解决**：
```bash
# 检查镜像名称
docker images

# 确保格式为：用户名/仓库名
# 正确：mrleehj/cf-tunnel-manager
# 错误：cf-tunnel-manager
```

### 3. 镜像太大

**问题**：镜像超过 200MB

**优化**：
- 检查 .dockerignore 是否正确
- 确保使用多阶段构建
- 清理不必要的文件

### 4. 构建失败

**问题**：构建过程出错

**检查**：
```bash
# 检查 Dockerfile 语法
docker build --no-cache -t test .

# 查看详细日志
docker build --progress=plain -t test .
```

### 5. 推送速度慢

**问题**：推送到 Docker Hub 很慢

**解决**：
- 使用国内镜像加速
- 或使用阿里云容器镜像服务

---

## 最佳实践

### 1. 版本管理

- 使用语义化版本号（Semantic Versioning）
- 主版本.次版本.修订号（例如：1.3.0）
- 每次发布都打标签

### 2. 标签策略

推荐的标签：
- `latest` - 最新稳定版
- `1.3.0` - 具体版本号
- `1.3` - 次版本号
- `1` - 主版本号

### 3. 镜像大小

- 目标：< 200MB
- 使用 alpine 基础镜像
- 多阶段构建
- 清理缓存

### 4. 安全性

- 定期更新基础镜像
- 扫描安全漏洞
- 使用非 root 用户

### 5. 文档

- 保持 README 更新
- 提供使用示例
- 说明环境变量

---

## 下一步

完成手动推送后，可以考虑：

1. **配置 GitHub Actions**
   - 自动构建镜像
   - 自动推送到 Docker Hub
   - 多架构支持

2. **添加镜像扫描**
   - 安全漏洞扫描
   - 最佳实践检查

3. **配置 Webhook**
   - 自动触发构建
   - 通知机制

---

## 相关资源

- Docker Hub: https://hub.docker.com/
- Docker 文档: https://docs.docker.com/
- 最佳实践: https://docs.docker.com/develop/dev-best-practices/

---

**祝发布顺利！** 🚀
