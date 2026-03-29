/**
 * 统一错误码定义
 * 格式：模块(2位) + 类型(2位) + 序号(2位)
 */

const ErrorCodes = {
  // 通用错误 (00xx)
  SUCCESS: { code: 0, message: '成功' },
  UNKNOWN_ERROR: { code: 1, message: '未知错误' },
  INVALID_PARAMS: { code: 2, message: '参数错误' },
  UNAUTHORIZED: { code: 3, message: '未授权' },
  FORBIDDEN: { code: 4, message: '禁止访问' },
  NOT_FOUND: { code: 5, message: '资源不存在' },
  
  // 认证相关错误 (10xx)
  AUTH_INVALID_CREDENTIALS: { code: 1001, message: '用户名或密码错误' },
  AUTH_USER_NOT_FOUND: { code: 1002, message: '用户不存在' },
  AUTH_USER_EXISTS: { code: 1003, message: '用户已存在' },
  AUTH_TOKEN_INVALID: { code: 1004, message: 'Token 无效' },
  AUTH_TOKEN_EXPIRED: { code: 1005, message: 'Token 已过期' },
  AUTH_PASSWORD_WEAK: { code: 1006, message: '密码强度不足' },
  AUTH_OLD_PASSWORD_WRONG: { code: 1007, message: '原密码错误' },
  AUTH_CANNOT_DELETE_LAST_ADMIN: { code: 1008, message: '不能删除最后一个管理员' },
  AUTH_TOO_MANY_ATTEMPTS: { code: 1009, message: '登录失败次数过多，请稍后再试' },
  AUTH_ACCOUNT_LOCKED: { code: 1010, message: '账号已被锁定' },
  
  // Cloudflared 相关错误 (20xx)
  CLOUDFLARED_NOT_INSTALLED: { code: 2001, message: 'cloudflared 未安装' },
  CLOUDFLARED_INSTALL_FAILED: { code: 2002, message: 'cloudflared 安装失败' },
  CLOUDFLARED_VERSION_ERROR: { code: 2003, message: '获取版本失败' },
  
  // Tunnel 相关错误 (30xx)
  TUNNEL_NOT_FOUND: { code: 3001, message: 'Tunnel 不存在' },
  TUNNEL_CREATE_FAILED: { code: 3002, message: '创建 Tunnel 失败' },
  TUNNEL_DELETE_FAILED: { code: 3003, message: '删除 Tunnel 失败' },
  TUNNEL_START_FAILED: { code: 3004, message: '启动 Tunnel 失败' },
  TUNNEL_STOP_FAILED: { code: 3005, message: '停止 Tunnel 失败' },
  TUNNEL_ALREADY_RUNNING: { code: 3006, message: 'Tunnel 已在运行' },
  TUNNEL_NOT_RUNNING: { code: 3007, message: 'Tunnel 未运行' },
  TUNNEL_CONFIG_INVALID: { code: 3008, message: 'Tunnel 配置无效' },
  
  // DNS 相关错误 (40xx)
  DNS_ZONE_NOT_FOUND: { code: 4001, message: 'DNS Zone 不存在' },
  DNS_RECORD_CREATE_FAILED: { code: 4002, message: '创建 DNS 记录失败' },
  DNS_RECORD_DELETE_FAILED: { code: 4003, message: '删除 DNS 记录失败' },
  
  // 凭证相关错误 (50xx)
  CRED_INVALID: { code: 5001, message: '凭证无效' },
  CRED_SAVE_FAILED: { code: 5002, message: '保存凭证失败' },
  CRED_LOAD_FAILED: { code: 5003, message: '加载凭证失败' },
  
  // 文件相关错误 (60xx)
  FILE_NOT_FOUND: { code: 6001, message: '文件不存在' },
  FILE_READ_FAILED: { code: 6002, message: '读取文件失败' },
  FILE_WRITE_FAILED: { code: 6003, message: '写入文件失败' },
  FILE_DELETE_FAILED: { code: 6004, message: '删除文件失败' },
};

/**
 * 创建标准错误响应
 */
function createError(errorCode, customMessage = null, data = null) {
  const error = ErrorCodes[errorCode] || ErrorCodes.UNKNOWN_ERROR;
  
  return {
    success: false,
    code: error.code,
    message: customMessage || error.message,
    data: data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建标准成功响应
 */
function createSuccess(data = null, message = '操作成功') {
  return {
    success: true,
    code: 0,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('错误:', err);
  
  // 如果错误已经是标准格式，直接返回
  if (err.code !== undefined && err.success === false) {
    return res.status(err.statusCode || 500).json(err);
  }
  
  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(createError('AUTH_TOKEN_INVALID'));
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(createError('AUTH_TOKEN_EXPIRED'));
  }
  
  // 默认错误
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json(createError('UNKNOWN_ERROR', err.message));
}

/**
 * 包装异步路由处理器，自动捕获错误
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export {
  ErrorCodes,
  createError,
  createSuccess,
  errorHandler,
  asyncHandler
};
