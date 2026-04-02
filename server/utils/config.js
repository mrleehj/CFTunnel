/**
 * 配置管理模块
 * 统一管理应用配置，支持 Docker 环境
 */

import path from 'path';
import os from 'os';

/**
 * 获取数据目录
 * Docker 环境使用 /data
 * 传统环境使用 ~/.cf_tunnel
 */
export function getDataDir() {
  // 优先使用环境变量
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  
  // Docker 环境检测
  if (process.env.NODE_ENV === 'production' && process.env.DOCKER === 'true') {
    return '/data';
  }
  
  // 传统环境
  return path.join(os.homedir(), '.cf_tunnel');
}

/**
 * 获取用户配置目录
 * Docker 环境使用 /data/users
 * 传统环境使用 ~/.cloudflare-tunnel-manager
 */
export function getUserConfigDir() {
  // 优先使用环境变量
  if (process.env.USER_CONFIG_DIR) {
    return process.env.USER_CONFIG_DIR;
  }
  
  // Docker 环境
  if (process.env.NODE_ENV === 'production' && process.env.DOCKER === 'true') {
    return path.join(getDataDir(), 'users');
  }
  
  // 传统环境
  return path.join(os.homedir(), '.cloudflare-tunnel-manager');
}

/**
 * 获取 Tunnel 配置目录
 */
export function getTunnelConfigDir() {
  return path.join(getDataDir(), 'tunnels');
}

/**
 * 获取凭证目录
 */
export function getCredentialsDir() {
  return path.join(getDataDir(), 'credentials');
}

/**
 * 获取日志目录
 */
export function getLogsDir() {
  return path.join(getDataDir(), 'logs');
}

/**
 * 获取 cloudflared 二进制路径
 */
export function getCloudflaredPath() {
  return path.join(getDataDir(), 'cloudflared', 'cloudflared');
}

/**
 * 获取应用配置
 */
export function getAppConfig() {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    dataDir: getDataDir(),
    userConfigDir: getUserConfigDir(),
    tunnelConfigDir: getTunnelConfigDir(),
    credentialsDir: getCredentialsDir(),
    logsDir: getLogsDir(),
    cloudflaredPath: getCloudflaredPath(),
    jwtSecret: process.env.JWT_SECRET || null,
    logLevel: process.env.LOG_LEVEL || 'info',
    isDocker: process.env.DOCKER === 'true'
  };
}

/**
 * 打印配置信息（用于调试）
 */
export function printConfig() {
  const config = getAppConfig();
  console.log('\n📋 应用配置:');
  console.log('  运行环境:', config.nodeEnv);
  console.log('  监听端口:', config.port);
  console.log('  Docker 模式:', config.isDocker ? '是' : '否');
  console.log('  数据目录:', config.dataDir);
  console.log('  用户配置:', config.userConfigDir);
  console.log('  日志级别:', config.logLevel);
  console.log('');
}
