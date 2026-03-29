# GitHub Release 发布指南

本文档说明如何创建和发布 Cloudflare Tunnel Manager 的 Release 版本。

## 发布流程

### 1. 本地构建和打包

在本地开发环境（Windows/Linux/Mac）执行:

```bash
# 进入项目目录
cd cf-linux

# 安装依赖
npm install

# 构建前端
npm run build

# 打包（Linux/Mac）
bash package.sh

# 打包（Windows PowerShell）
# powershell -ExecutionPolicy Bypass -File .archive/scripts/package.ps1
```

打包完成后会生成:
- `cf-tunnel-manager-YYYYMMDD_HHMMSS.tar.gz` - 完整安装包
- `deploy-YYYYMMDD_HHMMSS.sh` - 部署脚本

### 2. 重命名安装包

为了方便一键安装脚本使用,将安装包重命名为固定名称:

```bash
# 重命名为固定名称
mv cf-tunnel-manager-*.tar.gz cf-tunnel-manager.tar.gz
```

### 3. 创建 GitHub Release

#### 方式 1: 通过 GitHub 网页界面

1. 访问仓库页面: https://github.com/mrleehj/CFTunnel

2. 点击右侧 "Releases" → "Create a new release"

3. 填写 Release 信息:
   - **Tag version**: `v1.0.0` (或其他版本号)
   - **Release title**: `Cloudflare Tunnel Manager v1.0.0`
   - **Description**: 填写更新说明

4. 上传文件:
   - 点击 "Attach binaries by dropping them here or selecting them"
   - 上传 `cf-tunnel-manager.tar.gz`

5. 点击 "Publish release"

#### 方式 2: 使用 GitHub CLI

```bash
# 安装 GitHub CLI (如果未安装)
# https://cli.github.com/

# 登录
gh auth login

# 创建 Release 并上传文件
gh release create v1.0.0 \
  cf-tunnel-manager.tar.gz \
  --title "Cloudflare Tunnel Manager v1.0.0" \
  --notes "完整安装包，包含已构建的前端文件"
```

### 4. 同步到 Gitee（可选，国内用户）

如果需要支持国内用户,也需要在 Gitee 创建 Release:

1. 访问 Gitee 仓库: https://gitee.com/mrleehj/CFTunnel

2. 点击 "发行版" → "创建发行版"

3. 填写信息并上传 `cf-tunnel-manager.tar.gz`

4. 点击 "发布"

### 5. 测试一键安装

发布完成后,测试一键安装是否正常:

```bash
# 测试 GitHub 安装
curl -fsSL https://raw.githubusercontent.com/mrleehj/CFTunnel/main/install.sh | sudo bash

# 测试 Gitee 安装
curl -fsSL https://gitee.com/mrleehj/CFTunnel/raw/main/install.sh | sudo bash
```

## 版本管理

### 版本号规则

使用语义化版本号 (Semantic Versioning):

- **主版本号 (Major)**: 不兼容的 API 修改
- **次版本号 (Minor)**: 向下兼容的功能性新增
- **修订号 (Patch)**: 向下兼容的问题修正

示例:
- `v1.0.0` - 首个正式版本
- `v1.1.0` - 添加新功能
- `v1.1.1` - 修复 bug

### Release 类型

- **正式版本**: `v1.0.0`
- **预发布版本**: `v1.0.0-beta.1`, `v1.0.0-rc.1`
- **Latest**: 最新稳定版本（一键安装默认使用）

## 安装包内容

完整的安装包应包含:

```
cf-tunnel-manager.tar.gz
├── server/              # 后端代码
├── dist/                # 已构建的前端文件 ⭐
├── package.json         # 依赖配置
├── package-lock.json    # 锁定依赖版本
├── .npmrc               # npm 配置（国内镜像）
├── install.sh           # 安装脚本
├── uninstall.sh         # 卸载脚本
├── update.sh            # 更新脚本
├── cftm.js              # CLI 管理工具
├── README.md            # 项目说明
├── INSTALL.md           # 安装指南
├── DEPLOY.md            # 部署指南
├── SECURITY.md          # 安全说明
└── PROJECT_STRUCTURE.md # 项目结构
```

**重要**: 必须包含已构建的 `dist/` 目录,这样服务器上无需构建,可以直接安装。

## 自动化发布（可选）

可以使用 GitHub Actions 自动化发布流程:

### 创建 `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
        working-directory: cf-linux
      
      - name: Build frontend
        run: npm run build
        working-directory: cf-linux
      
      - name: Package
        run: bash package.sh
        working-directory: cf-linux
      
      - name: Rename package
        run: mv cf-tunnel-manager-*.tar.gz cf-tunnel-manager.tar.gz
        working-directory: cf-linux
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: cf-linux/cf-tunnel-manager.tar.gz
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

使用方法:
```bash
# 创建并推送 tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions 会自动构建并发布
```

## 更新现有 Release

如果需要更新已发布的 Release:

1. 删除旧的附件文件
2. 上传新的 `cf-tunnel-manager.tar.gz`
3. 更新 Release 说明

或者创建新的版本号（推荐）。

## 故障排查

### 问题 1: 下载失败

```
[ERROR] 所有下载源均不可用
```

**解决方法**:
- 检查 Release 是否已发布
- 检查文件名是否为 `cf-tunnel-manager.tar.gz`
- 检查网络连接

### 问题 2: 解压失败

```
[ERROR] 解压失败
```

**解决方法**:
- 检查安装包是否完整
- 重新下载安装包
- 检查磁盘空间

### 问题 3: 缺少 dist 目录

```
[ERROR] 未找到前端构建文件 (dist 目录)
```

**解决方法**:
- 确保打包前已运行 `npm run build`
- 检查 `package.sh` 脚本是否正确复制了 `dist` 目录
- 重新打包并发布

## 注意事项

1. **必须包含 dist 目录**: 安装包必须包含已构建的前端文件
2. **文件名固定**: 安装包必须命名为 `cf-tunnel-manager.tar.gz`
3. **测试后发布**: 发布前在本地测试安装包是否完整
4. **同步 Gitee**: 如果支持国内用户,记得同步到 Gitee
5. **更新文档**: 发布新版本后更新 README.md 中的版本号

## 相关文档

- [安装指南](./INSTALL.md)
- [部署指南](./DEPLOY.md)
- [一键安装说明](./ONE_CLICK_INSTALL.md)
- [项目结构](./PROJECT_STRUCTURE.md)
