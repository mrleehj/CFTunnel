# Cloudflare Tunnel Manager - Docker 镜像
# 多阶段构建，优化镜像体积

# ============================================
# 阶段 1: 构建前端
# ============================================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖，用于构建）
RUN npm ci

# 复制源码
COPY . .

# 构建前端
RUN npm run build

# ============================================
# 阶段 2: 生产运行环境
# ============================================
FROM node:18-alpine

# 设置标签
LABEL maintainer="CF Tunnel Manager"
LABEL description="Cloudflare Tunnel Manager - Web Management Interface"
LABEL version="1.3.0"

# 安装必要的系统工具
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata

# 设置时区为上海
ENV TZ=Asia/Shanghai

# 创建非 root 用户
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --omit=dev && \
    npm cache clean --force

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制后端代码
COPY server ./server

# 复制其他必要文件
COPY cftm.js ./
COPY VERSION ./

# 创建数据目录
RUN mkdir -p /data && \
    chown -R node:node /data /app

# 切换到非 root 用户
USER node

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
ENV DOCKER=true

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# 启动应用
CMD ["node", "server/index.js"]
