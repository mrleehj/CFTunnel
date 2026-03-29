/**
 * Tunnel 管理路由
 */

import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import yaml from 'js-yaml';
import { createError, createSuccess, asyncHandler } from '../utils/errorCodes.js';

const router = express.Router();

// Tunnel 进程状态 - 使用 Map 存储多个进程
const tunnelProcesses = new Map(); // key: tunnelId, value: { process, status }

// 获取安装目录
function getInstallDir() {
  return path.join(os.homedir(), '.cf_tunnel', 'bin');
}

// 获取配置目录
function getConfigDir() {
  return path.join(os.homedir(), '.cf_tunnel', 'config');
}

// 获取日志目录
function getLogDir() {
  return path.join(os.homedir(), '.cf_tunnel', 'logs');
}

// 获取 cloudflared 路径
function getCloudflaredPath() {
  const dir = getInstallDir();
  return path.join(dir, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
}

// 生成 Tunnel Secret
function generateTunnelSecret() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const secret = `${timestamp}${random}`;
  return Buffer.from(secret).toString('base64');
}

/**
 * POST /api/tunnels
 * 列出所有 Tunnel
 */
router.post('/', async (req, res) => {
  try {
    const { account_id, api_token } = req.body;
    
    const response = await axios.get(
      `https://api.cloudflare.com/client/v4/accounts/${account_id}/cfd_tunnel`,
      {
        headers: {
          'Authorization': `Bearer ${api_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'cf-linux-app'
        }
      }
    );
    
    if (!response.data.success) {
      return res.status(400).json({ error: '获取 Tunnel 列表失败' });
    }
    
    // 获取每个 Tunnel 的配置
    const tunnels = await Promise.all(
      response.data.result.map(async (tunnel) => {
        try {
          const configRes = await axios.get(
            `https://api.cloudflare.com/client/v4/accounts/${account_id}/cfd_tunnel/${tunnel.id}/configurations`,
            {
              headers: {
                'Authorization': `Bearer ${api_token}`,
                'User-Agent': 'cf-linux-app'
              }
            }
          );
          
          const routes = [];
          if (configRes.data.success && configRes.data.result?.config?.ingress) {
            for (const rule of configRes.data.result.config.ingress) {
              if (rule.hostname && rule.service) {
                routes.push({
                  hostname: rule.hostname,
                  service: rule.service
                });
              }
            }
          }
          
          return {
            id: tunnel.id,
            name: tunnel.name,
            created_at: tunnel.created_at,
            routes
          };
        } catch (e) {
          console.log(`获取 Tunnel ${tunnel.name} 配置失败:`, e.message);
          return {
            id: tunnel.id,
            name: tunnel.name,
            created_at: tunnel.created_at,
            routes: []
          };
        }
      })
    );
    
    res.json(tunnels);
  } catch (error) {
    console.error('获取 Tunnel 列表失败:', error.message);
    res.status(500).json({ error: '获取 Tunnel 列表失败', message: error.message });
  }
});

/**
 * POST /api/tunnels/create
 * 创建新 Tunnel
 */
router.post('/create', async (req, res) => {
  try {
    const { account_id, api_token, name } = req.body;
    
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${account_id}/cfd_tunnel`,
      {
        name,
        tunnel_secret: generateTunnelSecret()
      },
      {
        headers: {
          'Authorization': `Bearer ${api_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'cf-linux-app'
        }
      }
    );
    
    if (!response.data.success) {
      const error = response.data.errors?.[0]?.message || '创建失败';
      return res.status(400).json({ error: `创建 Tunnel 失败: ${error}` });
    }
    
    res.json({
      id: response.data.result.id,
      name: response.data.result.name,
      created_at: response.data.result.created_at
    });
  } catch (error) {
    console.error('创建 Tunnel 失败:', error.message);
    res.status(500).json({ error: '创建 Tunnel 失败', message: error.message });
  }
});

/**
 * DELETE /api/tunnels/:id
 * 删除 Tunnel
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { account_id, api_token } = req.body;
  
  if (!account_id || !api_token) {
    return res.status(400).json(createError('INVALID_PARAMS', '缺少 account_id 或 api_token'));
  }
  
  const response = await axios.delete(
    `https://api.cloudflare.com/client/v4/accounts/${account_id}/cfd_tunnel/${id}`,
    {
      headers: {
        'Authorization': `Bearer ${api_token}`,
        'User-Agent': 'cf-linux-app'
      }
    }
  );
  
  if (!response.data.success) {
    const error = response.data.errors?.[0]?.message || '删除失败';
    return res.status(400).json(createError('TUNNEL_DELETE_FAILED', error));
  }
  
  res.json(createSuccess(null, 'Tunnel 已删除'));
}));

/**
 * POST /api/tunnels/:id/config
 * 获取 Tunnel 配置
 */
