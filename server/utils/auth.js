/**
 * JWT 认证工具
 */

import jwt from 'jsonwebtoken';

// JWT 密钥（生产环境应使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'cloudflare-tunnel-manager-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * 生成 JWT token
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * 验证 JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 从请求头中提取 token
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  // 支持 "Bearer <token>" 格式
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  // 直接返回 token
  return authHeader;
}
