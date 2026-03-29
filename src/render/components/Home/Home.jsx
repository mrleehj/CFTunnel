import React, { useState, useEffect } from "react";
import * as api from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function Home({ setActiveTab }) {
  const [tunnels, setTunnels] = useState([]);
  const [cloudflaredVersion, setCloudflaredVersion] = useState("");
  const [systemInfo, setSystemInfo] = useState({
    osDisplayName: "",
    platformName: "",
    arch: ""
  });
  const [processInfo, setProcessInfo] = useState({
    pid: null,
    uptime_seconds: null,
    runningCount: 0
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadSystemInfo(); // 从后端获取系统信息
    loadProcessInfo();
    
    // 每 2 秒更新一次进程信息
    const interval = setInterval(loadProcessInfo, 2000);
    
    // 监听 localStorage 变化(用于跨组件通信)
    const handleStorageChange = (e) => {
      if (e.key === "cf_tunnels") {
        loadData();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("tunnels-updated", loadData);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("tunnels-updated", loadData);
    };
  }, []);

  const loadData = async () => {
    // 从 localStorage 加载 tunnels
    const saved = localStorage.getItem("cf_tunnels");
    if (saved) {
      try {
        const parsedTunnels = JSON.parse(saved);
        setTunnels(parsedTunnels);
      } catch (e) {
        console.error("加载 tunnels 失败:", e);
      }
    }

    // 检查 cloudflared 版本
    try {
      const result = await api.cloudflared.checkVersion();
      setCloudflaredVersion(result.version);
    } catch (e) {
      setCloudflaredVersion("未安装");
    }
  };

  const loadSystemInfo = async () => {
    try {
      const result = await api.system.getInfo();
      if (result.success && result.data) {
        setSystemInfo({
          osDisplayName: result.data.osDisplayName || result.data.os,
          platformName: result.data.platformName || 'Unknown',
          arch: result.data.arch
        });
      }
    } catch (e) {
      console.error("获取系统信息失败:", e);
      // 如果后端 API 失败，使用浏览器检测作为后备
      detectSystem();
    }
  };

  const detectSystem = () => {
    const userAgent = navigator.userAgent;
    
    let os = "Unknown";
    if (userAgent.indexOf("Win") !== -1) os = "Windows";
    else if (userAgent.indexOf("Mac") !== -1) os = "macOS";
    else if (userAgent.indexOf("Linux") !== -1) os = "Linux";
    
    let arch = "Unknown";
    if (userAgent.indexOf("x86_64") !== -1 || userAgent.indexOf("Win64") !== -1) arch = "x64";
    else if (userAgent.indexOf("ARM") !== -1) arch = "ARM";
    else arch = "x86";
    
    setSystemInfo({ 
      osDisplayName: os,
      platformName: os,
      arch: arch 
    });
  };

  const loadProcessInfo = async () => {
    try {
      const statuses = await api.tunnels.getStatus();
      
      // 后端现在返回所有 Tunnel 的状态（对象格式）
      // 计算总的进程信息
      let totalPid = null;
      let oldestStartTime = null;
      let runningCount = 0;
      
      for (const [tunnelId, status] of Object.entries(statuses)) {
        if (status.running && status.pid) {
          runningCount++;
          // 使用第一个找到的 PID
          if (!totalPid) {
            totalPid = status.pid;
          }
          // 找到最早的启动时间
          if (status.startTime) {
            const startTime = new Date(status.startTime);
            if (!oldestStartTime || startTime < oldestStartTime) {
              oldestStartTime = startTime;
            }
          }
        }
      }
      
      // 计算运行时间（秒）
      let uptime_seconds = null;
      if (oldestStartTime) {
        uptime_seconds = Math.floor((Date.now() - oldestStartTime.getTime()) / 1000);
      }
      
      setProcessInfo({
        pid: totalPid,
        uptime_seconds: uptime_seconds,
        runningCount: runningCount  // 新增：运行中的 Tunnel 数量
      });
    } catch (e) {
      // API 不可用或进程未运行
      setProcessInfo({ pid: null, uptime_seconds: null, runningCount: 0 });
    }
  };

  const handleStopService = async () => {
    if (!processInfo.pid) {
      toast({
        title: "提示",
        description: "没有运行中的 Tunnel",
      });
      return;
    }
    
    setLoading(true);
    try {
      // 获取所有运行中的 Tunnel 并停止
      const statuses = await api.tunnels.getStatus();
      const stopPromises = [];
      
      for (const [tunnelId, status] of Object.entries(statuses)) {
        if (status.running && status.pid) {
          stopPromises.push(api.tunnels.stop(tunnelId));
        }
      }
      
      await Promise.all(stopPromises);
      
      toast({
        title: "停止成功",
        description: `已停止 ${stopPromises.length} 个 Tunnel`,
      });
      // 重新检查状态
      setTimeout(loadProcessInfo, 500);
    } catch (e) {
      console.error("停止服务失败:", e);
      toast({
        variant: "destructive",
        title: "停止失败",
        description: e.toString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return "--";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Cloudflare Tunnel</h1>
            <p className="text-muted-foreground">查看服务状态与系统信息</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData}>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              刷新
            </Button>
            {processInfo.pid ? (
              <Button 
                variant="destructive"
                onClick={handleStopService}
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                停止服务
              </Button>
            ) : (
              <Button 
                onClick={() => setActiveTab("tunnels")}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                前往启动
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 服务状态卡片 */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>服务状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-primary">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold">
                    {processInfo.pid ? "运行中" : "已停止"}
                  </span>
                  <Badge variant={processInfo.pid ? "default" : "secondary"}>
                    {processInfo.pid ? "Active" : "Stopped"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {processInfo.pid 
                    ? `${processInfo.runningCount} 个 Tunnel 正在运行中` 
                    : "Tunnel 服务未运行，请前往 Tunnel 管理页面启动"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">进程 ID (PID)</p>
                  <p className="text-2xl font-bold">{processInfo.pid || "--"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">已运行</p>
                  <p className="text-2xl font-bold">{formatUptime(processInfo.uptime_seconds)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">系统架构</p>
                  <p className="text-2xl font-bold">
                    {systemInfo.platformName} {systemInfo.arch}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 系统信息 */}
        <Card>
          <CardHeader>
            <CardTitle>系统信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">cloudflared 版本</span>
                <span className="font-medium">{cloudflaredVersion}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">操作系统</span>
                <span className="font-medium">{systemInfo.osDisplayName}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">系统架构</span>
                <span className="font-medium">{systemInfo.platformName} {systemInfo.arch}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">安装目录</span>
                <span className="font-medium text-xs">~/.cf_tunnel/bin/</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
