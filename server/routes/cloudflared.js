/**
 * cloudflared 管理路由
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import https from 'https';
import axios from 'axios';

const execAsync = promisify(exec);
const router = express.Router();

// 获取安装目录
function getInstallDir() {
  return path.join(os.homedir(), '.cf_tunnel', 'bin');
}

// 获取 cloudflared 路径
function getCloudflaredPath() {
  return path.join(getInstallDir(), 'cloudflared');
}

/**
 * GET /api/cloudflared/version
 * 检查 cloudflared 版本
 */
router.get('/version', async (req, res) => {
  try {
    const cloudflaredPath = getCloudflaredPath();
    
    try {
      await fs.access(cloudflaredPath);
    } catch {
      return res.json({ version: '未安装' });
    }

    const { stdout } = await execAsync(`${cloudflaredPath} --version`);
    const version = stdout.trim().split(' ')[2] || '未知版本';
    
    res.json({ version });
  } catch (error) {
    res.status(500).json({ error: '检查版本失败', message: error.message });
  }
});

/**
 * POST /api/cloudflared/install
 * 安装 cloudflared
 */
router.post('/install', async (req, res) => {
  let downloadUrl = ''; // 提升作用域，便于在 catch 中使用
  
  try {
    const { version } = req.body;
    const installDir = getInstallDir();
    const cloudflaredPath = getCloudflaredPath();
    
    // 确定平台和架构
    const platform = os.platform();
    const arch = os.arch();
    
    let fileName;
    
    // 构建下载 URL
    if (platform === 'linux') {
      if (arch === 'x64') {
        fileName = 'cloudflared-linux-amd64';
      } else if (arch === 'arm64') {
        fileName = 'cloudflared-linux-arm64';
      } else {
        return res.status(400).json({ error: '不支持的架构', arch });
      }
    } else if (platform === 'darwin') {
      if (arch === 'x64') {
        fileName = 'cloudflared-darwin-amd64.tgz';
      } else if (arch === 'arm64') {
        fileName = 'cloudflared-darwin-amd64.tgz'; // macOS 使用通用二进制
      } else {
        return res.status(400).json({ error: '不支持的架构', arch });
      }
    } else if (platform === 'win32') {
      fileName = 'cloudflared-windows-amd64.exe';
    } else {
      return res.status(400).json({ error: '不支持的操作系统', platform });
    }
    
    // 使用指定版本或最新版本
    const versionTag = version || 'latest';
    downloadUrl = `https://github.com/cloudflare/cloudflared/releases/${versionTag === 'latest' ? 'latest/download' : `download/${versionTag}`}/${fileName}`;
    
    console.log('下载 URL:', downloadUrl);
    
    // 创建安装目录
    await fs.mkdir(installDir, { recursive: true });
    
    // 下载文件
    console.log('开始下载 cloudflared...');
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 300000, // 5 分钟超时
      maxRedirects: 5,
      headers: {
        'User-Agent': 'cf-linux-app'
      }
    });
    
    console.log('下载响应状态:', response.status);
    
    // 保存文件（使用 ES Module 的 fs）
    const tempPath = cloudflaredPath + '.tmp';
    const { createWriteStream } = await import('fs');
    const writer = createWriteStream(tempPath);
    
    let downloadedBytes = 0;
    const totalBytes = parseInt(response.headers['content-length'] || '0');
    console.log('文件大小:', totalBytes, 'bytes (', (totalBytes / 1024 / 1024).toFixed(2), 'MB)');
    
    console.log('开始写入文件...');
    
    // 先设置 pipe，再监听事件
    response.data.pipe(writer);
    
    // 监听下载进度
    let lastLoggedMB = 0;
    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const currentMB = Math.floor(downloadedBytes / (1024 * 1024));
      
      // 每下载 5MB 输出一次进度
      if (currentMB > lastLoggedMB && currentMB % 5 === 0) {
        const progress = totalBytes > 0 ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : 0;
        console.log(`下载进度: ${progress}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB / ${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
        lastLoggedMB = currentMB;
      }
    });
    
    // 等待写入完成
    await new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('文件写入完成，总大小:', (downloadedBytes / 1024 / 1024).toFixed(2), 'MB');
        resolve();
      });
      writer.on('error', (err) => {
        console.error('文件写入错误:', err);
        reject(err);
      });
      response.data.on('error', (err) => {
        console.error('下载流错误:', err);
        reject(err);
      });
    });
    
    console.log('下载完成，移动文件...');
    
    // 移动到最终位置
    await fs.rename(tempPath, cloudflaredPath);
    console.log('文件已移动到:', cloudflaredPath);
    
    // 设置执行权限 (Linux/macOS)
    if (platform !== 'win32') {
      await fs.chmod(cloudflaredPath, 0o755);
      console.log('已设置执行权限');
    }
    
    console.log('验证安装...');
    
    // 验证安装
    const { stdout } = await execAsync(`${cloudflaredPath} --version`);
    const installedVersion = stdout.trim().split(' ')[2] || '未知版本';
    
    console.log('安装成功，版本:', installedVersion);
    
    res.json({ 
      message: 'cloudflared 安装成功',
      version: installedVersion,
      path: cloudflaredPath
    });
  } catch (error) {
    console.error('安装失败:', error);
    
    // 提供更详细的错误信息
    let errorMessage = error.message;
    let errorDetails = '';
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('ETIMEDOUT')) {
      errorMessage = '下载超时：无法连接到 GitHub';
      errorDetails = '可能的原因：\n' +
        '1. 网络连接不稳定\n' +
        '2. 防火墙阻止了连接\n' +
        '3. GitHub 访问受限\n\n' +
        '建议：\n' +
        '1. 检查网络连接\n' +
        '2. 使用代理或 VPN\n' +
        '3. 手动下载并安装 cloudflared';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '连接被拒绝';
      errorDetails = '无法连接到下载服务器';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'DNS 解析失败';
      errorDetails = '无法解析 GitHub 域名';
    }
    
    res.status(500).json({ 
      error: '安装失败', 
      message: errorMessage,
      details: errorDetails,
      downloadUrl: downloadUrl || '未知'
    });
  }
});

/**
 * DELETE /api/cloudflared/uninstall
 * 卸载 cloudflared
 */
router.delete('/uninstall', async (req, res) => {
  try {
    const cloudflaredPath = getCloudflaredPath();
    await fs.unlink(cloudflaredPath);
    
    res.json({ message: 'cloudflared 已卸载' });
  } catch (error) {
    res.status(500).json({ error: '卸载失败', message: error.message });
  }
});

/**
 * GET /api/cloudflared/versions
 * 获取可用版本列表
 */
router.get('/versions', async (req, res) => {
  try {
    // 从 GitHub API 获取版本列表
    const response = await axios.get('https://api.github.com/repos/cloudflare/cloudflared/releases', {
      headers: {
        'User-Agent': 'cf-linux-app',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    });
    
    // 提取版本号
    const versions = response.data
      .filter(release => !release.prerelease && !release.draft)
      .map(release => release.tag_name)
      .slice(0, 20); // 只返回最新的 20 个版本
    
    res.json(versions);
  } catch (error) {
    console.error('获取版本列表失败:', error.message);
    res.status(500).json({ error: '获取版本列表失败', message: error.message });
  }
});

export default router;