router.post('/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id, api_token } = req.body;
    
    const response = await axios.get(
      `https://api.cloudflare.com/client/v4/accounts/${account_id}/cfd_tunnel/${id}/configurations`,
      {
        headers: {
          'Authorization': `Bearer ${api_token}`,
          'User-Agent': 'cf-linux-app'
        }
      }
    );
    
    if (!response.data.success) {
      return res.status(400).json({ error: '获取配置失败' });
    }
    
    const routes = [];
    if (response.data.result?.config?.ingress) {
      for (const rule of response.data.result.config.ingress) {
        if (rule.hostname && rule.service) {
          routes.push({
            hostname: rule.hostname,
            service: rule.service
          });
        }
      }
    }
    
    res.json({ routes });
  } catch (error) {
    console.error('获取配置失败:', error.message);
    
    // 如果是 404 错误，说明 Tunnel 还没有配置，返回空配置
    if (error.response && error.response.status === 404) {
      console.log('Tunnel 配置不存在，返回空配置');
      return res.json({ routes: [] });
    }
    
    res.status(500).json({ error: '获取配置失败', message: error.message });
  }
});

/**
 * PUT /api/tunnels/:id/config
 * 更新 Tunnel 配置
 */
router.put('/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id, api_token, routes } = req.body;
    
    // 构建 ingress 规则
    const ingress = routes.map(route => ({
      hostname: route.hostname,
      service: route.service
    }));
    
    // 添加默认的 catch-all 规则
    ingress.push({ service: 'http_status:404' });
    
    const response = await axios.put(
      `https://api.cloudflare.com/client/v4/accounts/${account_id}/cfd_tunnel/${id}/configurations`,
      {
        config: { ingress }
      },
      {
        headers: {
          'Authorization': `Bearer ${api_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'cf-linux-app'
        }
      }
    );
    
    if (!response.data.success) {
      const error = response.data.errors?.[0]?.message || '更新失败';
      return res.status(400).json({ error: `更新配置失败: ${error}` });
    }
    
    res.json({ message: '配置已更新' });
  } catch (error) {
    console.error('更新配置失败:', error.message);
    res.status(500).json({ error: '更新配置失败', message: error.message });
  }
});

/**
 * POST /api/tunnels/start
 * 启动 Tunnel
 */
router.post('/start', async (req, res) => {
  try {
    const { tunnel_id, tunnel_name, routes, custom_dns, protocol } = req.body;
    
    // 检查该 Tunnel 是否已经在运行
    if (tunnelProcesses.has(tunnel_id)) {
      const existing = tunnelProcesses.get(tunnel_id);
      if (existing.status.running) {
        return res.status(400).json({ error: '该 Tunnel 已经在运行中' });
      }
    }
    
    const cloudflaredPath = getCloudflaredPath();
    
    // 检查 cloudflared 是否存在
    try {
      await fs.access(cloudflaredPath);
    } catch {
      return res.status(400).json({ error: 'cloudflared 未安装' });
    }
    
    // 加载凭证
    const credPath = path.join(getInstallDir(), 'credentials.json');
    let creds;
    try {
      const credData = await fs.readFile(credPath, 'utf-8');
      creds = JSON.parse(credData);
    } catch {
      return res.status(400).json({ error: '未找到 Cloudflare 凭证' });
    }
    
    console.log('🔑 获取 Tunnel Token...');
    
    // 获取 Tunnel Token
    let tunnelToken;
    try {
      const response = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${creds.account_id}/cfd_tunnel/${tunnel_id}/token`,
        {
          headers: {
            'Authorization': `Bearer ${creds.api_token}`,
            'User-Agent': 'cf-linux-app'
          }
        }
      );
      
      if (!response.data.success) {
        throw new Error('获取 Token 失败');
      }
      
      tunnelToken = response.data.result;
      console.log('✅ Token 获取成功');
    } catch (error) {
      console.error('❌ 获取 Tunnel Token 失败:', error.message);
      return res.status(400).json({ error: '获取 Tunnel Token 失败' });
    }
    
    // 创建配置目录
    const configDir = getConfigDir();
    await fs.mkdir(configDir, { recursive: true });
    
    // 创建 Tunnel 专用目录
    const tunnelConfigDir = path.join(configDir, tunnel_id);
    await fs.mkdir(tunnelConfigDir, { recursive: true });
    
    // 解码 Token 并创建凭证文件
    console.log('🔓 解码 Tunnel Token 并创建凭证文件...');
    try {
      // Token 是 base64 编码的 JSON
      const tokenBuffer = Buffer.from(tunnelToken, 'base64');
      const tokenJson = JSON.parse(tokenBuffer.toString('utf-8'));
      
      // 提取凭证信息
      const accountTag = tokenJson.a || tokenJson.AccountTag;
      const tunnelIdInToken = tokenJson.t || tokenJson.TunnelID;
      const tunnelSecret = tokenJson.s || tokenJson.TunnelSecret;
      
      console.log('   - AccountTag:', accountTag);
      console.log('   - TunnelID:', tunnelIdInToken);
      console.log('   - TunnelSecret 长度:', tunnelSecret ? tunnelSecret.length : 0);
      
      // 创建凭证文件
      const credentialsJson = {
        AccountTag: accountTag,
        TunnelID: tunnelIdInToken,
        TunnelSecret: tunnelSecret
      };
      
      const credFilePath = path.join(tunnelConfigDir, `${tunnel_id}.json`);
      await fs.writeFile(credFilePath, JSON.stringify(credentialsJson, null, 2), 'utf-8');
      console.log('✅ 凭证文件已创建:', credFilePath);
    } catch (error) {
      console.error('❌ 创建凭证文件失败:', error.message);
      // 继续执行，因为可以使用 Token 启动
    }
    
    // 创建日志目录
    const logDir = getLogDir();
    await fs.mkdir(logDir, { recursive: true });
    
    // 生成配置文件
    const configFile = path.join(configDir, `${tunnel_id}.yml`);
    
    let config = {};
    
    // 添加协议配置
    if (protocol === 'http2') {
      config.protocol = 'http2';
    }
    
    // 暂时不添加自定义 DNS 配置，因为格式复杂
    // TODO: 研究正确的 DNS 配置格式
    // if (custom_dns) {
    //   const dnsServers = custom_dns.split(',').map(s => s.trim()).filter(s => s);
    //   if (dnsServers.length > 0) {
    //     config.edge = { 'dns-servers': dnsServers };
    //   }
    // }
    
    // 添加 ingress 规则
    if (routes && routes.length > 0) {
      config.ingress = routes.map(route => ({
        hostname: route.hostname,
        service: route.service
      }));
      config.ingress.push({ service: 'http_status:404' });
    } else {
      config.ingress = [{ service: 'http_status:404' }];
    }
    
    // 写入配置文件
    await fs.writeFile(configFile, yaml.dump(config), 'utf-8');
    console.log('✅ 配置文件已创建:', configFile);
    
    // 启动 cloudflared
    const logFile = path.join(logDir, `${tunnel_name}.log`);
    const logStream = createWriteStream(logFile, { flags: 'a' });
    
    // 修改参数顺序：--config 应该在 tunnel 之后，run 之前
    const args = ['tunnel', '--config', configFile, 'run', '--token', tunnelToken, tunnel_id];
    
    console.log('🚀 启动 cloudflared...');
    console.log('   命令:', cloudflaredPath);
    console.log('   参数:', args.join(' '));
    
    const process = spawn(cloudflaredPath, args, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // 将输出写入日志文件
    process.stdout.pipe(logStream);
    process.stderr.pipe(logStream);
    
    const status = {
      running: true,
      pid: process.pid,
      startTime: new Date().toISOString(),
      tunnelId: tunnel_id,
      tunnelName: tunnel_name
    };
    
    // 存储到 Map 中
    tunnelProcesses.set(tunnel_id, { process, status });
    
    console.log('✅ Tunnel 已启动, PID:', process.pid);
    
    // 监听进程退出
    process.on('exit', async (code, signal) => {
      console.log(`Tunnel ${tunnel_name} 进程退出，代码: ${code}, 信号: ${signal}`);
      
      // 如果退出代码不是 0，读取日志文件的最后几行
      if (code !== 0) {
        try {
          const logContent = await fs.readFile(logFile, 'utf-8');
          const logLines = logContent.split('\n').filter(line => line.trim());
          const lastLines = logLines.slice(-10); // 最后 10 行
          console.log(`❌ Tunnel ${tunnel_name} 启动失败，最后的日志:`);
          lastLines.forEach(line => console.log('   ', line));
        } catch (e) {
          console.log('无法读取日志文件:', e.message);
        }
      }
      
      // 从 Map 中移除
      tunnelProcesses.delete(tunnel_id);
      logStream.end();
    });
    
    res.json({ 
      message: 'Tunnel 已启动',
      pid: process.pid
    });
  } catch (error) {
    console.error('启动 Tunnel 失败:', error);
    res.status(500).json({ error: '启动 Tunnel 失败', message: error.message });
  }
});

