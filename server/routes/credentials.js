/**
 * 凭证管理路由
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = express.Router();

// 获取凭证文件路径
function getCredentialsPath() {
  return path.join(os.homedir(), '.cf_tunnel', 'bin', 'credentials.json');
}

/**
 * POST /api/credentials
 * 保存凭证
 */
router.post('/', async (req, res) => {
  try {
    const { account_id, api_token } = req.body;
    
    if (!account_id || !api_token) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const credentialsPath = getCredentialsPath();
    const dir = path.dirname(credentialsPath);
    
    // 确保目录存在
    await fs.mkdir(dir, { recursive: true });
    
    // 保存凭证
    await fs.writeFile(
      credentialsPath,
      JSON.stringify({ account_id, api_token }, null, 2)
    );
    
    res.json({ message: '凭证已保存' });
  } catch (error) {
    res.status(500).json({ error: '保存凭证失败', message: error.message });
  }
});

/**
 * GET /api/credentials
 * 加载凭证
 */
router.get('/', async (req, res) => {
  try {
    const credentialsPath = getCredentialsPath();
    const data = await fs.readFile(credentialsPath, 'utf-8');
    const credentials = JSON.parse(data);
    
    res.json(credentials);
  } catch (error) {
    res.status(404).json({ error: '未找到凭证', message: error.message });
  }
});

/**
 * POST /api/credentials/test
 * 测试凭证有效性
 */
router.post('/test', async (req, res) => {
  try {
    const { account_id, api_token } = req.body;
    
    // TODO: 调用 Cloudflare API 验证凭证
    res.json({ valid: true, message: '凭证有效' });
  } catch (error) {
    res.status(500).json({ error: '测试凭证失败', message: error.message });
  }
});

export default router;
