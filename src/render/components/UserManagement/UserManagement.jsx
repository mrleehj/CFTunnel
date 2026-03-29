/**
 * 用户管理页面（仅管理员可访问）
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { Users, UserPlus, Trash2, Shield, User, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { auth } from '../../../api/client';
import { useToast } from '../../../components/ui/use-toast';
import ChangePassword from '../ChangePassword/ChangePassword';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  const loadCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await auth.getUsers();
      if (response.success && response.data) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      toast({
        title: '加载失败',
        description: error.message || '无法加载用户列表',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');

    // 验证输入
    if (!formData.username || !formData.password) {
      setError('用户名和密码不能为空');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度不能少于 6 位');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      const response = await auth.createUser(
        formData.username,
        formData.password,
        formData.role
      );

      if (response.success) {
        toast({
          title: '创建成功',
          description: `用户 ${formData.username} 已创建`
        });

        // 重置表单
        setFormData({
          username: '',
          password: '',
          confirmPassword: '',
          role: 'user'
        });
        setShowCreateDialog(false);

        // 重新加载用户列表
        loadUsers();
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      setError(error.message || '创建用户失败');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`确定要删除用户 ${username} 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const response = await auth.deleteUser(userId);
      if (response.success) {
        toast({
          title: '删除成功',
          description: `用户 ${username} 已删除`
        });
        loadUsers();
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      toast({
        title: '删除失败',
        description: error.message || '无法删除用户',
        variant: 'destructive'
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handlePasswordChangeSuccess = () => {
    // 密码修改成功后登出
    toast({
      title: '密码修改成功',
      description: '请使用新密码重新登录'
    });
    
    setTimeout(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }, 1500);
  };

  // 检查当前用户是否是管理员
  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            您没有权限访问此页面。仅管理员可以管理用户。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            用户管理
          </h1>
          <p className="text-gray-500 mt-1">管理系统用户账号</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              创建用户
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新用户</DialogTitle>
              <DialogDescription>
                填写用户信息以创建新账号
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="请输入用户名"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="至少 8 位，包含大小写字母和数字"
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500">
                  密码要求：至少 8 位，包含大写字母、小写字母和数字
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">角色</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  取消
                </Button>
                <Button type="submit">创建</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>
              共 {users.length} 个用户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {user.role === 'admin' ? (
                        <Shield className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? '管理员' : '普通用户'}
                        </Badge>
                        {user.id === currentUser?.id && (
                          <Badge variant="outline">当前用户</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        创建时间: {new Date(user.createdAt).toLocaleString('zh-CN')}
                        {user.lastLogin && (
                          <span className="ml-4">
                            最后登录: {new Date(user.lastLogin).toLocaleString('zh-CN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {user.id === currentUser?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowChangePassword(true);
                        }}
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        修改密码
                      </Button>
                    )}
                    {user.id !== currentUser?.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <ChangePassword 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword}
        onSuccess={handlePasswordChangeSuccess}
      />
    </div>
  );
}
