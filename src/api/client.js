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

  async install() {
    return await request('/cloudflared/install', { method: 'POST' });
  },

  async installVersion(version) {
    return await request('/cloudflared/install', {
      method: 'POST',
      body: JSON.stringify({ version }),
    });
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
