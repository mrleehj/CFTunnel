# 安全说明

## 认证系统

Cloudflare Tunnel 管理工具使用 JWT (JSON Web Token) 认证系统保护 Web 界面。

## 首次启动

首次启动服务器时，系统会自动创建默认管理员账号：

```bash
npm start
```

控制台会输出类似以下信息：

```
============================================================
🔐 首次启动：已创建默认管理员账号
============================================================
用户名: admin
密码: Xy9#mK2$pL4@
============================================================
⚠️  请立即登录并修改密码！
============================================================
```

**重要**: 请立即记录密码并在首次登录后修改！

## 登录

1. 访问应用地址（如 `http://localhost:3000`）
2. 系统会自动跳转到登录页面
3. 输入用户名和密码
4. 登录成功后进入主界面

## 修改密码

### 方法 1: 通过 API（推荐）

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "旧密码",
    "newPassword": "新密码"
  }'
```

### 方法 2: 手动编辑用户文件

如果忘记密码，可以删除用户文件重新初始化：

```bash
rm ~/.cloudflare-tunnel-manager/users.json
npm start
```

## 用户管理

管理员可以在"用户管理"页面：

- 查看所有用户
- 创建新用户
- 删除用户（不能删除自己）

## 安全建议

### 1. 修改默认密码
首次登录后立即修改默认管理员密码。

### 2. 使用 HTTPS
生产环境强烈建议使用 HTTPS：

```bash
# 使用 nginx 反向代理
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 配置 JWT Secret
生产环境使用环境变量配置 JWT 密钥：

```bash
export JWT_SECRET="your-very-long-and-random-secret-key"
npm start
```

### 4. 定期备份
定期备份用户文件：

```bash
cp ~/.cloudflare-tunnel-manager/users.json ~/backup/users-$(date +%Y%m%d).json
```

### 5. 密码策略
建议使用强密码：
- 至少 8 位
- 包含大小写字母
- 包含数字
- 包含特殊字符

### 6. 限制访问
使用防火墙限制访问：

```bash
# 仅允许本地访问
sudo ufw allow from 127.0.0.1 to any port 3000

# 允许特定 IP 访问
sudo ufw allow from 192.168.1.100 to any port 3000
```

## 用户文件位置

用户数据存储在：
```
~/.cloudflare-tunnel-manager/users.json
```

文件格式：
```json
{
  "users": [
    {
      "id": "唯一标识",
      "username": "用户名",
      "password": "bcrypt 加密的密码",
      "role": "admin 或 user",
      "createdAt": "创建时间",
      "lastLogin": "最后登录时间"
    }
  ]
}
```

## Token 有效期

JWT token 默认有效期为 24 小时。过期后需要重新登录。

## 退出登录

点击侧边栏底部的"退出登录"按钮，系统会清除本地 token 并跳转到登录页面。

## 故障排除

### 忘记密码

删除用户文件并重启服务器：
```bash
rm ~/.cloudflare-tunnel-manager/users.json
npm start
```

### Token 无效

清除浏览器缓存或使用无痕模式重新登录。

### 无法访问

检查服务器是否正常运行：
```bash
curl http://localhost:3000/api/health
```

## 安全更新

定期更新依赖以获取安全补丁：
```bash
npm update
```

## 报告安全问题

如果发现安全漏洞，请通过 GitHub Issues 报告。


## 一键安装

如果还未安装，可以使用以下命令快速安装：

```bash
# 标准安装
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash

# 使用加速代理（国内服务器推荐）
curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
curl -fsSL https://gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
curl -fsSL https://hk.gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
```

## 相关文档

- [README.md](./README.md) - 项目说明
- [INSTALL.md](./INSTALL.md) - 安装指南
- [DEPLOY.md](./DEPLOY.md) - 部署指南
