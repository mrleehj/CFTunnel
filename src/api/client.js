/**
 * API 客户端 - Linux Web 版本
 * 
 * 通过 HTTP 请求与后端服务器通信
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * 通用请求函数
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    // 添加认证 token（登录接口除外）
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (!endpoint.includes('/auth/login')) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 处理 401 未授权错误
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      throw new Error('未授权，请重新登录');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '请求失败' }));
      // 统一错误格式处理
      const errorMessage = error.message || error.error || '请求失败';
      throw new Error(errorMessage);
    }

    // 检查响应类型
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      // 返回文本内容
      return await response.text();
    }
  } catch (error) {
    console.error('API 请求失败:', error);
    throw error;
  }
}

/**
 * cloudflared 管理 API
 */
export const cloudflared = {
  async checkVersion() {
    return await request('/cloudflared/version');
  },

  /**
   * 安装 cloudflared（使用 SSE 实时进度）
   * @param {Function} onProgress - 进度回调函数 (progress: number, message: string)
   * @param {string} version - 可选的版本号
   * @returns {Promise<Object>} 安装结果
   */
  async install(onProgress = null, version = null) {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('auth_token');
      const url = `${API_BASE}/cloudflared/install`;
      
      // 使用 fetch 发送 POST 请求
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ version }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        // 检查是否是 SSE 响应
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
          // 处理 SSE 流
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          
          const processStream = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                return;
              }
              
              // 解码数据
              buffer += decoder.decode(value, { stream: true });
              
              // 按行分割
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // 保留最后一个不完整的行
              
              // 处理每一行
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.substring(6));
                    
                    // 处理进度事件
                    if (data.progress !== undefined && onProgress) {
                      onProgress(data.progress, data.message);
                    }
                    
                    // 处理错误事件
                    if (data.error) {
                      reject(new Error(data.message + (data.details ? '\n\n' + data.details : '')));
                      return;
                    }
                    
                    // 处理完成事件
                    if (data.complete) {
                      resolve(data);
                      return;
                    }
                  } catch (e) {
                    console.error('解析 SSE 数据失败:', e, line);
                  }
                }
              }
              
              // 继续读取
              processStream();
            }).catch(error => {
              reject(error);
            });
          };
          
          processStream();
        } else {
          // 不是 SSE 响应，按普通 JSON 处理
          response.json().then(resolve).catch(reject);
        }
      })
      .catch(error => {
        reject(error);
      });
    });
  },

  async installVersion(version, onProgress = null) {
    return await cloudflared.install(onProgress, version);
  },

  async uninstall() {
    return await request('/cloudflared/uninstall', { method: 'DELETE' });
  },

  async listVersions() {
    return await request('/cloudflared/versions');
  },

  async readCredentials(tunnelId, accountId, apiToken) {
    const params = new URLSearchParams();
    if (accountId) params.append('account_id', accountId);
    if (apiToken) params.append('api_token', apiToken);
    const queryString = params.toString();
    return await request(`/debug/credentials/${tunnelId}${queryString ? '?' + queryString : ''}`);
  },
};

/**
 * 凭证管理 API
 */
export const credentials = {
  async save(accountId, apiToken) {
    return await request('/credentials', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, api_token: apiToken }),
    });
  },

  async load() {
    return await request('/credentials');
  },

  async test(accountId, apiToken) {
    return await request('/credentials/test', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, api_token: apiToken }),
    });
  },
};

/**
 * Tunnel 管理 API
 */
export const tunnels = {
  async list(accountId, apiToken) {
    return await request('/tunnels', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, api_token: apiToken }),
    });
  },

  async create(accountId, apiToken, name) {
    return await request('/tunnels/create', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, api_token: apiToken, name }),
    });
  },

  async delete(accountId, apiToken, id) {
    return await request(`/tunnels/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ account_id: accountId, api_token: apiToken }),
    });
  },

  async getConfig(accountId, apiToken, id) {
    return await request(`/tunnels/${id}/config`, {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, api_token: apiToken }),
    });
  },

  async updateConfig(accountId, apiToken, id, routes) {
    return await request(`/tunnels/${id}/config`, {
      method: 'PUT',
      body: JSON.stringify({ account_id: accountId, api_token: apiToken, routes }),
    });
  },

  async start(id, name, routes, customDns = "", protocol = "quic") {
    return await request('/tunnels/start', {
      method: 'POST',
      body: JSON.stringify({ 
        tunnel_id: id, 
        tunnel_name: name, 
        routes, 
        custom_dns: customDns, 
        protocol 
      }),
    });
  },

  async stop(tunnelId) {
    return await request('/tunnels/stop', { 
      method: 'POST',
      body: JSON.stringify({ tunnel_id: tunnelId }),
    });
  },

  async getStatus() {
    return await request('/tunnels/status');
  },
};

/**
 * 日志管理 API
 */
export const logs = {
  async getInstall() {
    return await request('/logs/install');
  },

  async getTunnel(name) {
    return await request(`/logs/tunnel/${name}`);
  },

  async getTunnelLog(name) {
    return await request(`/logs/tunnel/${name}`);
  },

  async clearInstall() {
    return await request('/logs/install', { method: 'DELETE' });
  },

  async clearTunnel(name) {
    return await request(`/logs/tunnel/${name}`, { method: 'DELETE' });
  },
};

/**
 * DNS 管理 API
 */
export const dns = {
  async getZones(apiToken) {
    return await request('/dns/zones', {
      method: 'POST',
      body: JSON.stringify({ api_token: apiToken }),
    });
  },

  async createRecord(zoneId, apiToken, subdomain, tunnelId) {
    return await request('/dns/records', {
      method: 'POST',
      body: JSON.stringify({ 
        zone_id: zoneId, 
        api_token: apiToken, 
        subdomain, 
        tunnel_id: tunnelId 
      }),
    });
  },
};

/**
 * 调试工具 API
 */
export const debug = {
  async readCredentials(tunnelId, accountId, apiToken) {
    const params = new URLSearchParams();
    if (accountId) params.append('account_id', accountId);
    if (apiToken) params.append('api_token', apiToken);
    const queryString = params.toString();
    return await request(`/debug/credentials/${tunnelId}${queryString ? '?' + queryString : ''}`);
  },
};

/**
 * 默认导出所有 API
 */
export default {
  cloudflared,
  credentials,
  tunnels,
  logs,
  dns,
  debug,
};

/**
 * 系统信息 API
 */
export const system = {
  async getInfo() {
    return await request('/system/info');
  },
};

/**
 * 认证 API
 */
export const auth = {
  async login(username, password) {
    return await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout() {
    return await request('/auth/logout', { method: 'POST' });
  },

  async verify() {
    return await request('/auth/verify');
  },

  async changePassword(oldPassword, newPassword) {
    return await request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  async getUsers() {
    return await request('/auth/users');
  },

  async createUser(username, password, role) {
    return await request('/auth/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  },

  async deleteUser(id) {
    return await request(`/auth/users/${id}`, { method: 'DELETE' });
  },
};
