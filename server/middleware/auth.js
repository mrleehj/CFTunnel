/**
 * 认证中间件
 */

import { extractToken, verifyToken } from '../utils/auth.js';
import { getUserById } from '../utils/userManager.js';

/**
 * 认证中间件 - 验证 JWT token
 */
export async function authenticate(req, res, next) {
  try {
    // 提取 token
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        error: '未授权',
        message: '缺少认证令牌'
      });
    }
    
    // 验证 token
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({
        error: '未授权',
        message: '无效或过期的令牌'
      });
    }
    
    // 获取用户信息
    const user = await getUserById(payload.id);
    
    if (!user) {
      return res.status(401).json({
        error: '未授权',
        message: '用户不存在'
      });
    }
    
    // 将用户信息附加到请求对象
    req.user = user;
    
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({
      error: '服务器错误',
      message: '认证过程出错'
    });
  }
}

/**
 * 管理员权限中间件
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: '禁止访问',
      message: '需要管理员权限'
    });
  }
  
  next();
}
