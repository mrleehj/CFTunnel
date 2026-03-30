# 项目文件清单

本文档列出了项目中所有文件的用途，帮助开发者快速了解项目结构。

## 📁 核心目录

### `src/` - 前端源码
React 应用的前端代码，使用 Vite 构建。

```
src/
├── api/                      # API 客户端层
│   └── client.js             # HTTP 请求封装，统一错误处理
├── components/               # UI 组件
│   └── ui/                   # Shadcn/ui 组件库
│       ├── alert.jsx
│       ├── badge.jsx
│       ├── button.jsx
│       ├── card.jsx
│       ├── dialog.jsx
│       ├── input.jsx
│       ├── label.jsx
│       ├── toast.jsx
│       ├── toaster.jsx
│       └── use-toast.js
├── render/                   # 页面组件
│   └── components/
│       ├── Home/             # 首页 - 系统信息展示
│       ├── Login/            # 登录页面
│       ├── ChangePassword/   # 密码修改
│       ├── UserManagement/   # 用户管理（管理员）
│       ├── CloudflareTunnel/ # Tunnel 配置管理
│       └── Logs/             # 日志查看
├── lib/                      # 工具函数
│   └── utils.js              # 通用工具函数
├── App.jsx                   # 应用主组件
├── App.css                   # 全局样式
└── main.jsx                  # React 入口文件
```

### `server/` - 后端源码
Node.js + Express 后端服务器。

```
server/
├── routes/                   # API 路由
│   ├── auth.js               # 认证管理（登录、登出、用户管理）
│   ├── cloudflared.js        # cloudflared 管理（安装、卸载、版本）
│   ├── credentials.js        # Cloudflare 凭证管理
│   ├── tunnels.js            # Tunnel 管理（创建、删除、启动、停止）
│   ├── logs.js               # 日志管理
│   └── dns.js                # DNS 记录管理
├── middleware/               # 中间件
│   └── auth.js               # JWT 认证中间件
├── utils/                    # 工具函数
│   ├── userManager.js        # 用户数据管理
│   ├── auth.js               # JWT 工具函数
│   ├── passwordValidator.js  # 密码强度验证
│   ├── loginAttempts.js      # 登录失败限制
│   ├── cache.js              # 内存缓存管理
│   └── errorCodes.js         # 统一错误码定义
└── index.js                  # 服务器入口文件
```

### `public/` - 静态资源
前端静态资源文件。

```
public/
├── tauri.svg                 # 图标
└── vite.svg                  # 图标
```

## 📄 配置文件

### 项目配置
- `package.json` - npm 依赖和脚本配置
- `package-lock.json` - 依赖锁定文件

### 构建配置
- `vite.config.js` - Vite 构建工具配置
- `postcss.config.js` - PostCSS 配置
- `tailwind.config.js` - Tailwind CSS 配置
- `components.json` - Shadcn/ui 组件配置
- `jsconfig.json` - JavaScript 项目配置

### 版本控制
- `.gitignore` - Git 忽略规则

## 🔧 脚本文件

### CLI 管理工具
- `cftm.js` - 统一命令行管理工具
  - 服务管理：start, stop, restart, service, logs
  - 用户管理：reset-admin, change-password, list-users, add-user, remove-user
  - 系统信息：status

### 安装部署脚本
- `install.sh` - 一键安装脚本（Linux）
  - 支持标准安装：`curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash`
  - 支持加速代理：
    - `curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash`
    - `curl -fsSL https://gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash`
    - `curl -fsSL https://hk.gh-proxy.org/https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash`
- `update.sh` - 更新脚本
- `uninstall.sh` - 卸载脚本
- `quick-deploy.sh` - 快速部署脚本

### 打包脚本
- `package.sh` - Linux 打包脚本（生成 .tar.gz）
- `package.ps1` - Windows 打包脚本（生成 .tar.gz）

## 📚 文档文件

### 用户文档
- `README.md` - 项目说明和快速开始
- `INSTALL.md` - 详细安装指南
- `DEPLOY.md` - 部署指南
- `SECURITY.md` - 安全说明
- `START.md` - 快速启动指南
- `PROJECT_STRUCTURE.md` - 本文件，项目结构说明

## 🗂️ 其他目录

### `dist/` - 构建输出
运行 `npm run build` 后生成的前端构建产物。
- 不提交到 git（已在 .gitignore 中）
- 生产环境使用

### `node_modules/` - 依赖包
npm 安装的依赖包。
- 不提交到 git（已在 .gitignore 中）
- 运行 `npm install` 自动生成

### `.archive/` - 归档文件
开发过程中的临时文件和日志。
- 不提交到 git（已在 .gitignore 中）
- 包含开发日志和临时脚本
- 可以安全删除

## 📝 入口文件

- `index.html` - HTML 入口文件

## 🎯 核心功能模块

### 认证系统
- 文件：`server/routes/auth.js`, `server/middleware/auth.js`, `server/utils/auth.js`
- 功能：JWT 认证、用户管理、密码加密、登录限制

### Tunnel 管理
- 文件：`server/routes/tunnels.js`, `src/render/components/CloudflareTunnel/`
- 功能：创建、删除、启动、停止 Tunnel，配置管理

### cloudflared 管理
- 文件：`server/routes/cloudflared.js`
- 功能：安装、卸载、版本检查、版本列表

### 日志系统
- 文件：`server/routes/logs.js`, `src/render/components/Logs/`
- 功能：查看安装日志、Tunnel 运行日志

### DNS 管理
- 文件：`server/routes/dns.js`
- 功能：获取 Zone 列表、创建 DNS 记录

## 🔐 安全相关

### 密码管理
- `server/utils/passwordValidator.js` - 密码强度验证
- `server/utils/userManager.js` - 用户数据加密存储
- `src/render/components/ChangePassword/` - 密码修改界面

### 登录保护
- `server/utils/loginAttempts.js` - 登录失败限制
- `server/utils/cache.js` - 登录限制缓存

### 错误处理
- `server/utils/errorCodes.js` - 统一错误码和响应格式

## 📦 依赖说明

### 前端依赖
- React 19.1.0 - UI 框架
- Vite 7.0.4 - 构建工具
- Tailwind CSS - CSS 框架
- Shadcn/ui - UI 组件库
- Lucide React - 图标库
- React Router - 路由管理

### 后端依赖
- Express - Web 服务器
- jsonwebtoken - JWT 认证
- bcrypt - 密码加密
- axios - HTTP 客户端
- commander - CLI 工具框架

## 🚀 开发流程

### 开发模式
```bash
npm run dev          # 启动开发服务器
```

### 生产构建
```bash
npm run build        # 构建前端
npm start            # 启动后端服务器
```

### 打包部署
```bash
bash package.sh      # Linux 打包
# 或
powershell package.ps1  # Windows 打包
```

## 📖 相关文档

- [README.md](./README.md) - 项目说明
- [INSTALL.md](./INSTALL.md) - 安装指南
- [DEPLOY.md](./DEPLOY.md) - 部署指南
- [SECURITY.md](./SECURITY.md) - 安全说明
- [START.md](./START.md) - 快速启动
- [.archive/README.md](./.archive/README.md) - 归档说明

## 🤝 贡献指南

欢迎贡献代码！请遵循以下规范：

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 发起 Pull Request

## 📄 许可证

MIT License
