# Cloudflare Tunnel 管理工具 - Linux Web 版本

这是 Cloudflare Tunnel 管理工具的 Linux Web 版本，通过浏览器访问和管理 cloudflared。

## ⚠️ 安全提示

本应用已集成账号密码登录功能，首次启动时会自动创建管理员账号。详细安全说明请查看 [SECURITY.md](./SECURITY.md)。

## 技术栈

### 前端
- React 19.1.0 - UI 框架
- Vite 7.0.4 - 构建工具
- Shadcn/ui + Tailwind CSS - UI 组件库
- Lucide React - 图标库
- React Router - 路由管理

### 后端
- Node.js + Express - Web 服务器
- JWT - 身份认证
- bcrypt - 密码加密
- Axios - HTTP 客户端（调用 Cloudflare API）

## 项目结构

```
cf-linux/
├── src/                      # 前端源码
│   ├── api/                  # API 客户端层
│   │   └── client.js         # HTTP API 客户端
│   ├── components/           # UI 组件
│   │   └── ui/               # Shadcn/ui 组件
│   ├── render/               # 页面组件
│   │   └── components/
│   │       ├── Home/         # 首页
│   │       ├── Login/        # 登录页面
│   │       ├── ChangePassword/  # 密码修改
│   │       ├── UserManagement/  # 用户管理
│   │       ├── CloudflareTunnel/  # Tunnel 配置
│   │       └── Logs/         # 日志查看
│   ├── lib/                  # 工具函数
│   ├── App.jsx               # 应用入口
│   ├── App.css               # 全局样式
│   └── main.jsx              # React 入口
│
├── server/                   # 后端源码
│   ├── routes/               # API 路由
│   │   ├── auth.js           # 认证管理
│   │   ├── cloudflared.js    # cloudflared 管理
│   │   ├── credentials.js    # 凭证管理
│   │   ├── tunnels.js        # Tunnel 管理
│   │   ├── logs.js           # 日志管理
│   │   └── dns.js            # DNS 管理
│   ├── middleware/           # 中间件
│   │   └── auth.js           # 认证中间件
│   ├── utils/                # 工具函数
│   │   ├── userManager.js    # 用户管理
│   │   ├── auth.js           # JWT 工具
│   │   ├── passwordValidator.js  # 密码验证
│   │   ├── loginAttempts.js  # 登录限制
│   │   ├── cache.js          # 缓存管理
│   │   └── errorCodes.js     # 错误码定义
│   └── index.js              # 服务器入口
│
├── public/                   # 静态资源
├── index.html                # HTML 入口
├── cftm.js                   # CLI 管理工具
├── install.sh                # 安装脚本
├── package.sh                # 打包脚本（Linux）
├── package.ps1               # 打包脚本（Windows）
├── quick-deploy.sh           # 快速部署脚本
├── vite.config.js            # Vite 配置
├── tailwind.config.js        # Tailwind 配置
├── components.json           # Shadcn/ui 配置
├── package.json              # 依赖配置
├── README.md                 # 项目说明
├── INSTALL.md                # 安装指南
├── DEPLOY.md                 # 部署指南
└── SECURITY.md               # 安全说明
```

## 快速开始

### 方式 1：一键安装（推荐）⭐

从 GitHub Release 下载完整安装包并自动安装:

```bash
# 使用 curl
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash
```

**说明**: 
- 脚本会自动从 GitHub Release 下载完整安装包（包含已构建的前端文件）
- 无需手动构建,开箱即用
- 支持自动选择最快的下载源

### 方式 2：一键安装（国内服务器）⭐

如果服务器在国内,推荐使用 Gitee 镜像:

```bash
# 使用 Gitee（推荐）
curl -fsSL https://gitee.com/mrleehj/CFTunnel/raw/main/install.sh | sudo bash

# 强制使用 Gitee Release
curl -fsSL https://gitee.com/mrleehj/CFTunnel/raw/main/install.sh | sudo USE_GITEE=yes bash

# 强制使用 GitHub Release（自动选择最快镜像）
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo USE_GITEE=no bash
```

**智能源选择**:
- 默认（auto）: 优先 Gitee Release → GitHub Release 镜像
- `USE_GITEE=yes`: 强制使用 Gitee Release
- `USE_GITEE=no`: 强制使用 GitHub Release 镜像

### 方式 3：指定版本安装

```bash
# 安装指定版本
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo RELEASE_VERSION=v1.0.0 bash

# 安装最新版本（默认）
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo RELEASE_VERSION=latest bash
```

### 方式 4：手动下载安装包

1. 从 Release 页面下载安装包:
   - GitHub: https://github.com/mrleehj/CFTunnel/releases
   - Gitee: https://gitee.com/mrleehj/CFTunnel/releases

2. 上传到服务器并解压:
```bash
# 解压安装包
tar -xzf cf-tunnel-manager.tar.gz
cd cf-tunnel-manager

# 运行安装脚本
sudo bash install.sh
```

### 方式 5：开发者模式（从源码安装）

仅适用于开发环境,需要手动构建:

```bash
# 克隆仓库
git clone https://github.com/mrleehj/CFTunnel.git
# 或使用 Gitee: git clone https://gitee.com/mrleehj/CFTunnel.git

cd CFTunnel/cf-linux

# 安装依赖
npm install

# 构建前端
npm run build

# 运行安装脚本
sudo bash install.sh
```

### 3. 首次登录

首次启动时，控制台会输出默认管理员账号信息：

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

