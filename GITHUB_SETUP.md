# GitHub 发布指南

本文档说明如何将项目发布到 GitHub 并配置一键安装功能。

## 📋 发布前准备

### 1. 修改 GitHub 仓库配置

在 `install.sh` 中修改以下配置（第 19-20 行）：

```bash
# GitHub 配置（如果需要从 GitHub 克隆）
GITHUB_REPO="https://github.com/mrleehj/CFTunnel.git"
GITHUB_BRANCH="main"
```

### 2. 更新 README.md

在 `README.md` 中的安装命令已更新为：

```markdown
# 一键安装
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash

# 使用加速代理（国内服务器推荐）
curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
curl -fsSL https://gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
curl -fsSL https://hk.gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
```

### 3. 构建前端

在本地构建前端，确保 `dist/` 目录存在：

```bash
cd cf-linux
npm install
npm run build
```

**重要**: 服务器上不需要构建前端，所以必须在本地构建好并提交 `dist/` 目录。

### 4. 修改 .gitignore

确保 `dist/` 目录会被提交到 Git：

```bash
# 从 .gitignore 中移除 dist
# 或者添加例外规则
!dist/
```

## 🚀 发布到 GitHub

### 1. 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写仓库名称（如 `cf-tunnel-manager`）
3. 选择 Public（公开）或 Private（私有）
4. 不要初始化 README、.gitignore 或 LICENSE（我们已经有了）
5. 点击 "Create repository"

### 2. 推送代码

```bash
cd cf-linux

# 初始化 git（如果还没有）
git init

# 添加远程仓库
git remote add origin https://github.com/mrleehj/CFTunnel.git

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 推送到 GitHub
git push -u origin main
```

### 3. 验证文件

确保以下文件已成功推送：
- ✅ `install.sh` - 安装脚本
- ✅ `dist/` - 前端构建文件
- ✅ `server/` - 后端代码
- ✅ `package.json` - 依赖配置
- ✅ `README.md` - 项目说明
- ✅ 其他必需文件

## 📦 测试一键安装

### 在新服务器上测试

```bash
# 使用 curl
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash

# 使用加速代理（国内服务器推荐）
curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
curl -fsSL https://gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
curl -fsSL https://hk.gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
```

### 预期结果

安装脚本会自动：
1. ✅ 检测操作系统
2. ✅ 安装 git（如果需要）
3. ✅ 从 GitHub 克隆项目
4. ✅ 安装 Node.js（如果需要）
5. ✅ 复制文件到 `/opt/cf-tunnel-manager`
6. ✅ 安装后端依赖
7. ✅ 创建 systemd 服务
8. ✅ 启动服务
9. ✅ 显示访问地址和管理命令

## 📝 README.md 示例

更新后的 README.md 应该包含：

```markdown
# Cloudflare Tunnel Manager

## 快速开始

### 从 GitHub 一键安装

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
\`\`\`

### 克隆后安装

\`\`\`bash
git clone https://github.com/mrleehj/CFTunnel.git
cd CFTunnel
sudo bash install.sh
\`\`\`

## 管理命令

\`\`\`bash
cftm start      # 启动服务
cftm stop       # 停止服务
cftm restart    # 重启服务
cftm status     # 查看状态
\`\`\`
```

## 🔧 高级配置

### 使用特定分支

如果你想让用户安装开发分支：

```bash
# 在 install.sh 中修改
GITHUB_BRANCH="develop"
```

用户安装时：
```bash
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/develop/install.sh | sudo bash
```

### 使用版本标签

创建版本标签：

```bash
git tag v1.0.0
git push origin v1.0.0
```

用户可以安装特定版本：

```bash
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/v1.0.0/install.sh | sudo bash
```

### 私有仓库

如果仓库是私有的，用户需要先配置 GitHub 访问：

```bash
# 方式 1：使用 Personal Access Token
git clone https://YOUR_TOKEN@github.com/mrleehj/CFTunnel.git

# 方式 2：使用 SSH
git clone git@github.com:mrleehj/CFTunnel.git
```

## 📊 发布检查清单

发布前确认：

- [x] 已修改 `install.sh` 中的 GitHub 仓库地址
- [x] 已更新 `README.md` 中的所有仓库地址
- [ ] 已在本地构建前端（`npm run build`）
- [ ] `dist/` 目录已提交到 Git
- [ ] 已创建 GitHub 仓库
- [ ] 已推送所有代码到 GitHub
- [ ] 已在新服务器上测试一键安装
- [ ] 安装成功并能正常访问
- [ ] 已添加 LICENSE 文件（可选）
- [ ] 已添加项目描述和标签（可选）

## 🎯 推荐的 GitHub 仓库设置

### 仓库地址
```
https://github.com/mrleehj/CFTunnel
```

### 仓库描述
```
Cloudflare Tunnel Manager - Web-based management tool for cloudflared tunnels
```

### 标签（Topics）
```
cloudflare, tunnel, cloudflared, web-ui, nodejs, react, linux
```

### README 徽章（可选）

在 README.md 顶部添加：

```markdown
![License](https://img.shields.io/github/license/mrleehj/CFTunnel)
![Stars](https://img.shields.io/github/stars/mrleehj/CFTunnel)
![Issues](https://img.shields.io/github/issues/mrleehj/CFTunnel)
```

## 🆘 常见问题

### Q: 用户安装时提示 "克隆失败"

A: 检查：
1. GitHub 仓库地址是否正确
2. 仓库是否设置为 Public
3. 服务器网络是否正常
4. GitHub 是否可访问

### Q: 安装后无法访问

A: 检查：
1. 服务是否启动：`systemctl status cf-tunnel-manager`
2. 端口是否开放：`netstat -tlnp | grep 3000`
3. 防火墙是否允许：`ufw status` 或 `firewall-cmd --list-all`

### Q: 如何更新已安装的版本

A: 使用更新脚本：
```bash
cd /opt/cf-tunnel-manager
sudo bash update.sh
```

## 📚 相关文档

- [README.md](./README.md) - 项目说明
- [INSTALL.md](./INSTALL.md) - 详细安装指南
- [DEPLOY.md](./DEPLOY.md) - 部署指南
- [SECURITY.md](./SECURITY.md) - 安全说明

## 📄 许可证

建议添加 MIT License：

```bash
# 创建 LICENSE 文件
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 YOUR_NAME

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

## ✅ 完成

按照以上步骤完成后，你的项目就可以通过一条命令安装了：

```bash
# 标准安装
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash

# 使用加速代理（国内服务器推荐）
curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
curl -fsSL https://gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
curl -fsSL https://hk.gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
```

祝你的项目成功！🎉
