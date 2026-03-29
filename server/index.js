/**
 * Cloudflare Tunnel 管理工具 - Linux 后端服务器
 * 
 * 提供 RESTful API 接口，处理 cloudflared 管理和 Cloudflare API 调用
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 导入路由
import authRouter from './routes/auth.js';
import cloudflaredRouter from './routes/cloudflared.js';
import credentialsRouter from './routes/credentials.js';
import tunnelsRouter from './routes/tunnels.js';
import logsRouter from './routes/logs.js';
import dnsRouter from './routes/dns.js';
import debugRouter from './routes/debug.js';
import systemRouter from './routes/system.js';

// 导入认证中间件和用户管理
import { authenticate } from './middleware/auth.js';
import { initializeDefaultAdmin } from './utils/userManager.js';
import { errorHandler } from './utils/errorCodes.js';
import { cache } from './utils/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 认证路由（不需要认证）
app.use('/api/auth', authRouter);

// API 路由（需要认证）
app.use('/api/cloudflared', authenticate, cloudflaredRouter);
app.use('/api/credentials', authenticate, credentialsRouter);
app.use('/api/tunnels', authenticate, tunnelsRouter);
app.use('/api/logs', authenticate, logsRouter);
app.use('/api/dns', authenticate, dnsRouter);
app.use('/api/debug', authenticate, debugRouter);
app.use('/api/system', authenticate, systemRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    cache: cache.getStats()
  });
});

// 生产模式：提供静态文件服务
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../dist');
  
  // 提供静态文件
  app.use(express.static(distPath));
  
  // 所有非 API 请求返回 index.html（支持前端路由）
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
  
  console.log('📦 生产模式：提供静态文件服务');
}

// 统一错误处理中间件（必须放在所有路由之后）
app.use(errorHandler);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`\n🚀 服务器已启动`);
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`🌐 API 地址: http://localhost:${PORT}/api`);
  console.log(`💚 健康检查: http://localhost:${PORT}/api/health`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌍 应用地址: http://localhost:${PORT}`);
  } else {
    console.log(`🔧 开发模式：前端运行在 http://localhost:5173`);
  }
  
  console.log('');
  
  // 初始化默认管理员账号
  await initializeDefaultAdmin();
});
