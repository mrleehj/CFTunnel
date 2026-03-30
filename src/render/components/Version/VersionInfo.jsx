import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Download, ExternalLink, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function VersionInfo() {
  const [currentVersion, setCurrentVersion] = useState('加载中...');
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const { toast } = useToast();

  // 加载当前版本
  useEffect(() => {
    loadCurrentVersion();
    // 自动检查更新（静默）
    checkUpdateSilently();
  }, []);

  const loadCurrentVersion = async () => {
    try {
      const response = await fetch('/api/version/current');
      const data = await response.json();
      
      if (data.success) {
        setCurrentVersion(data.version);
      }
    } catch (error) {
      console.error('获取版本失败:', error);
      setCurrentVersion('未知');
    }
  };

  // 静默检查更新（不显示 Toast）
  const checkUpdateSilently = async () => {
    try {
      const response = await fetch('/api/version/check');
      const data = await response.json();
      
      if (data.success && data.hasUpdate) {
        setHasUpdate(true);
        setUpdateInfo(data);
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  // 检查更新
  const checkUpdate = async () => {
    setIsChecking(true);
    
    try {
      const response = await fetch('/api/version/check');
      const data = await response.json();
      
      if (data.success) {
        setUpdateInfo(data);
        setHasUpdate(data.hasUpdate);
        
        if (data.hasUpdate) {
          setShowUpdateDialog(true);
          toast({
            title: '发现新版本',
            description: `最新版本 ${data.latest} 已发布`,
          });
        } else {
          toast({
            title: '已是最新版本',
            description: `当前版本 ${data.current} 已是最新`,
          });
        }
      } else {
        throw new Error(data.message || '检查更新失败');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      toast({
        title: '检查更新失败',
        description: error.message || '无法连接到更新服务器',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  // 获取更新命令
  const getUpdateCommands = async () => {
    try {
      const response = await fetch('/api/version/update-command');
      const data = await response.json();
      
      if (data.success) {
        return data.commands;
      }
    } catch (error) {
      console.error('获取更新命令失败:', error);
    }
    return null;
  };

  // 复制更新命令
  const copyUpdateCommands = async () => {
    const commands = await getUpdateCommands();
    if (commands) {
      try {
        await navigator.clipboard.writeText(commands);
        toast({
          title: '已复制',
          description: '更新命令已复制到剪贴板',
        });
      } catch (error) {
        toast({
          title: '复制失败',
          description: '请手动复制命令',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <>
      <div className="version-info-container">
        <button
          className={`version-button ${isChecking ? 'checking' : ''} ${hasUpdate ? 'has-update' : ''}`}
          onClick={checkUpdate}
          disabled={isChecking}
          title={hasUpdate ? '有新版本可用，点击查看' : '点击检查更新'}
        >
          <div className="version-content">
            <span className="version-label">版本</span>
            <div className="version-number-wrapper">
              <span className="version-number">{currentVersion}</span>
              {hasUpdate && (
                <span className="update-badge" title="有新版本">
                  <span className="update-dot"></span>
                </span>
              )}
            </div>
          </div>
          <RefreshCw className={`version-icon ${isChecking ? 'spinning' : ''}`} size={14} />
        </button>
      </div>

      {/* 更新对话框 */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => setShowUpdateDialog(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">关闭</span>
          </button>
          
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download size={20} />
              发现新版本
            </DialogTitle>
            <DialogDescription>
              有新版本可用，建议及时更新以获得最新功能和修复
            </DialogDescription>
          </DialogHeader>

          {updateInfo && (
            <div className="space-y-4 py-4">
              {/* 版本信息 */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500">当前版本</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {updateInfo.current}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">最新版本</div>
                  <div className="text-lg font-semibold text-green-600">
                    {updateInfo.latest}
                  </div>
                </div>
              </div>

              {/* 发布时间 */}
              <div className="text-sm text-gray-600">
                发布时间: {new Date(updateInfo.publishedAt).toLocaleString('zh-CN')}
              </div>

              {/* 更新说明 */}
              {updateInfo.releaseNotes && (
                <div>
                  <div className="text-sm font-medium mb-2">更新说明:</div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto border border-gray-200">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}

              {/* 更新方法 */}
              <div className="space-y-3">
                <div className="text-sm font-medium">更新方法:</div>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <CheckCircle2 className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-blue-900">方法 1: 使用 CLI 命令（推荐）</div>
                      <div className="text-sm text-blue-700 mt-1">
                        在服务器上运行: <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">sudo cftm update</code>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <AlertCircle className="text-gray-600 mt-0.5 flex-shrink-0" size={16} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">方法 2: 手动下载更新</div>
                      <div className="text-sm text-gray-700 mt-1">
                        复制更新命令到服务器执行
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={copyUpdateCommands}
                  variant="outline"
                  className="flex-1"
                >
                  <Download size={16} className="mr-2" />
                  复制更新命令
                </Button>
                <Button
                  onClick={() => window.open(updateInfo.releaseUrl, '_blank')}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink size={16} className="mr-2" />
                  查看详情
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
