/**
 * 密码验证工具
 * 提供密码复杂度验证和强度评估
 */

/**
 * 密码复杂度规则
 */
export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false, // 可选
};

/**
 * 验证密码复杂度
 * @param {string} password - 待验证的密码
 * @returns {Object} { valid: boolean, errors: string[], strength: string }
 */
export function validatePassword(password) {
  const errors = [];
  
  // 检查长度
  if (!password || password.length < PASSWORD_RULES.minLength) {
    errors.push(`密码长度至少 ${PASSWORD_RULES.minLength} 位`);
  }
  
  // 检查大写字母
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }
  
  // 检查小写字母
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }
  
  // 检查数字
  if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }
  
  // 检查特殊字符（可选）
  if (PASSWORD_RULES.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码建议包含至少一个特殊字符');
  }
  
  // 评估密码强度
  const strength = calculatePasswordStrength(password);
  
  return {
    valid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * 计算密码强度
 * @param {string} password - 密码
 * @returns {string} 'weak' | 'medium' | 'strong'
 */
export function calculatePasswordStrength(password) {
  if (!password) return 'weak';
  
  let score = 0;
  
  // 长度评分
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // 字符类型评分
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
  
  // 复杂度评分
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.6) score += 1;
  
  // 返回强度等级
  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
}

/**
 * 获取密码强度描述
 * @param {string} strength - 强度等级
 * @returns {Object} { text: string, color: string }
 */
export function getPasswordStrengthInfo(strength) {
  const info = {
    weak: { text: '弱', color: 'red' },
    medium: { text: '中', color: 'orange' },
    strong: { text: '强', color: 'green' }
  };
  
  return info[strength] || info.weak;
}
