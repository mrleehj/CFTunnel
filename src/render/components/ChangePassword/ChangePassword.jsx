/**
 * 密码修改组件
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { auth } from '../../../api/client';
import { useToast } from '../../../components/ui/use-toast';

export default function ChangePassword({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const { toast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除错误
    if (error) setError('');
    
    // 实时计算新密码强度
    if (name === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const calculatePasswordStrength = (password) => {
    if (!password) return null;
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    let level = 'weak';
    let color = 'red';
    let text = '弱';
    
    if (score >= 4) {
      level = 'strong';
      color = 'green';
      text = '强';
    } else if (score >= 3) {
      level = 'medium';
      color = 'orange';
      text = '中';
    }
    
    return { level, color, text, checks, score };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 验证输入
    if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('请填写所有字段');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    
    if (formData.newPassword === formData.oldPassword) {
      setError('新密码不能与原密码相同');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await auth.changePassword(formData.oldPassword, formData.newPassword);
      
      if (response.success) {
        toast({
          title: '密码修改成功',
          description: '请使用新密码重新登录'
        });
        
        // 清空表单
        setFormData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setPasswordStrength(null);
        
        // 关闭对话框
        onOpenChange(false);
        
        // 延迟后登出
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1000);
      }
    } catch (err) {
      console.error('修改密码错误:', err);
      setError(err.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            修改密码
          </DialogTitle>
          <DialogDescription>
            请输入原密码和新密码
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 密码复杂度要求提示 */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <div className="font-medium mb-1">密码要求：</div>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>至少 8 位字符</li>
                <li>包含大写字母</li>
                <li>包含小写字母</li>
                <li>包含数字</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* 原密码 */}
          <div className="space-y-2">
            <Label htmlFor="oldPassword">原密码</Label>
            <div className="relative">
              <Input
                id="oldPassword"
                name="oldPassword"
                type={showPasswords.old ? 'text' : 'password'}
                value={formData.oldPassword}
                onChange={handleChange}
                placeholder="请输入原密码"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('old')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="请输入新密码"
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* 密码强度指示器 */}
            {passwordStrength && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">密码强度：</span>
                  <span style={{ color: passwordStrength.color }} className="font-medium">
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    {passwordStrength.checks.length ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-gray-300" />
                    )}
                    <span className={passwordStrength.checks.length ? 'text-green-600' : 'text-gray-400'}>
                      至少 8 位
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordStrength.checks.uppercase ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-gray-300" />
                    )}
                    <span className={passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-400'}>
                      大写字母
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordStrength.checks.lowercase ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-gray-300" />
                    )}
                    <span className={passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-400'}>
                      小写字母
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordStrength.checks.number ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-gray-300" />
                    )}
                    <span className={passwordStrength.checks.number ? 'text-green-600' : 'text-gray-400'}>
                      数字
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 确认新密码 */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="请再次输入新密码"
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '修改中...' : '确认修改'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
