/**
 * cloudflared 管理路由
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import axios from 'axios';

const execAsync = promisify(exec);
const router = express.Router();

// 下载源列表 - 按优先级排序
const DOWNLOAD_SOURCES = [
  'https://github.com/cloudflare/cloudflared/releases/',                      // GitHub 官方源
  'https://ghfast.top/https://github.com/cloudflare/cloudflared/releases/',  // ghfast 加速
  'https://gh-proxy.org/https://github.com/cloudflare/cloudflared/releases/', // gh-proxy 加速
  'https://hk.gh-proxy.org/https://github.com/cloudflare/cloudflared/releases/', // 香港节点加速
];

// 获取安装目录
function getInstallDir() {
  return path.join(os.homedir(), '.cf_tunnel', 'bin');
}

// 获取 cloudflared 路径
function getCloudflaredPath() {
  return path.join(getInstallDir(), 'cloudflared');
}

/**
 * 从多个源尝试下载文件
 * @param {string} versionPath - 版本路径，如 'latest/download' 或 '2024.1.0'
 * @param {string} fileName - 文件名
 * @returns {Promise<Buffer>} 下载的文件数据
 */
async function downloadWithFallback(versionPath, fileName) {
  let lastError = null;
  
  for (let i = 0; i < DOWNLOAD_SOURCES.length; i++) {
    const source = DOWNLOAD_SOURCES[i];
    const url = `${source}${versionPath}/${fileName}`;
    
    console.log(`[下载源 ${i + 1}/${DOWNLOAD_SOURCES.length}] 尝试: ${source}`);
    
    try {
      // 尝试连接并下载
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer', // 使用 arraybuffer 而不是 stream，简化处理
        timeout: 60000, // 60 秒超时
        maxRedirects: 5,
        headers: {
          'User-Agent': 'cf-linux-app',
          'Accept': 'application/octet-stream'
        },
        // 添加进度回调
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // 每 10% 输出一次进度
            if (percentCompleted % 10 === 0) {
              console.log(`[下载源 ${i + 1}] 进度: ${percentCompleted}% (${(progressEvent.loaded / 1024 / 1024).toFixed(2)} MB / ${(progressEvent.total / 1024 / 1024).toFixed(2)} MB)`);
            }
          }
        }
      });
      
      if (response.status === 200 && response.data) {
        console.log(`[下载源 ${i + 1}] ✅ 下载成功，文件大小: ${(response.data.byteLength / 1024 / 1024).toFixed(2)} MB`);
        return Buffer.from(response.data);
      } else {
        lastError = new Error(`HTTP ${response.status}`);
        console.log(`[下载源 ${i + 1}] ❌ 失败: HTTP ${response.status}`);
      }
    } catch (error) {
      lastError = error;
      const errorMsg = error.code || error.message;
      console.log(`[下载源 ${i + 1}] ❌ 失败: ${errorMsg}`);
      
      // 如果不是最后一个源，继续尝试下一个
      if (i < DOWNLOAD_SOURCES.length - 1) {
        console.log(`[下载源 ${i + 1}] 切换到下一个源...`);
        continue;
      }
    }
  }
  
  // 所有源都失败了
  throw new Error(`所有下载源均失败。最后错误: ${lastError?.message || '未知错误'}\n\n建议：\n1. 检查网络连接\n2. 使用代理或 VPN\n3. 手动下载: https://github.com/cloudflare/cloudflared/releases`);
}

/**
 * 从多个源尝试下载文件（带进度回调）
 * @param {string} versionPath - 版本路径，如 'latest/download' 或 '2024.1.0'
 * @param {string} fileName - 文件名
 * @param {Function} onProgress - 进度回调函数 (progress: 0-100, message: string)
 * @returns {Promise<Buffer>} 下载的文件数据
 */