/**
 * POST /api/tunnels/stop
 * 停止 Tunnel
 */
router.post('/stop', async (req, res) => {
  try {
    const { tunnel_id } = req.body;
    
    if (!tunnel_id) {
      return res.status(400).json({ error: '缺少 tunnel_id 参数' });
    }
    
    const tunnelData = tunnelProcesses.get(tunnel_id);
    if (!tunnelData || !tunnelData.status.running) {
      return res.status(400).json({ error: '该 Tunnel 未运行' });
    }
    
    const { process } = tunnelData;
    
    // 终止进程
    process.kill('SIGTERM');
    
    // 等待一下让进程退出
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 如果还没退出，强制杀死
    if (process && !process.killed) {
      process.kill('SIGKILL');
    }
    
    // 从 Map 中移除
    tunnelProcesses.delete(tunnel_id);
    
    res.json({ message: 'Tunnel 已停止' });
  } catch (error) {
    console.error('停止 Tunnel 失败:', error);
    res.status(500).json({ error: '停止 Tunnel 失败', message: error.message });
  }
});

/**
 * GET /api/tunnels/status
 * 获取所有 Tunnel 的运行状态
 */
router.get('/status', (req, res) => {
  const statuses = {};
  for (const [tunnelId, data] of tunnelProcesses.entries()) {
    statuses[tunnelId] = data.status;
  }
  res.json(statuses);
});

export default router;
