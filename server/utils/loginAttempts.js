/**
 * 登录失败次数限制管理
 * 使用内存存储，重启后清空
 */

// 存储登录尝试记录
// 格式: { username: { attempts: 0, lockedUntil: null, lastAttempt: timestamp } }
const loginAttempts = new Map();

// 配置
const CONFIG = {
  MAX_ATTEMPTS: 5,           // 最大尝试次数
  LOCK_DURATION: 15 * 60 * 1000,  // 锁定时长（15分钟）
  RESET_DURATION: 60 * 60 * 1000, // 重置时长（1小时）
};

/**
 * 记录登录失败
 */
function recordFailedAttempt(username) {
  const now = Date.now();
  const record = loginAttempts.get(username) || {
    attempts: 0,
    lockedUntil: null,
    lastAttempt: now
  };
  
  // 如果距离上次尝试超过重置时长，重置计数
  if (now - record.lastAttempt > CONFIG.RESET_DURATION) {
    record.attempts = 0;
  }
  
  record.attempts++;
  record.lastAttempt = now;
  
  // 如果达到最大尝试次数，锁定账号
  if (record.attempts >= CONFIG.MAX_ATTEMPTS) {
    record.lockedUntil = now + CONFIG.LOCK_DURATION;
  }
  
  loginAttempts.set(username, record);
  
  console.log(`[登录限制] 用户 ${username} 登录失败，尝试次数: ${record.attempts}/${CONFIG.MAX_ATTEMPTS}`);
  
  return {
    attempts: record.attempts,
    maxAttempts: CONFIG.MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, CONFIG.MAX_ATTEMPTS - record.attempts),
    lockedUntil: record.lockedUntil
  };
}

/**
 * 检查账号是否被锁定
 */
function isAccountLocked(username) {
  const record = loginAttempts.get(username);
  
  if (!record || !record.lockedUntil) {
    return { locked: false };
  }
  
  const now = Date.now();
  
  // 锁定时间已过，解锁账号
  if (now >= record.lockedUntil) {
    record.attempts = 0;
    record.lockedUntil = null;
    loginAttempts.set(username, record);
    console.log(`[登录限制] 用户 ${username} 锁定时间已过，已解锁`);
    return { locked: false };
  }
  
  // 账号仍在锁定中
  const remainingTime = Math.ceil((record.lockedUntil - now) / 1000); // 秒
  console.log(`[登录限制] 用户 ${username} 账号已锁定，剩余时间: ${remainingTime}秒`);
  
  return {
    locked: true,
    lockedUntil: record.lockedUntil,
    remainingSeconds: remainingTime,
    remainingMinutes: Math.ceil(remainingTime / 60)
  };
}

/**
 * 重置登录尝试记录（登录成功时调用）
 */
function resetAttempts(username) {
  loginAttempts.delete(username);
  console.log(`[登录限制] 用户 ${username} 登录成功，已重置尝试记录`);
}

/**
 * 获取登录尝试信息
 */
function getAttemptInfo(username) {
  const record = loginAttempts.get(username);
  
  if (!record) {
    return {
      attempts: 0,
      maxAttempts: CONFIG.MAX_ATTEMPTS,
      remainingAttempts: CONFIG.MAX_ATTEMPTS,
      locked: false
    };
  }
  
  const lockStatus = isAccountLocked(username);
  
  return {
    attempts: record.attempts,
    maxAttempts: CONFIG.MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, CONFIG.MAX_ATTEMPTS - record.attempts),
    locked: lockStatus.locked,
    lockedUntil: lockStatus.lockedUntil,
    remainingSeconds: lockStatus.remainingSeconds,
    remainingMinutes: lockStatus.remainingMinutes
  };
}

/**
 * 手动解锁账号（管理员操作）
 */
function unlockAccount(username) {
  const record = loginAttempts.get(username);
  
  if (record) {
    record.attempts = 0;
    record.lockedUntil = null;
    loginAttempts.set(username, record);
    console.log(`[登录限制] 管理员手动解锁用户 ${username}`);
    return true;
  }
  
  return false;
}

/**
 * 获取所有锁定的账号
 */
function getLockedAccounts() {
  const locked = [];
  const now = Date.now();
  
  for (const [username, record] of loginAttempts.entries()) {
    if (record.lockedUntil && now < record.lockedUntil) {
      locked.push({
        username,
        attempts: record.attempts,
        lockedUntil: record.lockedUntil,
        remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000)
      });
    }
  }
  
  return locked;
}

/**
 * 清理过期的记录（定期调用）
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [username, record] of loginAttempts.entries()) {
    // 清理超过重置时长且未锁定的记录
    if (!record.lockedUntil && now - record.lastAttempt > CONFIG.RESET_DURATION) {
      loginAttempts.delete(username);
      cleaned++;
    }
    // 清理锁定时间已过的记录
    else if (record.lockedUntil && now >= record.lockedUntil) {
      loginAttempts.delete(username);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[登录限制] 清理了 ${cleaned} 条过期记录`);
  }
}

// 每小时清理一次过期记录
setInterval(cleanupExpiredRecords, 60 * 60 * 1000);

export {
  recordFailedAttempt,
  isAccountLocked,
  resetAttempts,
  getAttemptInfo,
  unlockAccount,
  getLockedAccounts,
  CONFIG
};
