# 一键安装详细说明

本文档详细说明一键安装的完整流程、原理和自定义方法。

## 📋 目录

- [一键安装原理](#一键安装原理)
- [完整安装流程](#完整安装流程)
- [使用自己的网址](#使用自己的网址)
- [自定义安装选项](#自定义安装选项)
- [故障排查](#故障排查)

---

## 一键安装原理

### 基本原理

一键安装命令的工作原理：

```bash
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
```

**分解说明：**

1. **curl -fsSL**
   - `curl`: 下载工具
   - `-f`: 失败时不显示错误页面
   - `-s`: 静默模式，不显示进度
   - `-S`: 显示错误信息
   - `-L`: 跟随重定向

2. **URL**
   - `https://raw.githubusercontent.com`: GitHub 原始文件服务
   - `/mrleehj/CFTunnel`: 用户名/仓库名
   - `/main`: 分支名
   - `/install.sh`: 文件路径

3. **| sudo bash**
   - `|`: 管道，将下载的内容传递给 bash
   - `sudo`: 以 root 权限执行
   - `bash`: 执行 shell 脚本

### 安全性说明

**为什么需要 sudo？**
- 安装到系统目录 `/opt/cf-tunnel-manager`
- 创建 systemd 服务
- 配置防火墙规则
- 安装系统依赖（Node.js、git）

**安全建议：**
1. 先查看脚本内容：
   ```bash
   curl https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh
   ```
2. 确认无恶意代码后再执行
3. 使用官方仓库地址

---

## 完整安装流程

### 流程图

```
用户执行命令
    ↓
下载 install.sh 脚本
    ↓
检查 root 权限
    ↓
检测操作系统
    ↓
检查项目文件
    ├─ 本地有 → 使用本地文件
    └─ 本地无 → 从 GitHub/Gitee 克隆
         ↓
    智能选择克隆源
    ├─ 测试 Gitee 连接
    ├─ 可访问 → 使用 Gitee
    └─ 不可访问 → 使用 GitHub
         ↓
    克隆项目到临时目录
         ↓
检查并安装 Node.js
    ├─ 已安装且版本 >= 18 → 跳过
    └─ 未安装或版本过低 → 安装 Node.js 18.x
         ↓
创建安装目录
    ├─ 目录已存在 → 备份旧版本
    └─ 目录不存在 → 创建新目录
         ↓
复制项目文件
    ├─ server/ (后端代码)
    ├─ dist/ (前端构建文件)
    ├─ package.json (依赖配置)
    ├─ cftm.js (CLI 工具)
    └─ 文档文件
         ↓
安装后端依赖
    ├─ 检测网络环境
    ├─ 国内 → 使用 npmmirror 镜像
    └─ 国外 → 使用 npm 官方源
         ↓
    npm install --omit=dev
         ↓
检查前端构建文件
    ├─ dist/ 存在 → 继续
    └─ dist/ 不存在 → 报错退出
         ↓
创建 cftm 命令
    ├─ 复制 cftm.js 到安装目录
    ├─ 设置执行权限
    └─ 创建软链接到 /usr/local/bin/cftm
         ↓
创建 systemd 服务
    ├─ 生成服务配置文件
    ├─ 保存到 /etc/systemd/system/
    └─ 重载 systemd
         ↓
配置防火墙
    ├─ 检测 firewalld → 添加端口规则
    └─ 检测 ufw → 添加端口规则
         ↓
启动服务
    ├─ systemctl enable (开机自启)
    ├─ systemctl start (启动服务)
    └─ 检查服务状态
         ↓
显示安装信息
    ├─ 访问地址
    ├─ 管理命令
    └─ 数据目录
         ↓
安装完成！
```

### 详细步骤说明

#### 步骤 1：权限检查
```bash
[INFO] 检查 root 权限...
```
- 验证是否以 root 用户运行
- 如果不是，提示使用 `sudo`

#### 步骤 2：系统检测
```bash
[INFO] 检测到操作系统: Ubuntu 22.04
```
- 读取 `/etc/os-release` 文件
- 识别操作系统类型和版本
- 支持：Ubuntu、Debian、CentOS、RHEL

#### 步骤 3：项目获取
```bash
[INFO] 未检测到项目文件，准备克隆项目...
[INFO] 自动选择克隆源...
[SUCCESS] 检测到 Gitee 可访问，使用 Gitee 镜像源
[INFO] 克隆仓库: https://gitee.com/mrleehj/CFTunnel.git
[SUCCESS] 项目克隆完成
```
- 检查当前目录是否有项目文件
- 如果没有，智能选择克隆源
- 使用 `git clone --depth 1` 浅克隆（节省时间）

#### 步骤 4：Node.js 安装
```bash
[INFO] 检查 Node.js...
[INFO] 安装 Node.js 18.x...
[SUCCESS] Node.js 安装完成: v18.20.0
```
- 检查 Node.js 版本
- 如果版本 < 18，安装 Node.js 18.x
- 使用 NodeSource 官方源

#### 步骤 5：文件部署
```bash
[INFO] 创建安装目录: /opt/cf-tunnel-manager
[SUCCESS] 安装目录创建完成
[INFO] 复制应用文件...
[SUCCESS] 文件复制完成
```
- 创建 `/opt/cf-tunnel-manager` 目录
- 复制所有必需文件
- 如果目录已存在，先备份

#### 步骤 6：依赖安装
```bash
[INFO] 安装后端运行依赖...
[INFO] 配置 npm 使用国内镜像源（npmmirror）
[SUCCESS] 依赖安装完成
```
- 检测网络环境
- 自动配置 npm 镜像
- 只安装生产依赖（`--omit=dev`）

#### 步骤 7：CLI 工具
```bash
[INFO] 创建 cftm 命令...
[SUCCESS] cftm 命令创建完成
```
- 创建 `/usr/local/bin/cftm` 软链接
- 用户可以在任何位置使用 `cftm` 命令

#### 步骤 8：服务配置
```bash
[INFO] 创建 systemd 服务...
[SUCCESS] systemd 服务创建完成
```
- 生成 systemd 服务文件
- 配置自动启动
- 配置日志输出

#### 步骤 9：防火墙配置
```bash
[INFO] 配置防火墙...
[SUCCESS] firewalld 规则已添加
```
- 自动检测防火墙类型
- 开放 3000 端口

#### 步骤 10：启动服务
```bash
[INFO] 启动服务...
[SUCCESS] 服务启动成功
```
- 启动 cf-tunnel-manager 服务
- 检查服务状态
- 如果失败，显示日志查看命令

#### 步骤 11：完成
```bash
==========================================
安装完成！
==========================================

🌐 访问地址:
   - http://192.168.1.100:3000

📋 常用命令 (cftm):
   cftm start      # 启动服务
   cftm stop       # 停止服务
   ...
```

---

## 使用自己的网址

### 方案 1：使用自己的域名（推荐）

如果你有自己的域名和服务器，可以托管安装脚本：

#### 1. 准备服务器

```bash
# 在你的服务器上创建目录
mkdir -p /var/www/html/cftunnel

# 上传 install.sh
scp install.sh user@your-server.com:/var/www/html/cftunnel/
```

#### 2. 配置 Web 服务器

**Nginx 配置：**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /cftunnel/ {
        root /var/www/html;
        autoindex on;
    }
}
```

**Apache 配置：**
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/html
    
    <Directory /var/www/html/cftunnel>
        Options +Indexes
        Require all granted
    </Directory>
</VirtualHost>
```

#### 3. 用户安装命令

```bash
# 使用你的域名
curl -fsSL https://your-domain.com/cftunnel/install.sh | sudo bash
```

### 方案 2：使用 CDN 加速

#### 使用 jsDelivr CDN

jsDelivr 可以加速 GitHub 文件访问：

```bash
# 原始 GitHub 地址
https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh

# jsDelivr CDN 地址
https://cdn.jsdelivr.net/gh/mrleehj/CFTunnel@main/install.sh

# 用户安装命令
curl -fsSL https://cdn.jsdelivr.net/gh/mrleehj/CFTunnel@main/install.sh | sudo bash
```

**优势：**
- ✅ 全球 CDN 加速
- ✅ 国内访问速度快
- ✅ 无需自己搭建服务器
- ✅ 自动缓存更新

#### 使用 Staticfile CDN

```bash
# Staticfile CDN（国内）
https://cdn.staticfile.org/gh/mrleehj/CFTunnel@main/install.sh
```

### 方案 3：修改 install.sh 中的仓库地址

如果你 fork 了项目，修改 `install.sh` 中的配置：

```bash
# 修改 GitHub 仓库地址
GITHUB_REPO="https://github.com/YOUR_USERNAME/YOUR_REPO.git"

# 修改 Gitee 仓库地址
GITEE_REPO="https://gitee.com/YOUR_USERNAME/YOUR_REPO.git"
```

### 方案 4：创建短链接

使用短链接服务（如 bit.ly、短链宝）：

```bash
# 原始地址
https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh

# 短链接
https://bit.ly/cftunnel-install

# 用户安装命令
curl -fsSL https://bit.ly/cftunnel-install | sudo bash
```

---

## 自定义安装选项

### 环境变量配置

安装脚本支持多个环境变量：

#### 1. 指定克隆源

```bash
# 强制使用 Gitee
USE_GITEE=yes curl -fsSL ... | sudo bash

# 强制使用 GitHub
USE_GITEE=no curl -fsSL ... | sudo bash

# 自动选择（默认）
USE_GITEE=auto curl -fsSL ... | sudo bash
```

#### 2. 指定安装目录

修改 `install.sh` 中的配置：

```bash
# 默认安装目录
INSTALL_DIR="/opt/cf-tunnel-manager"

# 自定义安装目录
INSTALL_DIR="${INSTALL_DIR:-/opt/cf-tunnel-manager}"
```

使用：
```bash
INSTALL_DIR=/usr/local/cftunnel curl -fsSL ... | sudo bash
```

#### 3. 指定端口

```bash
# 默认端口
PORT=3000

# 自定义端口
PORT="${PORT:-3000}"
```

使用：
```bash
PORT=8080 curl -fsSL ... | sudo bash
```

#### 4. 跳过依赖安装

```bash
# 跳过 Node.js 安装
SKIP_NODEJS=yes curl -fsSL ... | sudo bash

# 跳过 npm 依赖安装
SKIP_NPM=yes curl -fsSL ... | sudo bash
```

### 完整自定义示例

```bash
# 自定义所有选项
USE_GITEE=yes \
INSTALL_DIR=/usr/local/cftunnel \
PORT=8080 \
curl -fsSL https://your-domain.com/install.sh | sudo bash
```

---

## 故障排查

### 常见问题

#### 1. 网络连接失败

**问题：**
```
[ERROR] 克隆失败，请检查网络连接
```

**解决方案：**
```bash
# 方案 1：使用 Gitee
USE_GITEE=yes curl -fsSL ... | sudo bash

# 方案 2：手动克隆
git clone https://gitee.com/mrleehj/CFTunnel.git
cd CFTunnel
sudo bash install.sh

# 方案 3：配置代理
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
curl -fsSL ... | sudo bash
```

#### 2. Node.js 安装失败

**问题：**
```
[ERROR] Node.js 安装失败
```

**解决方案：**
```bash
# 手动安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs

# 验证安装
node -v
npm -v

# 然后重新运行安装脚本
```

#### 3. 权限不足

**问题：**
```
[ERROR] 请使用 root 权限运行此脚本
```

**解决方案：**
```bash
# 添加 sudo
curl -fsSL ... | sudo bash

# 或切换到 root 用户
sudo su
curl -fsSL ... | bash
```

#### 4. 端口被占用

**问题：**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案：**
```bash
# 方案 1：停止占用端口的进程
sudo lsof -i :3000
sudo kill -9 <PID>

# 方案 2：使用其他端口
PORT=8080 curl -fsSL ... | sudo bash

# 方案 3：修改配置后重启
sudo systemctl stop cf-tunnel-manager
# 修改 /opt/cf-tunnel-manager/server/index.js 中的端口
sudo systemctl start cf-tunnel-manager
```

#### 5. 服务启动失败

**问题：**
```
[ERROR] 服务启动失败
```

**解决方案：**
```bash
# 查看详细日志
sudo journalctl -u cf-tunnel-manager -n 50

# 查看服务状态
sudo systemctl status cf-tunnel-manager

# 手动启动测试
cd /opt/cf-tunnel-manager
node server/index.js

# 检查依赖
npm list
```

### 调试模式

启用详细日志输出：

```bash
# 方法 1：修改脚本
# 在 install.sh 开头添加
set -x  # 显示每个命令

# 方法 2：手动执行
bash -x install.sh
```

### 完全卸载

如果需要重新安装：

```bash
# 停止服务
sudo systemctl stop cf-tunnel-manager
sudo systemctl disable cf-tunnel-manager

# 删除服务文件
sudo rm /etc/systemd/system/cf-tunnel-manager.service
sudo systemctl daemon-reload

# 删除安装目录
sudo rm -rf /opt/cf-tunnel-manager

# 删除 cftm 命令
sudo rm /usr/local/bin/cftm

# 删除数据目录（可选）
rm -rf ~/.cloudflare-tunnel-manager
```

---

## 总结

一键安装的核心优势：
- ✅ 简单：一条命令完成所有配置
- ✅ 智能：自动检测环境并选择最优方案
- ✅ 灵活：支持多种自定义选项
- ✅ 安全：可以先查看脚本内容
- ✅ 可靠：完善的错误处理和回滚机制

建议：
1. 首次安装前先查看脚本内容
2. 使用官方仓库地址
3. 国内用户使用 Gitee 镜像
4. 遇到问题查看日志排查

如有问题，欢迎提交 Issue！
