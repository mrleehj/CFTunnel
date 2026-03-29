/**
 * 调试工具路由
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = express.Router();

/**
 * GET /api/debug/credentials/:tunnelId
 * 读取 Tunnel 凭证文件（如果不存在则自动创建）
 */
router.get('/credentials/:tunnelId', async (req, res) => {
  try {
    const { tunnelId } = req.params;
    const credPath = path.join(
      os.homedir(),
      '.cf_tunnel',
      'config',
      tunnelId,
      `${tunnelId}.json`
    );
    
    console.log('尝试读取凭证文件:', credPath);
    
    try {
      // 尝试读取已有的凭证文件
      const data = await fs.readFile(credPath, 'utf-8');
      res.type('text/plain').send(data);
    } catch (readError) {
      // 凭证文件不存在，尝试从 API 获取并创建
      console.log('凭证文件不存在，尝试从 API 获取 Token 并创建...');
      
      // 从请求中获取凭证（通过查询参数）
      const accountId = req.query.account_id;
      const apiToken = req.query.api_token;
      
      if (!accountId || !apiToken) {
        return res.type('text/plain').send(
          `凭证文件不存在\n\n` +
          `路径: ${credPath}\n\n` +
          `说明: 凭证文件会在首次启动 Tunnel 时自动创建。\n` +
          `或者需要提供 account_id 和 api_token 参数来自动创建。`
        );
      }
      
      // 从 Cloudflare API 获取 Token
      const axios = (await import('axios')).default;
      const tokenResponse = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'User-Agent': 'cf-linux-app'
          }
        }
      );
      
      if (!tokenResponse.data.success) {
        return res.type('text/plain').send(
          `获取 Tunnel Token 失败\n\n` +
          `错误: ${tokenResponse.data.errors?.[0]?.message || '未知错误'}`
        );
      }
      
      const tunnelToken = tokenResponse.data.result;
      
      // 解码 Token
      const tokenBuffer = Buffer.from(tunnelToken, 'base64');
      const tokenJson = JSON.parse(tokenBuffer.toString('utf-8'));
      
      // 提取凭证信息
      const accountTag = tokenJson.a || tokenJson.AccountTag;
      const tunnelIdInToken = tokenJson.t || tokenJson.TunnelID;
      const tunnelSecret = tokenJson.s || tokenJson.TunnelSecret;
      
      // 创建凭证文件
      const credentialsJson = {
        AccountTag: accountTag,
        TunnelID: tunnelIdInToken,
        TunnelSecret: tunnelSecret
      };
      
      // 创建目录
      const tunnelConfigDir = path.dirname(credPath);
      await fs.mkdir(tunnelConfigDir, { recursive: true });
      
      // 写入凭证文件
      await fs.writeFile(credPath, JSON.stringify(credentialsJson, null, 2), 'utf-8');
      console.log('✅ 凭证文件已创建:', credPath);
      
      // 返回创建的凭证内容
      res.type('text/plain').send(JSON.stringify(credentialsJson, null, 2));
    }
  } catch (error) {
    console.error('处理凭证文件失败:', error.message);
    res.type('text/plain').send(
      `处理凭证文件失败\n\n` +
      `错误: ${error.message}\n\n` +
      `详情: ${error.stack}`
    );
  }
});

export default router;
