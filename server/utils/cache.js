/**
 * API 响应缓存工具
 * 使用内存缓存，支持 TTL 和自动清理
 */

class Cache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    
    // 每 5 分钟清理一次过期缓存
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * 生成缓存键
   */
  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return sortedParams ? `${prefix}:${sortedParams}` : prefix;
  }
  
  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒），默认 5 分钟
   */
  set(key, value, ttl = 5 * 60 * 1000) {
    // 清除旧的定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // 设置缓存
    this.cache.set(key, {
      value,
      expireAt: Date.now() + ttl
    });
    
    // 设置过期定时器
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    
    this.timers.set(key, timer);
    
    console.log(`[缓存] 设置缓存: ${key}, TTL: ${ttl}ms`);
  }
  
  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值，不存在或已过期返回 null
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() > item.expireAt) {
      this.delete(key);
      return null;
    }
    
    console.log(`[缓存] 命中缓存: ${key}`);
    return item.value;
  }
  
  /**
   * 删除缓存
   */
  delete(key) {
    // 清除定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    
    // 删除缓存
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      console.log(`[缓存] 删除缓存: ${key}`);
    }
    
    return deleted;
  }
  
  /**
   * 清空所有缓存
   */
  clear() {
    // 清除所有定时器
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
    
    console.log('[缓存] 清空所有缓存');
  }
  
  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireAt) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[缓存] 清理了 ${cleaned} 条过期缓存`);
    }
  }
  
  /**
   * 获取缓存统计信息
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    
    for (const item of this.cache.values()) {
      if (now > item.expireAt) {
        expired++;
      }
    }
    
    return {
      total: this.cache.size,
      active: this.cache.size - expired,
      expired: expired
    };
  }
  
  /**
   * 检查缓存是否存在且未过期
   */
  has(key) {
    return this.get(key) !== null;
  }
}

// 创建全局缓存实例
const cache = new Cache();

/**
 * 缓存中间件工厂函数
 * @param {string} prefix - 缓存键前缀
 * @param {number} ttl - 过期时间（毫秒）
 * @param {function} keyGenerator - 自定义键生成函数
 */
function cacheMiddleware(prefix, ttl = 5 * 60 * 1000, keyGenerator = null) {
  return (req, res, next) => {
    // 只缓存 GET 请求
    if (req.method !== 'GET') {
      return next();
    }
    
    // 生成缓存键
    const key = keyGenerator 
      ? keyGenerator(req) 
      : cache.generateKey(prefix, { ...req.params, ...req.query });
    
    // 尝试从缓存获取
    const cachedData = cache.get(key);
    
    if (cachedData) {
      // 添加缓存标识
      return res.json({
        ...cachedData,
        cached: true,
        cacheKey: key
      });
    }
    
    // 劫持 res.json 方法
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // 只缓存成功的响应
      if (data && data.success !== false) {
        cache.set(key, data, ttl);
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * 清除指定前缀的所有缓存
 */
function clearCacheByPrefix(prefix) {
  let cleared = 0;
  
  for (const key of cache.cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      cleared++;
    }
  }
  
  console.log(`[缓存] 清除前缀 "${prefix}" 的缓存，共 ${cleared} 条`);
  return cleared;
}

export {
  cache,
  cacheMiddleware,
  clearCacheByPrefix
};
