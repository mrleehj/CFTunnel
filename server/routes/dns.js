/**
 * DNS 管理路由
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * POST /api/dns/zones
 * 获取所有域名
 */
router.post('/zones', async (req, res) => {
  try {
    const { api_token } = req.body;
    
    const response = await axios.get(
      'https://api.cloudflare.com/client/v4/zones',
      {
        headers: {
          'Authorization': `Bearer ${api_token}`,
          'User-Agent': 'cf-linux-app'
        }
      }
    );
    
    if (!response.data.success) {
      return res.status(400).json({ error: '获取域名列表失败' });
    }
    
    const zones = response.data.result.map(zone => ({
      id: zone.id,
      name: zone.name
    }));
    
    res.json(zones);
  } catch (error) {
    console.error('获取域名列表失败:', error.message);
    res.status(500).json({ error: '获取域名列表失败', message: error.message });
  }
});

/**
 * POST /api/dns/records
 * 创建 DNS 记录
 */
router.post('/records', async (req, res) => {
  try {
    const { zone_id, api_token, subdomain, tunnel_id } = req.body;
    
    console.log('创建 DNS 记录请求:', { zone_id, subdomain, tunnel_id });
    
    // 先检查 DNS 记录是否已存在
    try {
      const existingRecords = await axios.get(
        `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?name=${subdomain}`,
        {
          headers: {
            'Authorization': `Bearer ${api_token}`,
            'User-Agent': 'cf-linux-app'
          }
        }
      );
      
      if (existingRecords.data.success && existingRecords.data.result.length > 0) {
        const existingRecord = existingRecords.data.result[0];
        const expectedContent = `${tunnel_id}.cfargotunnel.com`;
        
        // 如果记录已存在且指向同一个 Tunnel，直接返回成功
        if (existingRecord.content === expectedContent) {
          console.log('DNS 记录已存在且配置正确，跳过创建:', subdomain);
          return res.json({
            id: existingRecord.id,
            name: existingRecord.name,
            content: existingRecord.content,
            skipped: true,
            message: 'DNS 记录已存在'
          });
        }
        
        // 如果记录存在但指向不同的目标，更新记录
        console.log('DNS 记录已存在但配置不同，更新记录:', subdomain);
        const updateResponse = await axios.put(
          `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${existingRecord.id}`,
          {
            type: 'CNAME',
            name: subdomain,
            content: expectedContent,
            ttl: 1,
            proxied: true
          },
          {
            headers: {
              'Authorization': `Bearer ${api_token}`,
              'Content-Type': 'application/json',
              'User-Agent': 'cf-linux-app'
            }
          }
        );
        
        if (updateResponse.data.success) {
          console.log('DNS 记录更新成功:', subdomain);
          return res.json({
            id: updateResponse.data.result.id,
            name: updateResponse.data.result.name,
            content: updateResponse.data.result.content,
            updated: true,
            message: 'DNS 记录已更新'
          });
        }
      }
    } catch (checkError) {
      console.log('检查 DNS 记录时出错，继续尝试创建:', checkError.message);
    }
    
    // 创建新的 DNS 记录
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records`,
      {
        type: 'CNAME',
        name: subdomain,
        content: `${tunnel_id}.cfargotunnel.com`,
        ttl: 1,
        proxied: true
      },
      {
        headers: {
          'Authorization': `Bearer ${api_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'cf-linux-app'
        }
      }
    );
    
    console.log('Cloudflare API 响应:', response.data);
    
    if (!response.data.success) {
      const error = response.data.errors?.[0]?.message || '创建失败';
      console.error('创建 DNS 记录失败:', response.data.errors);
      return res.status(400).json({ error: `创建 DNS 记录失败: ${error}` });
    }
    
    res.json({
      id: response.data.result.id,
      name: response.data.result.name,
      content: response.data.result.content
    });
  } catch (error) {
    console.error('创建 DNS 记录失败:', error.message);
    if (error.response) {
      console.error('Cloudflare API 错误响应:', error.response.data);
      const cfError = error.response.data.errors?.[0]?.message || error.message;
      return res.status(error.response.status).json({ 
        error: '创建 DNS 记录失败', 
        message: cfError,
        details: error.response.data
      });
    }
    res.status(500).json({ error: '创建 DNS 记录失败', message: error.message });
  }
});

/**
 * DELETE /api/dns/records/:zone_id/:record_id
 * 删除 DNS 记录
 */
router.delete('/records/:zone_id/:record_id', async (req, res) => {
  try {
    const { zone_id, record_id } = req.params;
    const { api_token } = req.body;
    
    const response = await axios.delete(
      `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}`,
      {
        headers: {
          'Authorization': `Bearer ${api_token}`,
          'User-Agent': 'cf-linux-app'
        }
      }
    );
    
    if (!response.data.success) {
      return res.status(400).json({ error: '删除 DNS 记录失败' });
    }
    
    res.json({ message: 'DNS 记录已删除' });
  } catch (error) {
    console.error('删除 DNS 记录失败:', error.message);
    res.status(500).json({ error: '删除 DNS 记录失败', message: error.message });
  }
});

export default router;