async function downloadWithFallbackProgress(versionPath, fileName, onProgress) {
  let lastError = null;
  
  for (let i = 0; i < DOWNLOAD_SOURCES.length; i++) {
    const source = DOWNLOAD_SOURCES[i];
    const url = `${source}${versionPath}/${fileName}`;
    
    const sourceMsg = `尝试下载源 ${i + 1}/${DOWNLOAD_SOURCES.length}`;
    console.log(`[下载源 ${i + 1}/${DOWNLOAD_SOURCES.length}] 尝试: ${source}`);
    onProgress(0, sourceMsg);
    
    try {
      // 用于控制进度更新频率
      let lastReportedProgress = -1;
      
      // 尝试连接并下载
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        timeout: 120000, // 120 秒超时
        maxRedirects: 5,
        headers: {
          'User-Agent': 'cf-linux-app',
          'Accept': 'application/octet-stream'
        },
        // 添加流式进度回调
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            // 已知总大小：计算精确百分比
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            const loadedMB = (progressEvent.loaded / 1024 / 1024).toFixed(2);
            const totalMB = (progressEvent.total / 1024 / 1024).toFixed(2);
            
            // 只在进度变化至少 5% 或达到 100% 时更新（避免过于频繁）
            if (percentCompleted !== lastReportedProgress && 
                (percentCompleted - lastReportedProgress >= 5 || percentCompleted >= 100)) {
              lastReportedProgress = percentCompleted;
              const message = `下载中 ${loadedMB}MB / ${totalMB}MB (${percentCompleted}%)`;
              console.log(`[下载源 ${i + 1}] 进度: ${percentCompleted}% (${loadedMB} MB / ${totalMB} MB)`);
              onProgress(percentCompleted, message);
            }
          } else {
            // 未知总大小：根据已下载量估算进度
            const loadedMB = (progressEvent.loaded / 1024 / 1024).toFixed(2);
            let estimatedProgress = 50; // 默认中间进度
            
            // 根据已下载大小估算进度
            if (progressEvent.loaded < 10 * 1024 * 1024) {
              estimatedProgress = 10;
            } else if (progressEvent.loaded < 50 * 1024 * 1024) {
              estimatedProgress = 50;
            } else {
              estimatedProgress = 90;
            }
            
            // 只在进度变化时更新
            if (estimatedProgress !== lastReportedProgress) {
              lastReportedProgress = estimatedProgress;
              const message = `下载中 ${loadedMB}MB`;
              console.log(`[下载源 ${i + 1}] 进度: ${loadedMB} MB (估算 ${estimatedProgress}%)`);
              onProgress(estimatedProgress, message);
            }
          }
        }
      });
      
      if (response.status === 200 && response.data) {
        const sizeMB = (response.data.byteLength / 1024 / 1024).toFixed(2);
        console.log(`[下载源 ${i + 1}] ✅ 下载成功，文件大小: ${sizeMB} MB`);
        onProgress(100, `下载完成 (${sizeMB}MB)`);
        return Buffer.from(response.data);
      } else {
        lastError = new Error(`HTTP ${response.status}`);
        console.log(`[下载源 ${i + 1}] ❌ 失败: HTTP ${response.status}`);
        onProgress(0, `下载源 ${i + 1} 失败: HTTP ${response.status}`);
      }
    } catch (error) {
      lastError = error;
      const errorMsg = error.code || error.message;
      console.log(`[下载源 ${i + 1}] ❌ 失败: ${errorMsg}`);
      onProgress(0, `下载源 ${i + 1} 失败: ${errorMsg}`);
      
      // 如果不是最后一个源，继续尝试下一个
      if (i < DOWNLOAD_SOURCES.length - 1) {
        console.log(`[下载源 ${i + 1}] 切换到下一个源...`);
        onProgress(0, `切换到下载源 ${i + 2}...`);
        continue;
      }
    }
  }
  
  // 所有源都失败了
  throw new Error(`所有下载源均失败。最后错误: ${lastError?.message || '未知错误'}\n\n建议：\n1. 检查网络连接\n2. 使用代理或 VPN\n3. 手动下载: https://github.com/cloudflare/cloudflared/releases`);
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
 * 安装 cloudflared（使用 SSE 实时推送进度）
 */
