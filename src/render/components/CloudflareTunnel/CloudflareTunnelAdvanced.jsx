import React, { useEffect, useState } from "react";
import * as api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

export default function CloudflareTunnelAdvanced() {
  const [accountId, setAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [cloudflaredInstalled, setCloudflaredInstalled] = useState(false);
  const [cloudflaredVersion, setCloudflaredVersion] = useState("");
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [tauriAvailable, setTauriAvailable] = useState(false);
  const { toast } = useToast();
  
  // 版本选择
  const [availableVersions, setAvailableVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState("latest");
  const [loadingVersions, setLoadingVersions] = useState(false);
  
  // 高级配置
  const [customDns, setCustomDns] = useState("8.8.8.8,1.1.1.1");
  const [protocol, setProtocol] = useState("quic"); // quic 或 http2


  useEffect(() => {
    // 初始化函数
    const init = async () => {
      // 检测 API 可用性
      let isApiAvailable = false;
      try {
        const result = await api.cloudflared.checkVersion();
        const ver = result.version;
        isApiAvailable = true;
        setCloudflaredInstalled(ver !== "未安装");
        setCloudflaredVersion(ver);
      } catch (e) {
        console.error("检测 cloudflared 失败:", e);
        
        // 检查错误类型来判断是 API 不可用还是 cloudflared 未安装
        const errorStr = String(e).toLowerCase();
        if (errorStr.includes("not found") || 
            errorStr.includes("未安装") || 
            errorStr.includes("no such file") ||
            errorStr.includes("not installed") ||
            errorStr.includes("command not found")) {
          // cloudflared 未安装，但 API 可用
          isApiAvailable = true;
          setCloudflaredInstalled(false);
          setCloudflaredVersion("未安装");
        } else {
          // API 不可用
          isApiAvailable = false;
          setCloudflaredInstalled(false);
          setCloudflaredVersion("API 不可用");
        }
      }
      
      setTauriAvailable(isApiAvailable);
      
      // 加载可用版本列表
      if (isApiAvailable) {
        loadAvailableVersions();
      }
      
      // 加载保存的凭证
      if (isApiAvailable) {
        // 优先从后端加载
        try {
          const creds = await api.credentials.load();
          setAccountId(creds.account_id);
          setApiToken(creds.api_token);
        } catch (e) {
          // 回退到 localStorage
          const savedAccountId = localStorage.getItem("cf_account_id");
          const savedApiToken = localStorage.getItem("cf_api_token");
          if (savedAccountId) setAccountId(savedAccountId);
          if (savedApiToken) setApiToken(savedApiToken);
        }
      } else {
        // API 不可用，直接从 localStorage 加载
        const savedAccountId = localStorage.getItem("cf_account_id");
        const savedApiToken = localStorage.getItem("cf_api_token");
        if (savedAccountId) setAccountId(savedAccountId);
        if (savedApiToken) setApiToken(savedApiToken);
      }
      
      // 加载高级配置
      const savedDns = localStorage.getItem("cf_custom_dns");
      const savedProtocol = localStorage.getItem("cf_protocol");
      if (savedDns) setCustomDns(savedDns);
      if (savedProtocol) setProtocol(savedProtocol);
    };
    
    init();
  }, []);

  const loadAvailableVersions = async (forceRefresh = false) => {
    // 检查缓存
    if (!forceRefresh) {
      const cached = localStorage.getItem("cf_versions_cache");
      const cacheTime = localStorage.getItem("cf_versions_cache_time");
      
      if (cached && cacheTime) {
        const cacheAge = Date.now() - parseInt(cacheTime);
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时
        
        // 如果缓存未过期,直接使用缓存
        if (cacheAge < CACHE_DURATION) {
          try {
            const versions = JSON.parse(cached);
            setAvailableVersions(versions);
            return;
          } catch (e) {
            console.error("解析缓存失败:", e);
          }
        }
      }
    }
    
    // 缓存不存在或已过期,从 API 加载
    setLoadingVersions(true);
    
    // 显示加载提示
    if (forceRefresh) {
      toast({
        title: "正在刷新",
        description: "正在加载版本列表...",
      });
    }
    
    try {
      const result = await api.cloudflared.listVersions();
      // 后端直接返回数组
      const versions = Array.isArray(result) ? result : (result.versions || []);
      setAvailableVersions(versions);
      
      // 保存到缓存
      localStorage.setItem("cf_versions_cache", JSON.stringify(versions));
      localStorage.setItem("cf_versions_cache_time", Date.now().toString());
      
      // 刷新成功提示
      if (forceRefresh) {
        toast({
          variant: "success",
          title: "刷新成功",
          description: `已加载 ${versions.length} 个版本`,
        });
      }
    } catch (e) {
      console.error("加载版本列表失败:", e);
      
      // 如果加载失败,尝试使用过期的缓存
      const cached = localStorage.getItem("cf_versions_cache");
      if (cached) {
        try {
          const versions = JSON.parse(cached);
          setAvailableVersions(versions);
          
          // 显示降级提示
          if (forceRefresh) {
            toast({
              variant: "warning",
              title: "加载失败",
              description: "网络错误，使用本地缓存",
            });
          }
        } catch (parseErr) {
          console.error("解析缓存失败:", parseErr);
          
          // 完全失败
          if (forceRefresh) {
            toast({
              variant: "destructive",
              title: "加载失败",
              description: "无法获取版本列表",
            });
          }
        }
      } else {
        // 没有缓存可用
        if (forceRefresh) {
          toast({
            variant: "destructive",
            title: "加载失败",
            description: "无法获取版本列表",
          });
        }
      }
    } finally {
      setLoadingVersions(false);
    }
  };

  const checkCloudflared = async () => {
    // 通过尝试调用命令来检测 API 可用性
    try {
      const result = await api.cloudflared.checkVersion();
      const ver = result.version;
      setTauriAvailable(true);
      setCloudflaredInstalled(ver !== "未安装");
      setCloudflaredVersion(ver);
    } catch (e) {
      const errorStr = String(e).toLowerCase();
      if (errorStr.includes("not found") || 
          errorStr.includes("未安装") || 
          errorStr.includes("no such file") ||
          errorStr.includes("not installed") ||
          errorStr.includes("command not found")) {
        setTauriAvailable(true);
        setCloudflaredInstalled(false);
        setCloudflaredVersion("未安装");
      } else {
        setTauriAvailable(false);
        setCloudflaredInstalled(false);
        setCloudflaredVersion("Tauri 不可用");
      }
    }
  };

  const handleInstallCloudflared = async () => {
    // 使用状态变量判断 Tauri 可用性
    if (!tauriAvailable) {
      toast({
        variant: "destructive",
        title: "安装失败",
        description: "Tauri 不可用，无法安装。请确保应用正在 Tauri 环境中运行。",
      });
      return;
    }
    
    setInstalling(true);
    setInstallProgress(0);
    
    try {
      // 使用 SSE 实时进度
      const result = await api.cloudflared.install(
        (progress, message) => {
          // 实时更新进度
          setInstallProgress(progress);
          console.log(`安装进度: ${progress}% - ${message}`);
        },
        selectedVersion === "latest" ? null : selectedVersion
      );
      
      setInstallProgress(100);
      
      setTimeout(() => {
        checkCloudflared();
        setInstallProgress(0); // 重置进度条，让它消失
        toast({
          variant: "success",
          title: "安装成功",
          description: result.message || "安装完成",
        });
      }, 500); // 延长到 500ms，让用户看到 100% 的状态
    } catch (e) {
      const errorMsg = typeof e === 'string' ? e : (e.message || e.toString());
      toast({
        variant: "destructive",
        title: "安装失败",
        description: errorMsg,
      });
      setInstallProgress(0);
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstallCloudflared = async () => {
    if (!tauriAvailable) {
      toast({
        variant: "destructive",
        title: "卸载失败",
        description: "API 不可用",
      });
      return;
    }
    
    try {
      const result = await api.cloudflared.uninstall();
      toast({
        title: "卸载成功",
        description: result.message || "卸载完成",
      });
      checkCloudflared();
      // 卸载后使用缓存加载版本列表(不强制刷新)
      loadAvailableVersions(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "卸载失败",
        description: e.toString(),
      });
    }
  };

  const handleSaveCredentials = async () => {
    if (!accountId || !apiToken) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "请填写 Account ID 和 API Token",
      });
      return;
    }
    
    try {
      if (tauriAvailable) {
        // 保存到后端
        await api.credentials.save(accountId, apiToken);
        // 同时保存到 localStorage 作为备份
        localStorage.setItem("cf_account_id", accountId);
        localStorage.setItem("cf_api_token", apiToken);
        toast({
          variant: "success",
          title: "保存成功",
          description: "凭证已保存",
        });
      } else {
        // API 不可用，只保存到 localStorage
        localStorage.setItem("cf_account_id", accountId);
        localStorage.setItem("cf_api_token", apiToken);
        toast({
          variant: "success",
          title: "保存成功",
          description: "凭证已本地保存",
        });
      }
    } catch (e) {
      // 保存失败，回退到 localStorage
      localStorage.setItem("cf_account_id", accountId);
      localStorage.setItem("cf_api_token", apiToken);
      toast({
        title: "保存成功",
        description: "凭证已本地保存（后端保存失败）",
      });
      console.error("保存凭证失败:", e);
    }
  };

  const handleTestCredentials = async () => {
    if (!accountId || !apiToken) {
      toast({
        variant: "destructive",
        title: "测试失败",
        description: "请填写 Account ID 和 API Token",
      });
      return;
    }
    
    try {
      if (tauriAvailable) {
        const result = await api.credentials.test(accountId, apiToken);
        const ok = result.valid !== false;
        toast({
          title: ok ? "测试成功" : "测试失败",
          description: result.message || (ok ? "凭证测试通过" : "凭证测试失败"),
          variant: ok ? "default" : "destructive",
        });
      } else {
        throw new Error("no-api");
      }
    } catch {
      try {
        const resp = await fetch("https://api.cloudflare.com/client/v4/accounts", {
          headers: { Authorization: `Bearer ${apiToken}` },
        });
        const data = await resp.json();
        toast({
          title: data.success ? "测试成功" : "测试失败",
          description: data.success ? "凭证测试通过（API）" : "凭证测试失败",
          variant: data.success ? "default" : "destructive",
        });
      } catch {
        toast({
          variant: "destructive",
          title: "测试失败",
          description: "凭证测试失败（网络错误）",
        });
      }
    }
  };

  const handleSaveAdvancedConfig = () => {
    // 保存高级配置到 localStorage
    localStorage.setItem("cf_custom_dns", customDns);
    localStorage.setItem("cf_protocol", protocol);
    toast({
      title: "保存成功",
      description: "高级配置已保存",
    });
  };



  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cloudflare Tunnel 配置</h1>
        <p className="text-muted-foreground mt-2">配置 cloudflared 和 Cloudflare 账户凭证</p>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>cloudflared 安装状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              {cloudflaredInstalled ? (
                <>
                  <span className="text-2xl">✓</span>
                  <div className="flex-1">
                    <p className="font-medium">已安装 cloudflared</p>
                    <p className="text-sm text-muted-foreground">版本: {cloudflaredVersion}</p>
                  </div>
                  <Badge>已安装</Badge>
                </>
              ) : (
                <>
                  <span className="text-2xl">⚠</span>
                  <div className="flex-1">
                    <p className="font-medium">未安装 cloudflared</p>
                    <p className="text-sm text-muted-foreground">选择版本进行安装</p>
                  </div>
                  <Badge variant="secondary">未安装</Badge>
                </>
              )}
            </div>
            
            {!cloudflaredInstalled && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="version-select">选择版本</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => loadAvailableVersions(true)}
                      disabled={loadingVersions}
                      className="h-6 px-2 text-xs"
                    >
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                      刷新
                    </Button>
                  </div>
                  <select
                    id="version-select"
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    disabled={loadingVersions || installing}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    <option value="latest">最新版本 (推荐)</option>
                    {availableVersions.map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleInstallCloudflared} disabled={installing} className="w-full">
                  {installing ? "安装中..." : `安装 cloudflared ${selectedVersion === "latest" ? "(最新版)" : selectedVersion}`}
                </Button>
              </>
            )}
            
            {cloudflaredInstalled && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCloudflaredInstalled(false);
                    loadAvailableVersions();
                  }} 
                  className="flex-1"
                >
                  重新安装
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleUninstallCloudflared}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  卸载
                </Button>
              </div>
            )}
            
            {installProgress > 0 && installing && (
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300" 
                    style={{ width: installProgress + "%" }} 
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">{installProgress}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cloudflare 账户凭证</CardTitle>
            <CardDescription>配置您的 Cloudflare 账户信息以管理 Tunnel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-id">Cloudflare Account ID</Label>
              <Input 
                id="account-id"
                type="text" 
                value={accountId} 
                onChange={(e) => setAccountId(e.target.value)} 
                placeholder="请输入 Account ID" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-token">API Token</Label>
              <Input 
                id="api-token"
                type="password" 
                value={apiToken} 
                onChange={(e) => setApiToken(e.target.value)} 
                placeholder="请输入 API Token" 
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveCredentials} className="flex-1">保存凭证</Button>
              <Button variant="outline" onClick={handleTestCredentials} className="flex-1">测试凭证</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>高级配置</CardTitle>
            <CardDescription>配置 DNS 服务器和连接协议以优化网络连接</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-dns">自定义 DNS 服务器（系统级配置）</Label>
              <Input 
                id="custom-dns"
                type="text" 
                value={customDns} 
                onChange={(e) => setCustomDns(e.target.value)} 
                placeholder="例如: 8.8.8.8,1.1.1.1" 
                disabled
              />
              <p className="text-xs text-muted-foreground">
                cloudflared 使用系统 DNS 设置。如需修改 DNS，请在操作系统的网络设置中配置。
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="protocol">连接协议</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={protocol === "quic" ? "default" : "outline"}
                  onClick={() => setProtocol("quic")}
                  className="flex-1"
                >
                  QUIC（默认）
                </Button>
                <Button
                  size="sm"
                  variant={protocol === "http2" ? "default" : "outline"}
                  onClick={() => setProtocol("http2")}
                  className="flex-1"
                >
                  HTTP/2（备用）
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {protocol === "quic" 
                  ? "QUIC 协议性能更好，但在某些网络环境下可能不稳定" 
                  : "HTTP/2 协议更稳定，适合网络环境较差的情况"}
              </p>
            </div>

            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">配置说明：</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>协议配置：如果 QUIC 连接不稳定，可以切换到 HTTP/2 协议</li>
                    <li>DNS 配置：cloudflared 使用系统 DNS，如需修改请在系统级别配置</li>
                    <li>如果看到 "Failed to refresh DNS" 错误，建议切换到 HTTP/2 协议</li>
                    <li>配置保存后，需要重启 Tunnel 才能生效</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <Button onClick={handleSaveAdvancedConfig} className="w-full">
              保存高级配置
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
