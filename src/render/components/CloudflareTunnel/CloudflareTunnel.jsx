import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./CloudflareTunnel.css";

function CloudflareTunnel() {
  const [activeTab, setActiveTab] = useState("home");
  const [accountId, setAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [cloudflaredInstalled, setCloudflaredInstalled] = useState(false);
  const [cloudflaredVersion, setCloudflaredVersion] = useState("");
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState("");

  useEffect(() => {
    const savedAccountId = localStorage.getItem("cf_account_id");
    const savedApiToken = localStorage.getItem("cf_api_token");
    if (savedAccountId) setAccountId(savedAccountId);
    if (savedApiToken) setApiToken(savedApiToken);
    checkCloudflared();
  }, []);

  const showStatus = (message) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 3000);
  };

  const checkCloudflared = async () => {
    try {
      const version = await invoke("cloudflared_check_version");
      if (version) {
        setCloudflaredInstalled(true);
        setCloudflaredVersion(version);
      }
    } catch (e) {
      try {
        const response = await fetch("https://api.github.com/repos/cloudflare/cloudflared/releases/latest");
        const data = await response.json();
        const tag = data.tag_name || "unknown";
        setCloudflaredInstalled(false);
        setCloudflaredVersion(tag);
      } catch (apiError) {
        setCloudflaredInstalled(false);
        setCloudflaredVersion("unknown");
      }
    }
  };

  const handleInstallCloudflared = async () => {
    setInstalling(true);
    setInstallProgress("正在下载 cloudflared...");
    try {
      await invoke("cloudflared_install");
      setInstallProgress("正在设置权限...");
      showStatus("cloudflared 安装成功");
      await checkCloudflared();
    } catch (e) {
      setInstallProgress("");
      showStatus("安装失败: " + (e.message || e));
    }
    setInstalling(false);
    setInstallProgress("");
  };

  const handleSaveCredentials = async () => {
    if (!accountId || !apiToken) {
      showStatus("请填写 Account ID 和 API Token");
      return;
    }
    setLoading(true);
    try {
      await invoke("cloudflare_store_credentials", {
        accountId,
        apiToken,
      });
      showStatus("凭证已保存（后端）");
    } catch (e) {
      localStorage.setItem("cf_account_id", accountId);
      localStorage.setItem("cf_api_token", apiToken);
      showStatus("凭证已本地保存（回退）");
    }
    setLoading(false);
  };

  const handleTestCredentials = async () => {
    if (!accountId || !apiToken) {
      showStatus("请填写 Account ID 和 API Token");
      return;
    }
    setLoading(true);
    try {
      const result = await invoke("cloudflare_test_credentials", {
        accountId,
        apiToken,
      });
      showStatus(result ? "凭证测试通过（后端）" : "凭证测试失败");
    } catch (e) {
      try {
        const response = await fetch(
          "https://api.cloudflare.com/client/v4/accounts",
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          }
        );
        const data = await response.json();
        if (data.success) {
          showStatus("凭证测试通过（API）");
        } else {
          showStatus("凭证测试失败");
        }
      } catch (apiError) {
        showStatus("凭证测试失败（网络错误）");
      }
    }
    setLoading(false);
  };

  return (
    <div className="cf-container">
      <div className="cf-sidebar">
        <div className="cf-logo">CF Tunnel</div>
        <nav className="cf-nav">
          <button
            className={activeTab === "home" ? "active" : ""}
            onClick={() => setActiveTab("home")}
          >
            首页
          </button>
          <button
            className={activeTab === "account" ? "active" : ""}
            onClick={() => setActiveTab("account")}
          >
            账户配置
          </button>
          <button
            className={activeTab === "tunnels" ? "active" : ""}
            onClick={() => setActiveTab("tunnels")}
          >
            Tunnel 列表
          </button>
          <button
            className={activeTab === "logs" ? "active" : ""}
            onClick={() => setActiveTab("logs")}
          >
            运行日志
          </button>
          <button
            className={activeTab === "about" ? "active" : ""}
            onClick={() => setActiveTab("about")}
          >
            关于
          </button>
        </nav>
      </div>
      <div className="cf-main">
        <div className="cf-header">
          <h1>Cloudflare Tunnel</h1>
          <div className="cf-header-actions">
            <button className="cf-btn-primary">启动 Tunnel</button>
            <button className="cf-btn-secondary">停止</button>
          </div>
        </div>

        {activeTab === "home" && (
          <div className="cf-content">
            <div className="cf-status-bar">
              <span className="cf-status-indicator"></span>
              <span>运行中</span>
            </div>
            <div className="cf-cards">
              <div className="cf-card">
                <div className="cf-card-title">PID</div>
                <div className="cf-card-value">--</div>
              </div>
              <div className="cf-card">
                <div className="cf-card-title">已运行</div>
                <div className="cf-card-value">--</div>
              </div>
              <div className="cf-card">
                <div className="cf-card-title">系统架构</div>
                <div className="cf-card-value">--</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div className="cf-content">
            <h2>账户配置</h2>
            
            <div className="cf-form">
              <h3>Cloudflared 安装状态</h3>
              <div className="cf-install-status">
                {cloudflaredInstalled ? (
                  <div className="cf-installed">
                    <span className="cf-status-icon success">✓</span>
                    <span>已安装 cloudflared</span>
                    <span className="cf-version">版本: {cloudflaredVersion}</span>
                  </div>
                ) : (
                  <div className="cf-not-installed">
                    <span className="cf-status-icon warning">⚠</span>
                    <span>未安装 cloudflared</span>
                    <span className="cf-version">最新: {cloudflaredVersion}</span>
                  </div>
                )}
              </div>
              {!cloudflaredInstalled && (
                <button
                  className="cf-btn-primary cf-install-btn"
                  onClick={handleInstallCloudflared}
                  disabled={installing}
                >
                  {installing ? "安装中..." : "一键安装 cloudflared"}
                </button>
              )}
              {installProgress && (
                <div className="cf-install-progress">{installProgress}</div>
              )}
            </div>

            <div className="cf-form">
              <h3>Cloudflare 账户凭证</h3>
              <div className="cf-form-group">
                <label>Cloudflare Account ID</label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="请输入 Account ID"
                />
              </div>
              <div className="cf-form-group">
                <label>API Token</label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="请输入 API Token"
                />
              </div>
              <div className="cf-form-actions">
                <button
                  className="cf-btn-primary"
                  onClick={handleSaveCredentials}
                  disabled={loading}
                >
                  保存凭证
                </button>
                <button
                  className="cf-btn-secondary"
                  onClick={handleTestCredentials}
                  disabled={loading}
                >
                  测试凭证
                </button>
              </div>
              {status && <div className="cf-status-message">{status}</div>}
            </div>
          </div>
        )}

        {activeTab === "tunnels" && (
          <div className="cf-content">
            <h2>Tunnel 列表</h2>
            <div className="cf-empty">暂无 Tunnel，请先创建</div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="cf-content">
            <h2>运行日志</h2>
            <div className="cf-logs">
              <div className="cf-log-entry">暂无日志</div>
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="cf-content">
            <h2>关于</h2>
            <div className="cf-about">
              <p>Cloudflare Tunnel 管理工具</p>
              <p>版本: 0.1.0</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CloudflareTunnel;
