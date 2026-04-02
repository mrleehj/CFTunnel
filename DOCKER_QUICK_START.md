# Docker 快速开始

## 🚀 一分钟部署

```bash
docker run -d \
  --name cf-tunnel \
  -p 3000:3000 \
  -v cf-data:/data \
  --restart unless-stopped \
  mrleehj/cf-tunnel-manager:latest
```

访问 http://localhost:3000

## 📝 首次登录

查看初始密码：

```bash
docker logs cf-tunnel | grep "密码"
```

## 🔧 常用命令

```bash
# 查看日志
docker logs -f cf-tunnel

# 重启容器
docker restart cf-tunnel

# 停止容器
docker stop cf-tunnel

# 进入容器
docker exec -it cf-tunnel sh

# 备份数据
docker run --rm -v cf-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .

# 恢复数据
docker run --rm -v cf-data:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /data
```

## 🌐 自定义端口

```bash
docker run -d \
  --name cf-tunnel \
  -p 8080:3000 \
  -v cf-data:/data \
  mrleehj/cf-tunnel-manager:latest
```

访问 http://localhost:8080

## 📚 完整文档

- [Docker 部署指南](DOCKER.md)
- [Docker Hub 发布指南](DOCKER_HUB_PUBLISH.md)
- [项目 README](README.md)

## ❓ 需要帮助？

- GitHub Issues: https://github.com/mrleehj/CFTunnel/issues
- 文档: https://github.com/mrleehj/CFTunnel
