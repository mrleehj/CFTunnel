import express from 'express';
import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { cacheMiddleware } from '../utils/cache.js';
import { createSuccess, createError, asyncHandler } from '../utils/errorCodes.js';

const router = express.Router();
const execAsync = promisify(exec);

// 读取 Linux 发行版信息
async function getLinuxDistro() {
  try {
    // 读取 /etc/os-release 文件
    const osReleaseContent = await fs.promises.readFile('/etc/os-release', 'utf8');
    const lines = osReleaseContent.split('\n');
    const info = {};
    
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        // 移除引号
        info[key] = value.replace(/"/g, '');
      }
    });
    
    return {
      name: info.NAME || 'Linux',
      version: info.VERSION || info.VERSION_ID || '',
      id: info.ID || '',
      prettyName: info.PRETTY_NAME || 'Linux'
    };
  } catch (error) {
    // 如果读取失败，尝试其他方法
    try {
      const { stdout } = await execAsync('lsb_release -d');
      const match = stdout.match(/Description:\s*(.+)/);
      if (match) {
        return {
          name: 'Linux',
          version: '',
          id: 'linux',
          prettyName: match[1].trim()
        };
      }
    } catch (e) {
      // 忽略错误
    }
    
    return {
      name: 'Linux',
      version: '',
      id: 'linux',
      prettyName: 'Linux'
    };
  }
}

// 获取系统信息（添加缓存，30秒过期）
router.get('/info', cacheMiddleware('system:info', 30 * 1000), asyncHandler(async (req, res) => {
  const platform = os.platform(); // 'linux', 'darwin', 'win32', etc.
  const arch = os.arch(); // 'x64', 'arm', 'arm64', etc.
  const release = os.release(); // 内核版本
  const hostname = os.hostname();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const cpus = os.cpus();
  const uptime = os.uptime();

  // 格式化操作系统名称
  let osName = 'Unknown';
  let osVersion = '';
  let osPrettyName = 'Unknown';
  let osDisplayName = 'Unknown'; // 用于显示的简化名称
  let platformName = 'Unknown'; // 平台名称（Linux, macOS, Windows）
  
  if (platform === 'linux') {
    // 获取 Linux 发行版信息
    const distro = await getLinuxDistro();
    osName = distro.name;
    osVersion = distro.version;
    osPrettyName = distro.prettyName;
    platformName = 'Linux';
    
    // 简化发行版名称
    let simpleName = osName;
    if (osName.includes('Debian')) simpleName = 'Debian';
    else if (osName.includes('Ubuntu')) simpleName = 'Ubuntu';
    else if (osName.includes('CentOS')) simpleName = 'CentOS';
    else if (osName.includes('Red Hat')) simpleName = 'RHEL';
    else if (osName.includes('Fedora')) simpleName = 'Fedora';
    else if (osName.includes('openSUSE')) simpleName = 'openSUSE';
    else if (osName.includes('Arch')) simpleName = 'Arch Linux';
    else if (osName.includes('Alpine')) simpleName = 'Alpine';
    
    // 提取主版本号（如 "12 (bookworm)" -> "12", "22.04.3 LTS" -> "22.04"）
    let mainVersion = '';
    if (osVersion) {
      const versionMatch = osVersion.match(/^(\d+(?:\.\d+)?)/);
      if (versionMatch) {
        mainVersion = versionMatch[1];
      }
    }
    
    // 组合显示名称
    osDisplayName = mainVersion ? `${simpleName} ${mainVersion}` : simpleName;
    
  } else if (platform === 'darwin') {
    osName = 'macOS';
    osPrettyName = 'macOS';
    osDisplayName = 'macOS';
    platformName = 'macOS';
  } else if (platform === 'win32') {
    osName = 'Windows';
    osPrettyName = 'Windows';
    osDisplayName = 'Windows';
    platformName = 'Windows';
  } else if (platform === 'freebsd') {
    osName = 'FreeBSD';
    osPrettyName = 'FreeBSD';
    osDisplayName = 'FreeBSD';
    platformName = 'FreeBSD';
  } else {
    osName = platform;
    osPrettyName = platform;
    osDisplayName = platform;
    platformName = platform;
  }

  // 格式化架构名称
  let archName = arch;
  if (arch === 'x64') {
    archName = 'x64';
  } else if (arch === 'arm64') {
    archName = 'ARM64';
  } else if (arch === 'arm') {
    archName = 'ARM';
  }

  res.json(createSuccess({
    os: osName,
    osVersion: osVersion,
    osDisplayName: osDisplayName,  // 新增：用于显示的简化名称（如 "Debian 12"）
    osPrettyName: osPrettyName,
    platformName: platformName,    // 新增：平台名称（如 "Linux"）
    arch: archName,
    platform: platform,
    kernelRelease: release,
    hostname: hostname,
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model || 'Unknown',
    totalMemory: totalMemory,
    freeMemory: freeMemory,
    usedMemory: totalMemory - freeMemory,
    uptime: uptime,
    nodeVersion: process.version
  }, '获取系统信息成功'));
}));

export default router;
