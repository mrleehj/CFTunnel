# Cloudflare Tunnel Manager - Linux 一键安装指南

## 🚀 快速安装

### 方式 1：一键安装（推荐）

```bash
# 1. 下载项目
git clone <your-repo-url> cf-tunnel-manager
cd cf-tunnel-manager/cf-linux

# 2. 给脚本添加执行权限
chmod +x install.sh

# 3. 运行安装脚本
sudo bash install.sh
```

安装完成后，访问：**http://your-server-ip:3000**

### 方式 2：使用 wget 一键安装

```bash
# 下载并运行安装脚本
wget -O - https://your-domain.com/install.sh | sudo bash
```

### 方式 3：使用 curl 一键安装

```bash
# 下载并运行安装脚本
curl -fsSL https://your-domain.com/install.sh | sudo bash
```

## 📋 系统要求

- **操作系统**：Ubuntu 18.04+, Debian 10+, CentOS 7+, RHEL 7+
- **架构**：x86_64 (amd64) 或 ARM64
- **内存**：至少 512MB RAM
- **磁盘**：至少 500MB 可用空间
- **权限**：需要 root 权限

## 🔧 安装过程

安装脚本会自动完成以下操作：

1. ✅ 检测操作系统
2. ✅ 安装 Node.js 18.x（如果未安装）
3. ✅ 创建安装目录 `/opt/cf-tunnel-manager`
4. ✅ 复制应用文件
5. ✅ 安装项目依赖
6. ✅ 构建前端应用
7. ✅ 创建 systemd 服务
8. ✅ 配置防火墙规则
9. ✅ 启动服务

## 📦 安装位置

- **应用目录**：`/opt/cf-tunnel-manager`
- **数据目录**：`~/.cf_tunnel`
- **服务名称**：`cf-tunnel-manager`
- **默认端口**：`3000`

## 🎮 服务管理

### 启动服务
```bash
sudo systemctl start cf-tunnel-manager
```

### 停止服务
```bash
sudo systemctl stop cf-tunnel-manager
```

### 重启服务
```bash
sudo systemctl restart cf-tunnel-manager
```

### 查看状态
```bash
sudo systemctl status cf-tunnel-manager
```

### 查看日志
```bash
# 实时查看日志
sudo journalctl -u cf-tunnel-manager -f

# 查看最近 100 行日志
sudo journalctl -u cf-tunnel-manager -n 100

# 查看今天的日志
sudo journalctl -u cf-tunnel-manager --since today
```

### 开机自启
```bash
# 启用开机自启（安装时已自动启用）
sudo systemctl enable cf-tunnel-manager

# 禁用开机自启
sudo systemctl disable cf-tunnel-manager
```

## 🔄 更新应用

```bash
cd cf-tunnel-manager/cf-linux
git pull
chmod +x update.sh
sudo bash update.sh
```

## 🗑️ 卸载应用

```bash
cd cf-tunnel-manager/cf-linux
chmod +x uninstall.sh
sudo bash uninstall.sh
```

卸载时会询问是否删除用户数据（配置、凭证、日志）。

## 🌐 访问应用

安装完成后，在浏览器中访问：

- **公网访问**：`http://your-server-ip:3000`
- **内网访问**：`http://192.168.x.x:3000`
- **本地访问**：`http://localhost:3000`

## 🔒 安全建议

### 1. 配置防火墙

如果使用云服务器，需要在安全组中开放 3000 端口。

**阿里云/腾讯云**：
- 登录控制台
- 找到安全组设置
- 添加入站规则：TCP 3000

**AWS**：
- 编辑 Security Group
- 添加 Inbound Rule：Custom TCP, Port 3000

### 2. 使用 Nginx 反向代理（推荐）

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 配置 SSL 证书（推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx  # Ubuntu/Debian
sudo yum install certbot python3-certbot-nginx  # CentOS/RHEL

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 🐛 故障排查

### 服务无法启动

```bash
# 查看详细错误信息
sudo journalctl -u cf-tunnel-manager -n 50 --no-pager

# 检查端口是否被占用
sudo netstat -tlnp | grep 3000

# 手动启动查看错误
cd /opt/cf-tunnel-manager
sudo node server/index.js
```

### 无法访问应用

1. 检查服务是否运行：`sudo systemctl status cf-tunnel-manager`
2. 检查防火墙：`sudo firewall-cmd --list-ports` 或 `sudo ufw status`
3. 检查端口监听：`sudo netstat -tlnp | grep 3000`
4. 检查日志：`sudo journalctl -u cf-tunnel-manager -f`

### Node.js 版本过低

```bash
# 卸载旧版本
sudo apt remove nodejs  # Ubuntu/Debian
sudo yum remove nodejs  # CentOS/RHEL

# 重新运行安装脚本
sudo bash install.sh
```

## 📞 获取帮助

- **查看文档**：`docs/2026-03-29/164-Linux端部署运行指南.md`
- **查看日志**：`sudo journalctl -u cf-tunnel-manager -f`
- **检查状态**：`sudo systemctl status cf-tunnel-manager`

## 🎯 下一步

安装完成后：

1. 访问应用：`http://your-server-ip:3000`
2. 配置 Cloudflare 凭证（Account ID 和 API Token）
3. 安装 cloudflared（应用内一键安装）
4. 创建和管理 Tunnel

## 📝 注意事项

1. **端口占用**：确保 3000 端口未被占用
2. **防火墙**：需要开放 3000 端口（脚本会自动配置）
3. **权限**：需要 root 权限运行安装脚本
4. **数据备份**：重要数据存储在 `~/.cf_tunnel` 目录
5. **更新前备份**：更新前会自动备份当前版本

## 🔗 相关链接

- [Cloudflare Tunnel 文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [获取 API Token](https://dash.cloudflare.com/profile/api-tokens)
- [Node.js 官网](https://nodejs.org/)
