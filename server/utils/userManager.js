/**
 * 用户管理模块
 * 负责用户的创建、验证、更新等操作
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import os from 'os';
import { validatePassword } from './passwordValidator.js';

const SALT_ROUNDS = 10;
const CONFIG_DIR = path.join(os.homedir(), '.cloudflare-tunnel-manager');
const USERS_FILE = path.join(CONFIG_DIR, 'users.json');

/**
 * 确保配置目录存在
 */
async function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 读取用户数据
 */
async function readUsers() {
  try {
    await ensureConfigDir();
    
    if (!existsSync(USERS_FILE)) {
      return { users: [] };
    }
    
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取用户文件失败:', error);
    return { users: [] };
  }
}

/**
 * 写入用户数据
 */
async function writeUsers(data) {
  try {
    await ensureConfigDir();
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('写入用户文件失败:', error);
    throw error;
  }
}

/**
 * 生成符合复杂度要求的随机密码
 * 至少 8 位，包含大写字母、小写字母和数字
 */
function generatePassword(length = 12) {
  // 确保至少包含每种类型的字符
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const allChars = uppercase + lowercase + numbers;
  
  let password = '';
  
  // 先确保包含至少一个大写字母
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  
  // 至少一个小写字母
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  
  // 至少一个数字
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // 填充剩余长度
  const bytes = randomBytes(length - 3);
  for (let i = 0; i < length - 3; i++) {
    password += allChars[bytes[i] % allChars.length];
  }
  
  // 打乱顺序
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  
  return password;
}

/**
 * 创建用户
 */
export async function createUser(username, password, role = 'user') {
  const data = await readUsers();
  
  // 检查用户是否已存在
  if (data.users.find(u => u.username === username)) {
    throw new Error('用户名已存在');
  }
  
  // 验证密码复杂度
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new Error(validation.errors.join('；'));
  }
  
  // 加密密码
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  const user = {
    id: randomBytes(16).toString('hex'),
    username,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  
  data.users.push(user);
  await writeUsers(data);
  
  // 返回用户信息（不包含密码）
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * 验证用户凭证
 */
export async function verifyUser(username, password) {
  const data = await readUsers();
  const user = data.users.find(u => u.username === username);
  
  if (!user) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    return null;
  }
  
  // 更新最后登录时间
  user.lastLogin = new Date().toISOString();
  await writeUsers(data);
  
  // 返回用户信息（不包含密码）
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * 根据 ID 获取用户
 */
export async function getUserById(id) {
  const data = await readUsers();
  const user = data.users.find(u => u.id === id);
  
  if (!user) {
    return null;
  }
  
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * 修改密码
 */
export async function changePassword(userId, oldPassword, newPassword) {
  const data = await readUsers();
  const user = data.users.find(u => u.id === userId);
  
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 验证旧密码
  const isValid = await bcrypt.compare(oldPassword, user.password);
  if (!isValid) {
    throw new Error('原密码错误');
  }
  
  // 验证新密码复杂度
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new Error(validation.errors.join('；'));
  }
  
  // 更新密码
  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await writeUsers(data);
  
  return true;
}

/**
 * 初始化默认管理员账号
 */
export async function initializeDefaultAdmin() {
  const data = await readUsers();
  
  // 如果已有用户，不创建默认管理员
  if (data.users.length > 0) {
    return null;
  }
  
  // 生成随机密码
  const password = generatePassword();
  
  // 创建管理员账号
  const admin = await createUser('admin', password, 'admin');
  
  console.log('\n' + '='.repeat(60));
  console.log('🔐 首次启动：已创建默认管理员账号');
  console.log('='.repeat(60));
  console.log(`用户名: admin`);
  console.log(`密码: ${password}`);
  console.log('='.repeat(60));
  console.log('⚠️  请立即登录并修改密码！');
  console.log('='.repeat(60) + '\n');
  
  return { username: 'admin', password };
}

/**
 * 获取所有用户（不包含密码）
 */
export async function getAllUsers() {
  const data = await readUsers();
  return data.users.map(({ password, ...user }) => user);
}

/**
 * 删除用户
 */
export async function deleteUser(userId) {
  const data = await readUsers();
  const index = data.users.findIndex(u => u.id === userId);
  
  if (index === -1) {
    throw new Error('用户不存在');
  }
  
  // 不允许删除最后一个管理员
  const admins = data.users.filter(u => u.role === 'admin');
  if (admins.length === 1 && data.users[index].role === 'admin') {
    throw new Error('不能删除最后一个管理员账号');
  }
  
  data.users.splice(index, 1);
  await writeUsers(data);
  
  return true;
}
