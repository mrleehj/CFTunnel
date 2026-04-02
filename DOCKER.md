# Docker 部署指南

本文档介绍如何使用 Docker 部署 Cloudflare Tunnel Manager。

## 📋 目录

- [快速开始](#快速开始)
- [构建镜像](#构建镜像)
- [运行容器](#运行容器)
- [数据持久化](#数据持久化)
- [环境变量](#环境变量)
- [常用命令](#常用命令)
- [故障排查](#故障排查)

---

## 快速开始

### 使用预构建镜像（推荐）

```bash
# 拉取镜像
docker pull cf-tunnel-manager:latest

# 运行容器
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  --restart unless-stopped \
  cf-tunnel-manager:latest
```

访问 http://localhost:3000

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/mrleehj/CFTunnel.git
cd CFTunnel/cf-linux

# 构建镜像
bash docker-build.sh

# 运行容器
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  --restart unless-stopped \
  cf-tunnel-manager:latest
```

---

## 构建镜像

### 基础构建

```bash
docker build -t cf-tunnel-manager:latest .
```

### 使用构建脚本（推荐）

```bash
# 自动读取版本号并构建
bash docker-build.sh

# 指定仓库名称
REGISTRY=your-dockerhub-username bash docker-build.sh
```

### 多架构构建

```bash
# 创建 buildx 构建器
docker buildx create --name mybuilder --use

# 构建多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t cf-tunnel-manager:latest \
  --push \
  .
```

---

## 运行容器

### 基础运行

```bash
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  cf-tunnel-manager:latest
```

### 自定义端口

```bash
docker run -d \
  --name cf-tunnel \
  -p 8080:3000 \
  -v cf-data:/data \
  -e PORT=3000 \
  cf-tunnel-manager:latest
```

### 使用环境变量文件

```bash
# 复制环境变量示例
cp .env.example .env

# 编辑 .env 文件
nano .env

# 使用 .env 文件运行
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  --env-file .env \
  cf-tunnel-manager:latest
```

### 绑定挂载（开发模式）

```bash
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v $(pwd)/data:/data \
  cf-tunnel-manager:latest
```

---

## 数据持久化

### 使用命名卷（推荐）

```bash
# 创建卷
docker volume create cf-data

# 运行容器
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  cf-tunnel-manager:latest

# 查看卷信息
docker volume inspect cf-data

# 备份数据
docker run --rm \
  -v cf-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/cf-data-backup.tar.gz -C /data .

# 恢复数据
docker run --rm \
  -v cf-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/cf-data-backup.tar.gz -C /data
```

### 数据目录结构

```
/data/
├── users/              # 用户数据
│   └── users.json
├── tunnels/            # Tunnel 配置
│   └── <tunnel-id>.yml
├── credentials/        # 凭证文件
│   └── <tunnel-id>.json
├── logs/               # 日志文件
│   ├── install.log
│   └── tunnel-<name>.log
└── cloudflared/        # cloudflared 二进制
    └── cloudflared
```

---

## 环境变量

### 可用环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 监听端口 | `3000` |
| `DATA_DIR` | 数据目录 | `/data` |
| `JWT_SECRET` | JWT 密钥 | 自动生成 |
| `LOG_LEVEL` | 日志级别 | `info` |
| `CLOUDFLARED_VERSION` | cloudflared 版本 | `latest` |
| `DOWNLOAD_MIRROR` | 下载镜像源 | - |

### 设置环境变量

**方法 1: 命令行参数**
```bash
docker run -d \
  -e PORT=8080 \
  -e LOG_LEVEL=debug \
  cf-tunnel-manager:latest
```

**方法 2: 环境变量文件**
```bash
docker run -d --env-file .env cf-tunnel-manager:latest
```

---

## 常用命令

### 容器管理

```bash
# 启动容器
docker start cf-tunnel

# 停止容器
docker stop cf-tunnel

# 重启容器
docker restart cf-tunnel

# 删除容器
docker rm -f cf-tunnel

# 查看容器状态
docker ps -a | grep cf-tunnel

# 查看容器日志
docker logs -f cf-tunnel

# 查看最近 100 行日志
docker logs --tail 100 cf-tunnel

# 进入容器
docker exec -it cf-tunnel sh

# 查看容器资源使用
docker stats cf-tunnel
```

### 镜像管理

```bash
# 查看镜像
docker images cf-tunnel-manager

# 删除镜像
docker rmi cf-tunnel-manager:latest

# 清理未使用的镜像
docker image prune -a

# 导出镜像
docker save cf-tunnel-manager:latest | gzip > cf-tunnel-manager.tar.gz

# 导入镜像
docker load < cf-tunnel-manager.tar.gz
```

### 数据管理

```bash
# 查看卷
docker volume ls

# 查看卷详情
docker volume inspect cf-data

# 删除卷
docker volume rm cf-data

# 清理未使用的卷
docker volume prune
```

---

## 故障排查

### 容器无法启动

**检查日志**:
```bash
docker logs cf-tunnel
```

**常见原因**:
- 端口被占用
- 数据卷权限问题
- 环境变量配置错误

**解决方法**:
```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 更换端口
docker run -d -p 8080:3000 ...

# 检查卷权限
docker exec cf-tunnel ls -la /data
```

### 无法访问服务

**检查容器状态**:
```bash
docker ps | grep cf-tunnel
```

**检查端口映射**:
```bash
docker port cf-tunnel
```

**检查防火墙**:
```bash
# Ubuntu/Debian
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 数据丢失

**检查卷挂载**:
```bash
docker inspect cf-tunnel | grep -A 10 Mounts
```

**恢复备份**:
```bash
docker run --rm \
  -v cf-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/cf-data-backup.tar.gz -C /data
```

### 性能问题

**查看资源使用**:
```bash
docker stats cf-tunnel
```

**限制资源**:
```bash
docker run -d \
  --name cf-tunnel \
  --memory="512m" \
  --cpus="1.0" \
  -p 3000:3000 \
  -v cf-data:/data \
  cf-tunnel-manager:latest
```

### 健康检查失败

**查看健康状态**:
```bash
docker inspect --format='{{.State.Health.Status}}' cf-tunnel
```

**查看健康检查日志**:
```bash
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' cf-tunnel
```

---

## 高级配置

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 配置 HTTPS

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 资源限制

```bash
docker run -d \
  --name cf-tunnel \
  --memory="512m" \
  --memory-swap="1g" \
  --cpus="1.0" \
  --pids-limit=100 \
  -p 3000:3000 \
  -v cf-data:/data \
  cf-tunnel-manager:latest
```

---

## 更新升级

### 更新到最新版本

```bash
# 停止并删除旧容器
docker stop cf-tunnel
docker rm cf-tunnel

# 拉取最新镜像
docker pull cf-tunnel-manager:latest

# 启动新容器（使用相同的数据卷）
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  --restart unless-stopped \
  cf-tunnel-manager:latest
```

### 回滚到旧版本

```bash
# 停止当前容器
docker stop cf-tunnel
docker rm cf-tunnel

# 使用旧版本镜像
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  cf-tunnel-manager:v1.2.0
```

---

## 安全建议

1. **不要使用 root 用户**: 镜像已配置为非 root 用户运行
2. **限制资源**: 使用 `--memory` 和 `--cpus` 限制资源
3. **使用 HTTPS**: 配置 SSL 证书
4. **定期备份**: 定期备份数据卷
5. **更新镜像**: 及时更新到最新版本
6. **网络隔离**: 使用 Docker 网络隔离容器

---

## 相关文档

- [README](README.md) - 项目介绍
- [部署指南](DEPLOY.md) - 传统部署方式
- [Docker Compose](docker-compose.yml) - 多容器部署

---

**祝使用愉快！** 🚀
