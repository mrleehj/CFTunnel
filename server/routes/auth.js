/**
 * 认证路由
 */

import express from 'express';
import { verifyUser, changePassword, getAllUsers, createUser, deleteUser } from '../utils/userManager.js';
import { generateToken } from '../utils/auth.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { createError, createSuccess, asyncHandler } from '../utils/errorCodes.js';
import { 
  recordFailedAttempt, 
  isAccountLocked, 
  resetAttempts, 
  getAttemptInfo,
  unlockAccount,
  getLockedAccounts 
} from '../utils/loginAttempts.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  // 验证输入
  if (!username || !password) {
    return res.status(400).json(createError('INVALID_PARAMS', '用户名和密码不能为空'));
  }
  
  // 检查账号是否被锁定
  const lockStatus = isAccountLocked(username);
  if (lockStatus.locked) {
    return res.status(429).json(createError(
      'AUTH_ACCOUNT_LOCKED',
      `账号已被锁定，请在 ${lockStatus.remainingMinutes} 分钟后重试`,
      {
        remainingSeconds: lockStatus.remainingSeconds,
        remainingMinutes: lockStatus.remainingMinutes,
        lockedUntil: lockStatus.lockedUntil
      }
    ));
  }
  
  // 验证用户凭证
  const user = await verifyUser(username, password);
  
  if (!user) {
    // 记录登录失败
    const attemptInfo = recordFailedAttempt(username);
    
    return res.status(401).json(createError(
      'AUTH_INVALID_CREDENTIALS',
      attemptInfo.remainingAttempts > 0 
        ? `用户名或密码错误，剩余尝试次数: ${attemptInfo.remainingAttempts}`
        : `登录失败次数过多，账号已被锁定 15 分钟`,
      {
        attempts: attemptInfo.attempts,
        maxAttempts: attemptInfo.maxAttempts,
        remainingAttempts: attemptInfo.remainingAttempts
      }
    ));
  }
  
  // 登录成功，重置尝试记录
  resetAttempts(username);
  
  // 生成 token
  const token = generateToken(user);
  
  res.json(createSuccess({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  }, '登录成功'));
}));

/**
 * POST /api/auth/logout
 * 用户登出（主要在前端清除 token）
 */
router.post('/logout', authenticate, (req, res) => {
  res.json(createSuccess(null, '登出成功'));
});

/**
 * GET /api/auth/verify
 * 验证 token 有效性
 */
router.get('/verify', authenticate, (req, res) => {
  res.json(createSuccess({ user: req.user }, 'Token 有效'));
});

/**
 * POST /api/auth/change-password
 * 修改密码
 */
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  // 验证输入
  if (!oldPassword || !newPassword) {
    return res.status(400).json(createError('INVALID_PARAMS', '原密码和新密码不能为空'));
  }
  
  // 修改密码（包含复杂度验证）
  await changePassword(req.user.id, oldPassword, newPassword);
  
  res.json(createSuccess(null, '密码修改成功，请重新登录'));
}));

/**
 * GET /api/auth/users
 * 获取所有用户（管理员）
 */
router.get('/users', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const users = await getAllUsers();
  res.json(createSuccess({ users }, '获取用户列表成功'));
}));

/**
 * POST /api/auth/users
 * 创建用户（管理员）
 */
router.post('/users', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { username, password, role } = req.body;
  
  // 验证输入
  if (!username || !password) {
    return res.status(400).json(createError('INVALID_PARAMS', '用户名和密码不能为空'));
  }
  
  // 创建用户（包含密码复杂度验证）
  const user = await createUser(username, password, role || 'user');
  
  res.json(createSuccess({ user }, '用户创建成功'));
}));

/**
 * DELETE /api/auth/users/:id
 * 删除用户（管理员）
 */
router.delete('/users/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 不允许删除自己
  if (id === req.user.id) {
    return res.status(400).json(createError('FORBIDDEN', '不能删除自己的账号'));
  }
  
  await deleteUser(id);
  
  res.json(createSuccess(null, '用户删除成功'));
}));

/**
 * GET /api/auth/login-attempts/:username
 * 获取登录尝试信息（管理员）
 */
router.get('/login-attempts/:username', authenticate, requireAdmin, (req, res) => {
  const { username } = req.params;
  const info = getAttemptInfo(username);
  res.json(createSuccess({ attemptInfo: info }, '获取登录尝试信息成功'));
});

/**
 * POST /api/auth/unlock/:username
 * 解锁账号（管理员）
 */
router.post('/unlock/:username', authenticate, requireAdmin, (req, res) => {
  const { username } = req.params;
  const unlocked = unlockAccount(username);
  
  if (unlocked) {
    res.json(createSuccess(null, `账号 ${username} 已解锁`));
  } else {
    res.json(createSuccess(null, `账号 ${username} 未被锁定`));
  }
});

/**
 * GET /api/auth/locked-accounts
 * 获取所有锁定的账号（管理员）
 */
router.get('/locked-accounts', authenticate, requireAdmin, (req, res) => {
  const locked = getLockedAccounts();
  res.json(createSuccess({ accounts: locked }, '获取锁定账号列表成功'));
});

export default router;
