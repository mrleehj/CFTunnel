/**
 * 版本管理路由
 */

import express from 'express';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// GitHub 仓库信息
const GITHUB_REPO = 'mrleehj/CFTunnel';

// 获取本地版本
async function getLocalVersion() {
  try {
    const versionFile = path.join(__dirname, '../../VERSION');
    if (existsSync(versionFile)) {
      const version = await readFile(versionFile, 'utf-8');
      return version.trim();
    }
    
    // 如果 VERSION 文件不存在，从 package.json 读取
    const packageFile = path.join(__dirname, '../../package.json');
    const packageData = JSON.parse(await readFile(packageFile, 'utf-8'));
    return packageData.version;
  } catch (error) {
    console.error('读取本地版本失败:', error);
    return '未知';
  }
}

// 从 GitHub 获取最新版本
async function getLatestVersion() {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { timeout: 10000 }
    );
    
    return {
      version: response.data.tag_name.replace(/^v/, ''),
      releaseUrl: response.data.html_url,
      publishedAt: response.data.published_at,
      body: response.data.body
    };
  } catch (error) {
    throw new Error('无法获取最新版本信息');
  }
}

// 比较版本号
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

// 获取当前版本信息
router.get('/current', async (req, res) => {
  try {
    const version = await getLocalVersion();
    
    res.json({
      success: true,
      version,
      installDir: '/opt/cf-tunnel-manager'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取版本信息失败',
      message: error.message
    });
  }
});

// 检查更新
router.get('/check', async (req, res) => {
  try {
    const localVersion = await getLocalVersion();
    const latestInfo = await getLatestVersion();
    
    const hasUpdate = compareVersions(latestInfo.version, localVersion) > 0;
    
    res.json({
      success: true,
      current: localVersion,
      latest: latestInfo.version,
      hasUpdate,
      releaseUrl: latestInfo.releaseUrl,
      publishedAt: latestInfo.publishedAt,
      releaseNotes: latestInfo.body
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '检查更新失败',
      message: error.message
    });
  }
});

// 获取更新命令
router.get('/update-command', async (req, res) => {
  try {
    const latestInfo = await getLatestVersion();
    
    const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latestInfo.version}/cf-tunnel-manager-v${latestInfo.version}.tar.gz`;
    
    const commands = [
      '# 下载最新版本',
      `wget ${downloadUrl}`,
      '',
      '# 解压',
      `tar -xzf cf-tunnel-manager-v${latestInfo.version}.tar.gz`,
      `cd cf-tunnel-manager`,
      '',
      '# 运行更新脚本',
      'sudo bash update.sh'
    ];
    
    res.json({
      success: true,
      version: latestInfo.version,
      downloadUrl,
      commands: commands.join('\n')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取更新命令失败',
      message: error.message
    });
  }
});

export default router;
