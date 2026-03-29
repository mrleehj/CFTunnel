import { useState, useEffect, useRef } from "react";
import * as api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function TunnelManager() {
  const [tunnels, setTunnels] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const hasLoadedRef = useRef(false); // 标记是否已加载过
  const [isRefreshing, setIsRefreshing] = useState(false); // 刷新状态
  
  // 新建 Tunnel 表单
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTunnelName, setNewTunnelName] = useState("");
  
  // DNS 记录表单
  const [showDnsForm, setShowDnsForm] = useState(false);
  const [selectedTunnel, setSelectedTunnel] = useState(null);
  
  // 配置编辑表单
  const [configFormData, setConfigFormData] = useState({
    tunnelId: "",
    tunnelName: "",
    routes: []
  });
  
  // Tunnel 运行状态
  const [runningTunnels, setRunningTunnels] = useState({});
  
  // 日志查看
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logContent, setLogContent] = useState("");
  const [logTunnelName, setLogTunnelName] = useState("");
  
  // 确认对话框
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    description: "",
    onConfirm: null
  });
  
  // 凭证查看对话框
  const [showCredDialog, setShowCredDialog] = useState(false);
  const [credContent, setCredContent] = useState("");
  const [credTunnelName, setCredTunnelName] = useState("");

  useEffect(() => {
    // 加载凭证：优先从后端，回退到 localStorage
    const loadCredentials = async () => {
      try {
        const creds = await api.credentials.load();
        setAccountId(creds.account_id);
        setApiToken(creds.api_token);
      } catch (e) {
        const savedAccountId = localStorage.getItem("cf_account_id");
        const savedApiToken = localStorage.getItem("cf_api_token");
        if (savedAccountId) setAccountId(savedAccountId);
        if (savedApiToken) setApiToken(savedApiToken);
      }
    };
    
    loadCredentials();
    loadTunnelsFromStorage();
    
    // 初始化时检查进程状态
    const initializeStatus = async () => {
      try {
        const info = await api.tunnels.getStatus();
        if (info.pid) {
          console.log("检测到有进程在运行, PID:", info.pid);
        }
      } catch (e) {
        console.log("初始化状态检查失败:", e);
      }
    };
    
    initializeStatus();
    checkTunnelStatus();
    
    // 每 3 秒检查一次 Tunnel 状态
    const interval = setInterval(checkTunnelStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 只在首次加载且有凭证时自动加载
    if (accountId && apiToken && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadTunnels();
    }
  }, [accountId, apiToken]);

  const checkTunnelStatus = async () => {
    try {
      const statuses = await api.tunnels.getStatus();
      
      // 后端现在返回一个对象，key 是 tunnelId，value 是状态信息
      const newRunningTunnels = {};
      for (const [tunnelId, status] of Object.entries(statuses)) {
        if (status.running && status.pid) {
          newRunningTunnels[tunnelId] = true;
        }
      }
      setRunningTunnels(newRunningTunnels);
    } catch (e) {
      console.log("检查 Tunnel 状态失败:", e);
      setRunningTunnels({});
    }
  };

  const loadTunnelsFromStorage = () => {
    const saved = localStorage.getItem("cf_tunnels");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 确保加载的数据是数组
        if (Array.isArray(parsed)) {
          setTunnels(parsed);
        } else {
          console.warn("localStorage 中的 tunnels 数据格式不正确，已重置");
          setTunnels([]);
        }
      } catch (e) {
        console.error("加载 tunnels 失败:", e);
        setTunnels([]);
      }
    }
  };

  const saveTunnelsToStorage = (tunnelsList) => {
    localStorage.setItem("cf_tunnels", JSON.stringify(tunnelsList));
  };

  const loadTunnels = async (force = false) => {
    if (!accountId || !apiToken) {
      toast({
        title: "提示",
        description: "请先配置 Cloudflare 凭证",
      });
      return;
    }
    
    // 如果不是强制刷新且已有数据，则跳过
    if (!force && tunnels.length > 0) {
      return;
    }
    
    const loadingState = force ? setIsRefreshing : setLoading;
    loadingState(true);
    
    try {
      const result = await api.tunnels.list(accountId, apiToken);
      console.log("加载到的 Tunnel 列表:", result);
      
      // 确保结果是数组
      const tunnelsList = Array.isArray(result) ? result : [];
      setTunnels(tunnelsList);
      saveTunnelsToStorage(tunnelsList);
      
      if (force) {
        toast({
          title: "刷新成功",
          description: `成功加载 ${tunnelsList.length} 个 Tunnel`,
        });
      }
    } catch (e) {
      console.error("加载 Tunnel 列表失败:", e);
      const errorMsg = e.toString();
      toast({
        variant: "destructive",
        title: "加载失败",
        description: errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg,
      });
      loadTunnelsFromStorage();
    } finally {
      loadingState(false);
    }
  };

  const handleCreateTunnel = async () => {
    if (!newTunnelName.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入 Tunnel 名称",
      });
      return;
    }

    setLoading(true);
    try {
      await api.tunnels.create(accountId, apiToken, newTunnelName);
      
      toast({
        title: "创建成功",
        description: `Tunnel "${newTunnelName}" 已创建`,
      });
      setNewTunnelName("");
      setShowCreateForm(false);
      loadTunnels(true);
    } catch (e) {
      const errorMsg = e.toString();
      toast({
        variant: "destructive",
        title: "创建失败",
        description: errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTunnel = async (tunnel) => {
    setConfirmConfig({
      title: "删除 Tunnel",
      description: `确定要删除 Tunnel "${tunnel.name}" 吗？此操作无法撤销。`,
      onConfirm: async () => {
        setLoading(true);
        try {
          await api.tunnels.delete(accountId, apiToken, tunnel.id);
          
          toast({
            title: "删除成功",
            description: `Tunnel "${tunnel.name}" 已删除`,
          });
          loadTunnels(true);
        } catch (e) {
          toast({
            variant: "destructive",
            title: "删除失败",
            description: e.toString(),
          });
        } finally {
          setLoading(false);
        }
      }
    });
    setShowConfirmDialog(true);
  };

  const handleAddDnsRecord = async (tunnel) => {
    setSelectedTunnel(tunnel);
    setLoading(true);
    
    try {
      // 始终从 API 获取真实配置，不使用本地缓存
      console.log('从 API 获取 Tunnel 配置...');
      const config = await api.tunnels.getConfig(accountId, apiToken, tunnel.id);
      
      console.log("从 API 加载的配置:", config);
      
      setConfigFormData({
        tunnelId: tunnel.id,
        tunnelName: tunnel.name,
        routes: (config.routes || []).map((route, idx) => ({
          ...route,
          id: `${tunnel.id}-${idx}-${Date.now()}` // 使用更稳定的 ID
        }))
      });
    } catch (e) {
      console.error("加载配置失败:", e);
      // 加载失败时使用本地缓存作为后备
      setConfigFormData({
        tunnelId: tunnel.id,
        tunnelName: tunnel.name,
        routes: (tunnel.routes || []).map((route, idx) => ({
          ...route,
          id: `${tunnel.id}-${idx}-${Date.now()}` // 使用更稳定的 ID
        }))
      });
      toast({
        title: "提示",
        description: "从本地加载配置（API 加载失败）",
      });
    } finally {
      setLoading(false);
      setShowDnsForm(true);
    }
  };



  const handleConnectTunnel = async (tunnel) => {
    setLoading(true);
    try {
      // 获取 Tunnel 的路由配置
      const routes = tunnel.routes || [];
      
      // 读取高级配置
      const customDns = localStorage.getItem("cf_custom_dns") || null;
      const protocol = localStorage.getItem("cf_protocol") || null;
      
      // 调用后端启动 Tunnel，传递路由配置和高级配置
      await api.tunnels.start(tunnel.id, tunnel.name, routes, customDns, protocol);
      
      setRunningTunnels(prev => ({
        ...prev,
        [tunnel.id]: true
      }));
      toast({
        title: "启动成功",
        description: `Tunnel "${tunnel.name}" 已启动`,
      });
    } catch (e) {
      console.error("启动 Tunnel 失败:", e);
      
      // 优化错误提示
      const errorMsg = e.toString();
      if (errorMsg.includes("已经在运行")) {
        toast({
          variant: "destructive",
          title: "启动失败",
          description: "该 Tunnel 已经在运行中",
        });
      } else {
        toast({
          variant: "destructive",
          title: "启动失败",
          description: errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectTunnel = async (tunnel) => {
    setLoading(true);
    try {
      // 调用后端停止 Tunnel，传递 tunnel_id
      await api.tunnels.stop(tunnel.id);
      
      setRunningTunnels(prev => {
        const newState = { ...prev };
        delete newState[tunnel.id];
        return newState;
      });
      toast({
        title: "停止成功",
        description: `Tunnel "${tunnel.name}" 已停止`,
      });
      
      // 停止后重新检查状态
      setTimeout(checkTunnelStatus, 500);
    } catch (e) {
      console.error("停止 Tunnel 失败:", e);
      
      // 即使停止失败,也清理前端状态
      setRunningTunnels(prev => {
        const newState = { ...prev };
        delete newState[tunnel.id];
        return newState;
      });
      
      const errorMsg = e.toString();
      if (errorMsg.includes("未运行")) {
        toast({
          title: "提示",
          description: "Tunnel 未运行，已清理状态",
        });
      } else {
        toast({
          variant: "destructive",
          title: "停止失败",
          description: errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = () => {
    setConfigFormData({
      ...configFormData,
      routes: [...configFormData.routes, { 
        hostname: "", 
        service: "",
        id: `new-${Date.now()}-${Math.random()}` // 使用更稳定的 ID
      }]
    });
  };

  const handleRemoveRoute = (index) => {
    console.log('删除路由，索引:', index);
    console.log('删除前的路由列表:', configFormData.routes);
    
    const newRoutes = configFormData.routes.filter((_, i) => i !== index);
    
    console.log('删除后的路由列表:', newRoutes);
    
    setConfigFormData({
      ...configFormData,
      routes: newRoutes
    });
  };

  const handleRouteChange = (index, field, value) => {
    const newRoutes = [...configFormData.routes];
    newRoutes[index][field] = value;
    setConfigFormData({
      ...configFormData,
      routes: newRoutes
    });
  };

  const handleSaveConfig = async () => {
    // 验证路由配置
    if (configFormData.routes.length === 0) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请至少添加一条路由配置",
      });
      return;
    }

    // 验证每条路由的必填字段
    for (let i = 0; i < configFormData.routes.length; i++) {
      const route = configFormData.routes[i];
      if (!route.hostname || !route.hostname.trim()) {
        toast({
          variant: "destructive",
          title: "验证失败",
          description: `第 ${i + 1} 条路由的域名不能为空`,
        });
        return;
      }
      if (!route.service || !route.service.trim()) {
        toast({
          variant: "destructive",
          title: "验证失败",
          description: `第 ${i + 1} 条路由的本地服务不能为空`,
        });
        return;
      }
    }

    setLoading(true);
    try {
      toast({
        title: "保存中",
        description: "正在保存配置...",
      });
      
      // 1. 更新 Tunnel 配置 (ingress 规则)
      await api.tunnels.updateConfig(
        accountId,
        apiToken,
        selectedTunnel.id,
        configFormData.routes.map(r => ({
          hostname: r.hostname.trim(),
          service: r.service.trim()
        }))
      );
      
      // 2. 为每个域名创建 DNS CNAME 记录
      const dnsResults = [];
      for (const route of configFormData.routes) {
        const hostname = route.hostname.trim();
        
        try {
          // 解析域名,获取 zone (根域名)
          const parts = hostname.split('.');
          if (parts.length < 2) {
            console.warn(`域名格式不正确: ${hostname}`);
            continue;
          }
          
          // 获取根域名 (例如: app.example.com -> example.com)
          const zoneName = parts.slice(-2).join('.');
          
          // 获取 Zone ID
          const zones = await api.dns.getZones(apiToken);
          const zone = zones.find(z => z.name === zoneName);
          
          if (!zone) {
            console.warn(`未找到域名 ${zoneName} 的 Zone,请确保该域名已添加到 Cloudflare`);
            dnsResults.push({ hostname, success: false, error: `域名 ${zoneName} 未在 Cloudflare 中` });
            continue;
          }
          
          // 创建 DNS CNAME 记录
          await api.dns.createRecord(zone.id, apiToken, hostname, selectedTunnel.id);
          
          dnsResults.push({ hostname, success: true });
          console.log(`DNS 记录创建成功: ${hostname}`);
        } catch (e) {
          console.error(`创建 DNS 记录失败 (${hostname}):`, e);
          dnsResults.push({ hostname, success: false, error: e.toString() });
        }
      }
      
      // 3. 更新本地 Tunnel 列表
      const updatedTunnels = tunnels.map(t => {
        if (t.id === selectedTunnel.id) {
          return {
            ...t,
            routes: configFormData.routes.map(r => ({
              hostname: r.hostname.trim(),
              service: r.service.trim()
            }))
          };
        }
        return t;
      });
      
      setTunnels(updatedTunnels);
      saveTunnelsToStorage(updatedTunnels);
      
      // 触发自定义事件通知其他组件更新
      window.dispatchEvent(new Event("tunnels-updated"));
      
      setShowDnsForm(false);
      
      // 显示结果摘要
      const successCount = dnsResults.filter(r => r.success).length;
      const failCount = dnsResults.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast({
          title: "保存成功",
          description: `配置已保存! 已创建 ${successCount} 条 DNS 记录`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "部分失败",
          description: `配置已保存,但有 ${failCount} 条 DNS 记录创建失败,请查看控制台`,
        });
        console.log("DNS 记录创建结果:", dnsResults);
      }
    } catch (e) {
      console.error("保存配置失败:", e);
      toast({
        variant: "destructive",
        title: "保存失败",
        description: e.toString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForceCleanup = async () => {
    setConfirmConfig({
      title: "强制清理状态",
      description: "确定要强制清理 Tunnel 状态吗？这将尝试停止所有运行中的进程。",
      onConfirm: async () => {
        setLoading(true);
        try {
          // 尝试停止进程
          await api.tunnels.stop();
          toast({
            title: "清理成功",
            description: "已清理 Tunnel 状态",
          });
        } catch (e) {
          // 即使失败也清理前端状态
          console.log("清理状态:", e);
          toast({
            title: "清理完成",
            description: "状态已清理",
          });
        } finally {
          // 清空前端状态
          setRunningTunnels({});
          // 重新检查状态
          setTimeout(checkTunnelStatus, 500);
          setLoading(false);
        }
      }
    });
    setShowConfirmDialog(true);
  };

  const handleViewLog = async (tunnel) => {
    setLogTunnelName(tunnel.name);
    setLoading(true);
    try {
      const result = await api.logs.getTunnelLog(tunnel.name);
      // 后端返回 { log: "..." } 格式
      const logText = result.log || result || "";
      // 处理日志内容，将 UTC 时间转换为本地时间
      const formattedLog = formatLogTimestamps(logText);
      setLogContent(formattedLog);
      setShowLogDialog(true);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "读取失败",
        description: e.toString(),
      });
    } finally {
      setLoading(false);
    }
  };

  // 格式化日志中的时间戳
  const formatLogTimestamps = (logText) => {
    if (!logText) return logText;
    
    // 匹配 ISO 8601 格式的时间戳 (例如: 2026-03-28T05:25:48Z)
    const timeRegex = /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/g;
    
    return logText.replace(timeRegex, (match) => {
      try {
        // 确保时间字符串有 Z 后缀
        const timeStr = match.endsWith('Z') ? match : match + 'Z';
        const date = new Date(timeStr);
        
        // 转换为本地时间字符串
        const localTime = date.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        });
        
        return localTime;
      } catch (e) {
        // 如果解析失败，返回原始字符串
        return match;
      }
    });
  };

  const handleDebugCredentials = async (tunnel) => {
    setCredTunnelName(tunnel.name);
    setLoading(true);
    try {
      const creds = await api.cloudflared.readCredentials(tunnel.id, accountId, apiToken);
      setCredContent(creds);
      setShowCredDialog(true);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "读取失败",
        description: e.toString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Cloudflare Tunnel 管理</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleForceCleanup}
            disabled={loading}
            title="如果遇到状态不同步问题,可以使用此功能清理"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            清理状态
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)}
            disabled={!accountId || !apiToken || loading}
          >
            + 新建 Tunnel
          </Button>
          <Button 
            variant="outline"
            onClick={() => loadTunnels(true)}
            disabled={loading || isRefreshing}
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                刷新中...
              </>
            ) : (
              "刷新"
            )}
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      {!accountId || !apiToken ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-lg mb-2">⚠️ 请先在"Cloudflare 配置"页面设置账户凭证</p>
              <p className="text-sm text-muted-foreground">需要 Account ID 和 API Token 才能管理 Tunnel</p>
            </div>
          </CardContent>
        </Card>
      ) : loading && tunnels.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>正在加载 Tunnel 列表...</p>
            </div>
          </CardContent>
        </Card>
      ) : tunnels.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-lg mb-2">📦 暂无 Tunnel</p>
              <p className="text-sm text-muted-foreground mb-4">点击"新建 Tunnel"开始创建您的第一个 Tunnel</p>
              <Button onClick={() => setShowCreateForm(true)}>
                + 新建 Tunnel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tunnels.map(tunnel => (
            <Card key={tunnel.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{tunnel.name}</CardTitle>
                      <Badge variant={runningTunnels[tunnel.id] ? "default" : "secondary"}>
                        {runningTunnels[tunnel.id] ? '运行中' : '未连接'}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs break-all">{tunnel.id}</CardDescription>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tunnel.routes?.length || 0} 个连接
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* 操作按钮 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {runningTunnels[tunnel.id] ? (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnectTunnel(tunnel)}
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                      断开
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => handleConnectTunnel(tunnel)}
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      连接
                    </Button>
                  )}
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewLog(tunnel)}
                  >
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    日志
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handleDebugCredentials(tunnel)}
                    title="查看凭证状态（调试用）"
                  >
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    凭证
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddDnsRecord(tunnel)}
                  >
                    + DNS
                  </Button>
                  <Button 
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteTunnel(tunnel)}
                  >
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    删除
                  </Button>
                </div>

                {/* 配置的路由列表 */}
                {tunnel.routes && tunnel.routes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      配置的路由
                    </h4>
                    <div className="space-y-1">
                      {tunnel.routes.map((route, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded border">
                          <span className="text-primary font-mono truncate flex-1" title={route.hostname}>
                            {route.hostname}
                          </span>
                          <svg className="w-3 h-3 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                          <span className="text-muted-foreground font-mono truncate flex-1" title={route.service}>
                            {route.service}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  创建时间: {new Date(tunnel.created_at).toLocaleString()}
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* 创建 Tunnel 对话框 */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新 Tunnel</DialogTitle>
            <DialogDescription>
              输入 Tunnel 名称以创建新的 Cloudflare Tunnel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tunnel-name">Tunnel 名称</Label>
              <Input
                id="tunnel-name"
                value={newTunnelName}
                onChange={(e) => setNewTunnelName(e.target.value)}
                placeholder="例如: my-tunnel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTunnel} disabled={loading}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 配置链接对话框 */}
      <Dialog open={showDnsForm} onOpenChange={setShowDnsForm}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" onClose={() => setShowDnsForm(false)}>
          <DialogHeader>
            <DialogTitle>配置链接</DialogTitle>
            <DialogDescription>
              为 {selectedTunnel?.name} 配置域名和本地服务映射
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {configFormData.routes.map((route, index) => (
              <div key={route.id || index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    value={route.hostname}
                    onChange={(e) => handleRouteChange(index, 'hostname', e.target.value)}
                    placeholder="域名，例如: app.example.com"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    value={route.service}
                    onChange={(e) => handleRouteChange(index, 'service', e.target.value)}
                    placeholder="本地服务，例如: http://192.168.1.100:8080"
                  />
                </div>
                <Button 
                  size="icon"
                  variant="destructive"
                  onClick={() => handleRemoveRoute(index)}
                  title="移除"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </Button>
              </div>
            ))}
            
            <Button 
              variant="outline"
              onClick={handleAddRoute}
              className="w-full"
            >
              + 添加链接
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDnsForm(false)}>
              取消
            </Button>
            <Button onClick={handleSaveConfig} disabled={loading}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 日志查看对话框 */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-4xl" onClose={() => setShowLogDialog(false)}>
          <DialogHeader>
            <DialogTitle>Tunnel 日志 - {logTunnelName}</DialogTitle>
            <DialogDescription>
              最近 100 行日志输出
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap break-all">
              {logContent || "暂无日志"}
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowLogDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 凭证查看对话框 */}
      <Dialog open={showCredDialog} onOpenChange={setShowCredDialog}>
        <DialogContent className="max-w-4xl" onClose={() => setShowCredDialog(false)}>
          <DialogHeader>
            <DialogTitle>Tunnel 凭证 - {credTunnelName}</DialogTitle>
            <DialogDescription>
              凭证文件内容（调试用）
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap break-all">
              {credContent || "暂无凭证"}
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCredDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 确认对话框 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent onClose={() => setShowConfirmDialog(false)}>
          <DialogHeader>
            <DialogTitle>{confirmConfig.title}</DialogTitle>
            <DialogDescription>
              {confirmConfig.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
            >
              取消
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                setShowConfirmDialog(false);
                if (confirmConfig.onConfirm) {
                  confirmConfig.onConfirm();
                }
              }}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