router.post('/install', async (req, res) => {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
  
  // 发送进度事件的辅助函数
  const sendProgress = (progress, message, data = {}) => {
    const event = {
      progress,
      message,
      ...data
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  
  // 发送错误事件
  const sendError = (error, details = '') => {
    const event = {
      error: true,
      message: error,
      details
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
  };
  
  // 发送完成事件
  const sendComplete = (data) => {
    const event = {
      complete: true,
      ...data
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
  };
  
  try {
    const { version } = req.body;
    const installDir = getInstallDir();
    const cloudflaredPath = getCloudflaredPath();
    
    // 确定平台和架构
    const platform = os.platform();
    const arch = os.arch();
    
    sendProgress(5, `开始安装 (平台: ${platform}, 架构: ${arch})`);
    console.log(`开始安装 cloudflared (平台: ${platform}, 架构: ${arch})`);
    
    let fileName;
    
    // 构建文件名
    if (platform === 'linux') {
      if (arch === 'x64') {
        fileName = 'cloudflared-linux-amd64';
      } else if (arch === 'arm64') {
        fileName = 'cloudflared-linux-arm64';
      } else {
        return sendError('不支持的架构', `架构: ${arch}`);
      }
    } else if (platform === 'darwin') {
      if (arch === 'x64') {
        fileName = 'cloudflared-darwin-amd64.tgz';
      } else if (arch === 'arm64') {
        fileName = 'cloudflared-darwin-amd64.tgz'; // macOS 使用通用二进制
      } else {
        return sendError('不支持的架构', `架构: ${arch}`);
      }
    } else if (platform === 'win32') {
      fileName = 'cloudflared-windows-amd64.exe';
    } else {
      return sendError('不支持的操作系统', `平台: ${platform}`);
    }
    
    // 使用指定版本或最新版本
    const versionTag = version || 'latest';
    const versionPath = versionTag === 'latest' ? 'latest/download' : `download/${versionTag}`;
    
    sendProgress(10, `准备下载 ${fileName}`);
    console.log(`目标版本: ${versionTag}, 文件名: ${fileName}`);
    
    // 创建安装目录
    await fs.mkdir(installDir, { recursive: true });
    sendProgress(15, '创建安装目录');
    console.log(`安装目录: ${installDir}`);
    
    // 使用多源下载（带进度回调）
    sendProgress(20, '开始下载...');
    console.log('开始多源下载...');
    
    const fileBuffer = await downloadWithFallbackProgress(versionPath, fileName, (progress, message) => {
      // 下载进度占 20% - 85%
      const actualProgress = 20 + Math.floor(progress * 0.65);
      sendProgress(actualProgress, message);
    });
    
    sendProgress(85, '下载完成，开始写入文件...');
    console.log('下载完成，开始写入文件...');
    
    // 写入临时文件
    const tempPath = cloudflaredPath + '.tmp';
    await fs.writeFile(tempPath, fileBuffer);
    sendProgress(90, '文件写入完成');
    console.log('临时文件写入完成');
    
    // 移动到最终位置
    await fs.rename(tempPath, cloudflaredPath);
    sendProgress(92, '文件已安装');
    console.log('文件已移动到:', cloudflaredPath);
    
    // 设置执行权限 (Linux/macOS)
    if (platform !== 'win32') {
      await fs.chmod(cloudflaredPath, 0o755);
      sendProgress(95, '已设置执行权限');
      console.log('已设置执行权限');
    }
    
    sendProgress(97, '验证安装...');
    console.log('验证安装...');
    
    // 验证安装（添加超时和错误处理）
    let installedVersion = '未知';
    try {
      // 使用更短的超时时间，避免长时间等待
      const { stdout } = await execAsync(`${cloudflaredPath} --version`, {
        timeout: 5000, // 5 秒超时
        killSignal: 'SIGKILL'
      });
      installedVersion = stdout.trim().split(' ')[2] || '未知版本';
      console.log('版本验证成功:', installedVersion);
    } catch (verifyError) {
      console.warn('版本验证失败（这是正常的）:', verifyError.message);
      // 验证失败不影响安装结果
    }
    
    console.log('安装流程完成');
    
    // 发送完成事件
    sendComplete({ 
      message: 'cloudflared 安装成功',
      version: installedVersion,
      path: cloudflaredPath,
      warning: installedVersion === '未知' ? '版本验证跳过，但文件已成功下载' : undefined
    });
  } catch (error) {
    console.error('安装失败:', error);
    
    // 提供更详细的错误信息
    let errorMessage = error.message;
    let errorDetails = '';
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      errorMessage = '下载超时';
      errorDetails = '可能的原因：\n' +
        '1. 网络连接不稳定\n' +
        '2. 防火墙阻止了连接\n' +
        '3. 下载源访问受限\n\n' +
        '建议：\n' +
        '1. 检查网络连接\n' +
        '2. 使用代理或 VPN\n' +
        '3. 稍后重试';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '连接被拒绝';
      errorDetails = '无法连接到下载服务器';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'DNS 解析失败';
      errorDetails = '无法解析域名';
    }
    
    sendError(errorMessage, errorDetails);
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
