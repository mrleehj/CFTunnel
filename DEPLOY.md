# Cloudflare Tunnel Manager - 部署指南

本文档介绍如何将 Cloudflare Tunnel Manager 部署到 Linux 服务器。

## 📋 目录

- [部署方式对比](#部署方式对比)
- [方式 1：本地打包部署（推荐）](#方式-1本地打包部署推荐)
- [方式 2：一键快速部署](#方式-2一键快速部署)
- [方式 3：Git 仓库部署](#方式-3git-仓库部署)
- [部署后操作](#部署后操作)
- [常见问题](#常见问题)

---

## 部署方式对比

| 方式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **本地打包部署** | 本地开发、内网部署 | 无需 Git、体积小、速度快 | 需要手动打包 |
| **一键快速部署** | 快速测试、多服务器 | 全自动、最简单 | 需要 SSH 访问 |
| **Git 仓库部署** | 生产环境、团队协作 | 版本管理、易于更新 | 需要 Git 仓库 |

---

## 方式 1：本地打包部署（推荐）

适合本地开发环境，无需上传到 Git 仓库。

### 前置要求

- 本地安装 Node.js >= 18
- 服务器可以通过 SSH 访问
- 服务器有 root 权限

### 步骤 1：本地打包

```bash
cd cf-linux
chmod +x package.sh
bash package.sh
```

打包完成后会生成：
- `cf-tunnel-manager-YYYYMMDD_HHMMSS.tar.gz` - 安装包
- `deploy-YYYYMMDD_HHMMSS.sh` - 部署脚本

### 步骤 2：上传到服务器

```bash
# 替换为你的服务器地址
scp cf-tunnel-manager-*.tar.gz deploy-*.sh root@your-server:/tmp/
```

### 步骤 3：在服务器上安装

```bash
# SSH 登录服务器
ssh root@your-server

# 运行部署脚本
cd /tmp
sudo bash deploy-*.sh
```

### 步骤 4：访问应用

```
http://your-server-ip:3000
```

---

## 方式 2：一键快速部署

最简单的部署方式，一条命令完成打包、上传、安装。

### 前置要求

- 本地安装 Node.js >= 18
- 配置好 SSH 密钥（或准备输入密码）
- 服务器有 root 权限

### 使用方法

```bash
cd cf-linux
chmod +x quick-deploy.sh
bash quick-deploy.sh root@your-server-ip
```

### 示例

```bash
# 部署到 IP 地址
bash quick-deploy.sh root@192.168.1.100

# 部署到域名
bash quick-deploy.sh ubuntu@example.com
```

脚本会自动完成：
1. ✅ 打包应用
2. ✅ 上传到服务器
3. ✅ 自动安装
4. ✅ 启动服务

---

## 方式 3：Git 仓库部署

适合生产环境和团队协作。

### 前置要求

- 服务器安装 Git
- 服务器有 root 权限

### 使用方法

```bash
# SSH 登录服务器
ssh root@your-server

# 克隆仓库
git clone <your-repo-url>
cd cf-linux

# 运行安装脚本
chmod +x install.sh
sudo bash install.sh
```

### 更新应用

```bash
cd cf-linux
git pull
sudo bash update.sh
```

---

## 部署后操作

### 查看服务状态

```bash
sudo systemctl status cf-tunnel-manager
```

### 查看日志

```bash
# 实时日志
sudo journalctl -u cf-tunnel-manager -f

# 最近 50 条日志
sudo journalctl -u cf-tunnel-manager -n 50
```

### 重启服务

```bash
sudo systemctl restart cf-tunnel-manager
```

### 停止服务

```bash
sudo systemctl stop cf-tunnel-manager
```

### 卸载应用

```bash
cd /opt/cf-tunnel-manager
sudo bash uninstall.sh
```

---

## 常见问题

### 1. 端口被占用

如果 3000 端口被占用，修改配置：

```bash
sudo nano /opt/cf-tunnel-manager/server/index.js
```

修改端口号后重启：

```bash
sudo systemctl restart cf-tunnel-manager
```

### 2. 无法访问应用

检查防火墙：

```bash
# Ubuntu/Debian
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 3. 服务启动失败

查看详细日志：

```bash
sudo journalctl -u cf-tunnel-manager -n 100 --no-pager
```

常见原因：
- Node.js 版本过低（需要 >= 18）
- 端口被占用
- 权限问题

### 4. 打包失败

```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build

# 重新打包
bash package.sh
```

### 5. 上传失败

检查 SSH 连接：

```bash
ssh user@server "echo 'Connection OK'"
```

检查服务器磁盘空间：

```bash
ssh user@server "df -h /tmp"
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
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 使用 PM2 管理

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
cd /opt/cf-tunnel-manager
pm2 start server/index.js --name cf-tunnel-manager

# 设置开机自启
pm2 startup
pm2 save
```

### 配置 HTTPS

使用 Let's Encrypt：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

---

## 多服务器部署

### 批量部署脚本

```bash
#!/bin/bash

SERVERS=(
    "root@server1.example.com"
    "root@server2.example.com"
    "root@server3.example.com"
)

# 打包一次
bash package.sh

PACKAGE=$(ls -t cf-tunnel-manager-*.tar.gz | head -n 1)
DEPLOY=$(ls -t deploy-*.sh | head -n 1)

# 部署到所有服务器
for server in "${SERVERS[@]}"; do
    echo "部署到 $server..."
    scp "$PACKAGE" "$DEPLOY" "$server:/tmp/"
    ssh "$server" "cd /tmp && sudo bash $DEPLOY"
done
```

---

## 内网部署

如果服务器无法访问外网：

### 1. 准备离线包

在有网络的机器上：

```bash
# 打包应用
bash package.sh

# 下载 Node.js 安装包
wget https://nodejs.org/dist/v18.17.0/node-v18.17.0-linux-x64.tar.xz
```

### 2. 传输到内网服务器

```bash
# 通过 U 盘或内网传输
scp cf-tunnel-manager-*.tar.gz node-*.tar.xz user@internal-server:/tmp/
```

### 3. 手动安装

```bash
# 安装 Node.js
cd /tmp
tar -xf node-*.tar.xz -C /usr/local/
ln -s /usr/local/node-*/bin/node /usr/bin/node
ln -s /usr/local/node-*/bin/npm /usr/bin/npm

# 安装应用
tar -xzf cf-tunnel-manager-*.tar.gz -C /opt/cf-tunnel-manager
cd /opt/cf-tunnel-manager
npm install --production --offline
bash install.sh
```

---

## 性能优化

### 1. 使用生产模式

应用默认使用生产模式，已经过优化。

### 2. 配置进程数

如果服务器性能强劲，可以使用 PM2 集群模式：

```bash
pm2 start server/index.js -i max --name cf-tunnel-manager
```

### 3. 启用 Gzip 压缩

在 Nginx 配置中：

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

---

## 安全建议

1. **修改默认端口**：不要使用 3000 端口
2. **配置防火墙**：只开放必要的端口
3. **使用 HTTPS**：配置 SSL 证书
4. **定期更新**：及时更新应用和系统
5. **备份数据**：定期备份配置文件

---

## 相关文档

- [安装指南](INSTALL.md) - 详细的安装说明
- [快速开始](START.md) - 开发和运行指南
- [README](README.md) - 项目介绍

---

## 技术支持

如有问题，请查看：

1. 应用日志：`sudo journalctl -u cf-tunnel-manager -n 100`
2. 系统日志：`/var/log/syslog`
3. 错误日志：`/opt/cf-tunnel-manager/logs/`

---

**祝部署顺利！** 🚀
