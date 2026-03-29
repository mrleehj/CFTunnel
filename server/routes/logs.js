/**
 * 日志管理路由
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = express.Router();

/**
 * GET /api/logs/install
 * 获取安装日志
 */
router.get('/install', async (req, res) => {
  try {
    const logPath = path.join(os.homedir(), '.cf_tunnel', 'install.log');
    const log = await fs.readFile(logPath, 'utf-8');
    
    res.json({ log });
  } catch (error) {
    res.json({ log: '' });
  }
});

/**
 * GET /api/logs/tunnel/:name
 * 获取 Tunnel 日志
 */
router.get('/tunnel/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const logPath = path.join(os.homedir(), '.cf_tunnel', 'logs', `${name}.log`);
    const log = await fs.readFile(logPath, 'utf-8');
    
    // 返回 JSON 格式，与安装日志保持一致
    res.json({ log });
  } catch (error) {
    // 文件不存在时返回空日志
    res.json({ log: '' });
  }
});

/**
 * DELETE /api/logs/install
 * 清空安装日志
 */
router.delete('/install', async (req, res) => {
  try {
    const logPath = path.join(os.homedir(), '.cf_tunnel', 'install.log');
    await fs.writeFile(logPath, '');
    
    res.json({ message: '日志已清空' });
  } catch (error) {
    res.status(500).json({ error: '清空日志失败', message: error.message });
  }
});

/**
 * DELETE /api/logs/tunnel/:name
 * 清空 Tunnel 日志
 */
router.delete('/tunnel/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const logPath = path.join(os.homedir(), '.cf_tunnel', 'logs', `${name}.log`);
    await fs.writeFile(logPath, '');
    
    res.json({ message: '日志已清空' });
  } catch (error) {
    res.status(500).json({ error: '清空日志失败', message: error.message });
  }
});

export default router;