访问 http://localhost:3000，使用上述账号登录。

**重要**: 请立即修改默认密码！详见 [SECURITY.md](./SECURITY.md)

## CLI 管理工具 (cftm)

安装后可使用 `cftm` 命令管理服务：

### 服务管理
```bash
cftm start      # 启动服务
cftm stop       # 停止服务
cftm restart    # 重启服务
cftm service    # 查看服务状态
cftm logs       # 查看服务日志
```

### 用户管理
```bash
cftm reset-admin        # 重置管理员密码
cftm change-password    # 修改密码
cftm list-users         # 查看用户列表
cftm add-user           # 添加用户
cftm remove-user <用户> # 删除用户
```

### 系统信息
```bash
cftm status     # 系统状态
cftm --help     # 查看帮助
```

## 安装依赖

```bash
cd cf-linux
npm install
```

## 开发模式

同时启动前端开发服务器和后端 API 服务器：

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000

## 生产构建

```bash
# 构建前端
npm run build

# 启动后端服务器
npm start
```

## 部署

### 方式 1：直接部署

1. 构建前端：`npm run build`
2. 将 `dist/` 文件夹和 `server/` 文件夹上传到服务器
3. 在服务器上运行：`node server/index.js`

### 方式 2：使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/index.js --name cf-linux

# 查看状态
pm2 status

# 查看日志
pm2 logs cf-linux
```

### 方式 3：使用 Docker

```bash
# 构建镜像
docker build -t cf-linux .

# 运行容器
docker run -d -p 3000:3000 --name cf-linux cf-linux
```

## 与 cf-win 的区别

| 特性 | cf-win (Windows) | cf-linux (Linux) |
|------|------------------|------------------|
| 技术栈 | Tauri + Rust | Node.js + Express |
| 部署方式 | 桌面应用 (.exe) | Web 应用（浏览器） |
| 前端代码 | React | React（复用） |
| 后端实现 | Rust | Node.js |
| 进程管理 | Tauri State | Node.js Child Process |
| 文件操作 | Rust std::fs | Node.js fs |

## 代码复用

从 cf-win 复用的代码：
- ✅ 所有 React 组件（`src/render/components/`）
- ✅ UI 组件库（`src/components/ui/`）
- ✅ 样式文件（`src/App.css`）
- ✅ 工具函数（`src/lib/utils.js`）
- ✅ Tailwind 配置
- ✅ Vite 配置（部分）

新增的代码：
- 🆕 HTTP API 客户端（`src/api/client.js`）
- 🆕 Node.js 后端服务器（`server/`）
- 🆕 Express 路由（`server/routes/`）

## API 接口文档

### 认证管理
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/verify` - 验证 token
- `POST /api/auth/change-password` - 修改密码
- `GET /api/auth/users` - 获取用户列表（管理员）
- `POST /api/auth/users` - 创建用户（管理员）
- `DELETE /api/auth/users/:id` - 删除用户（管理员）

### cloudflared 管理
- `GET /api/cloudflared/version` - 检查版本
- `POST /api/cloudflared/install` - 安装
- `DELETE /api/cloudflared/uninstall` - 卸载
- `GET /api/cloudflared/versions` - 获取版本列表

### 凭证管理
- `POST /api/credentials` - 保存凭证
- `GET /api/credentials` - 加载凭证
- `POST /api/credentials/test` - 测试凭证

### Tunnel 管理
- `POST /api/tunnels` - 列出 Tunnel
- `POST /api/tunnels/create` - 创建 Tunnel
- `DELETE /api/tunnels/:id` - 删除 Tunnel
- `POST /api/tunnels/:id/config` - 获取配置
- `PUT /api/tunnels/:id/config` - 更新配置
- `POST /api/tunnels/start` - 启动 Tunnel
- `POST /api/tunnels/stop` - 停止 Tunnel
- `GET /api/tunnels/status` - 获取状态

### 日志管理
- `GET /api/logs/install` - 获取安装日志
- `GET /api/logs/tunnel/:name` - 获取 Tunnel 日志
- `DELETE /api/logs/install` - 清空安装日志
- `DELETE /api/logs/tunnel/:name` - 清空 Tunnel 日志

### DNS 管理
- `POST /api/dns/zones` - 获取 Zone 列表
- `POST /api/dns/records` - 创建 DNS 记录

### 调试工具
- `GET /api/debug/credentials/:tunnelId` - 读取凭证文件

## 功能特性

- ✅ 账号密码登录保护
- ✅ JWT 身份认证
- ✅ 用户管理（管理员）
- ✅ cloudflared 版本管理
- ✅ Tunnel 创建和管理
- ✅ 多 Tunnel 同时运行
- ✅ DNS 记录管理
- ✅ 实时日志查看
- ✅ 系统信息展示

## 下一步开发计划

1. ✅ 创建项目基础结构
2. ✅ 复制 cf-win 的前端组件
3. ✅ 实现后端 API 功能
4. ✅ 添加账号密码登录
5. ✅ 用户管理功能
6. ⏳ 密码修改界面
7. ⏳ 编写完整部署文档
8. ⏳ 创建 Docker 镜像

## 相关文档

- [项目结构](./PROJECT_STRUCTURE.md) - 完整的文件清单和说明
- [安全说明](./SECURITY.md) - 认证系统和安全建议
- [部署指南](./DEPLOY.md) - 详细部署步骤
- [安装指南](./INSTALL.md) - 一键安装脚本
- [启动指南](./START.md) - 快速启动说明

## 许可证

MIT
