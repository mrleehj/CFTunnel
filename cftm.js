#!/usr/bin/env node

/**
 * CloudFlare Tunnel Manager - CLI 管理工具
 * 提供统一的命令行接口管理系统
 */

import { Command } from 'commander';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { initializeDefaultAdmin, getAllUsers, createUser, deleteUser, changePassword } from './server/utils/userManager.js';
import { validatePassword } from './server/utils/passwordValidator.js';

const program = new Command();
const CONFIG_DIR = path.join(os.homedir(), '.cloudflare-tunnel-manager');
const USERS_FILE = path.join(CONFIG_DIR, 'users.json');

// 创建 readline 接口
function createReadline() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}


// 隐藏输入的密码
function askPassword(question) {
  return new Promise((resolve) => {
    const rl = createReadline();
    process.stdout.write(question);
    
    // 隐藏输入
    process.stdin.setRawMode(true);
    let password = '';
    
    process.stdin.on('data', (char) => {
      char = char.toString();
      
      if (char === '\n' || char === '\r' || char === '\u0004') {
        // Enter 或 Ctrl+D
        process.stdin.setRawMode(false);
        process.stdout.write('\n');
        rl.close();
        resolve(password);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.stdout.write('\n');
        process.exit(0);
      } else if (char === '\u007f' || char === '\b') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    });
  });
}

// 普通问题
function ask(question) {
  return new Promise((resolve) => {
    const rl = createReadline();
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}


// 重置管理员密码
async function resetAdmin() {
  console.log('\n🔐 重置管理员密码\n');
  
  try {
    // 删除现有用户文件
    if (existsSync(USERS_FILE)) {
      await fs.unlink(USERS_FILE);
      console.log('✓ 已删除现有用户数据');
    }
    
    // 创建新的默认管理员
    const result = await initializeDefaultAdmin();
    
    if (result) {
      console.log('\n✓ 管理员账号重置完成！');
      console.log('\n请使用上面显示的用户名和密码登录系统。\n');
    } else {
      console.log('\n✗ 重置失败\n');
    }
  } catch (error) {
    console.error('\n✗ 重置失败:', error.message);
    process.exit(1);
  }
}


// 修改管理员密码
async function changeAdminPassword() {
  console.log('\n🔐 修改管理员密码\n');
  
  try {
    const users = await getAllUsers();
    const admin = users.find(u => u.role === 'admin');
    
    if (!admin) {
      console.log('✗ 未找到管理员账号');
      console.log('💡 请先运行: cftm reset-admin\n');
      return;
    }
    
    console.log('管理员账号:', admin.username);
    console.log('');
    
    // 输入旧密码
    const oldPassword = await askPassword('请输入当前密码: ');
    
    // 输入新密码
    const newPassword = await askPassword('请输入新密码（至少 8 位，包含大小写字母和数字）: ');
    
    // 验证密码强度
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      console.log('\n✗ 密码不符合要求:');
      validation.errors.forEach(err => console.log('   -', err));
      console.log('');
      return;
    }
    
    // 确认密码
    const confirmPassword = await askPassword('请再次输入新密码: ');
    
    if (newPassword !== confirmPassword) {
      console.log('\n✗ 两次输入的密码不一致\n');
      return;
    }
    
    // 修改密码
    await changePassword(admin.id, oldPassword, newPassword);
    
    console.log('\n✓ 密码修改成功\n');
    console.log('请使用新密码重新登录系统。\n');
    
  } catch (error) {
    console.error('\n✗ 修改失败:', error.message);
    process.exit(1);
  }
}


// 列出所有用户
async function listUsers() {
  console.log('\n👥 系统用户列表\n');
  console.log('配置目录:', CONFIG_DIR);
  console.log('用户文件:', USERS_FILE);
  console.log('');
  
  if (!existsSync(USERS_FILE)) {
    console.log('✗ 用户文件不存在');
    console.log('');
    console.log('💡 提示：');
    console.log('   1. 启动服务器会自动创建默认管理员账号');
    console.log('   2. 或运行: cftm reset-admin');
    console.log('');
    return;
  }
  
  try {
    const users = await getAllUsers();
    
    if (users.length === 0) {
      console.log('✗ 没有找到任何用户');
      console.log('');
      console.log('💡 运行: cftm reset-admin');
      console.log('');
      return;
    }
    
    console.log('找到', users.length, '个用户：\n');
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n用户 ${index + 1}:`);
      console.log('  ID:', user.id);
      console.log('  用户名:', user.username);
      console.log('  角色:', user.role === 'admin' ? '🔑 管理员' : '👤 普通用户');
      console.log('  创建时间:', new Date(user.createdAt).toLocaleString('zh-CN'));
      console.log('  最后登录:', user.lastLogin ? new Date(user.lastLogin).toLocaleString('zh-CN') : '从未登录');
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n⚠️  注意：密码已加密存储，无法直接查看');
    console.log('💡 如果忘记密码，请运行: cftm reset-admin\n');
    
  } catch (error) {
    console.error('✗ 读取用户失败:', error.message);
  }
}


// 创建新用户
async function addUser() {
  console.log('\n➕ 创建新用户\n');
  
  try {
    // 输入用户名
    const username = await ask('请输入用户名: ');
    
    if (!username || username.trim().length === 0) {
      console.log('\n✗ 用户名不能为空\n');
      return;
    }
    
    // 输入密码
    const password = await askPassword('请输入密码（至少 8 位，包含大小写字母和数字）: ');
    
    // 验证密码强度
    const validation = validatePassword(password);
    if (!validation.valid) {
      console.log('\n✗ 密码不符合要求:');
      validation.errors.forEach(err => console.log('   -', err));
      console.log('');
      return;
    }
    
    // 确认密码
    const confirmPassword = await askPassword('请再次输入密码: ');
    
    if (password !== confirmPassword) {
      console.log('\n✗ 两次输入的密码不一致\n');
      return;
    }
    
    // 选择角色
    const roleInput = await ask('请选择角色 (1=管理员, 2=普通用户) [2]: ');
    const role = roleInput.trim() === '1' ? 'admin' : 'user';
    
    // 创建用户
    const user = await createUser(username.trim(), password, role);
    
    console.log('\n✓ 用户创建成功！');
    console.log('\n用户信息:');
    console.log('  用户名:', user.username);
    console.log('  角色:', user.role === 'admin' ? '管理员' : '普通用户');
    console.log('');
    
  } catch (error) {
    console.error('\n✗ 创建失败:', error.message);
    process.exit(1);
  }
}


// 删除用户
async function removeUser(username) {
  console.log('\n🗑️ 删除用户\n');
  
  try {
    const users = await getAllUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      console.log(`✗ 未找到用户: ${username}\n`);
      return;
    }
    
    console.log('用户信息:');
    console.log('  用户名:', user.username);
    console.log('  角色:', user.role === 'admin' ? '管理员' : '普通用户');
    console.log('');
    
    const confirm = await ask('确定要删除此用户吗？(yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('\n✗ 已取消\n');
      return;
    }
    
    await deleteUser(user.id);
    
    console.log('\n✓ 用户已删除\n');
    
  } catch (error) {
    console.error('\n✗ 删除失败:', error.message);
    process.exit(1);
  }
}


// 显示系统状态
async function showStatus() {
  console.log('\n📊 系统状态\n');
  console.log('='.repeat(80));
  
  // 配置目录
  console.log('\n📁 配置目录:');
  console.log('  路径:', CONFIG_DIR);
  console.log('  存在:', existsSync(CONFIG_DIR) ? '✓ 是' : '✗ 否');
  
  // 用户文件
  console.log('\n👥 用户数据:');
  console.log('  文件:', USERS_FILE);
  console.log('  存在:', existsSync(USERS_FILE) ? '✓ 是' : '✗ 否');
  
  if (existsSync(USERS_FILE)) {
    try {
      const users = await getAllUsers();
      console.log('  用户数:', users.length);
      console.log('  管理员:', users.filter(u => u.role === 'admin').length);
      console.log('  普通用户:', users.filter(u => u.role === 'user').length);
    } catch (error) {
      console.log('  状态: ✗ 读取失败');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('');
}


// 服务管理 - 启动
function startService() {
  try {
    console.log('\n🚀 启动服务...\n');
    execSync('systemctl start cf-tunnel-manager', { stdio: 'inherit' });
    console.log('\n✓ 服务已启动\n');
  } catch (error) {
    console.error('\n✗ 启动失败\n');
    process.exit(1);
  }
}

// 服务管理 - 停止
function stopService() {
  try {
    console.log('\n🛑 停止服务...\n');
    execSync('systemctl stop cf-tunnel-manager', { stdio: 'inherit' });
    console.log('\n✓ 服务已停止\n');
  } catch (error) {
    console.error('\n✗ 停止失败\n');
    process.exit(1);
  }
}

// 服务管理 - 重启
function restartService() {
  try {
    console.log('\n🔄 重启服务...\n');
    execSync('systemctl restart cf-tunnel-manager', { stdio: 'inherit' });
    console.log('\n✓ 服务已重启\n');
  } catch (error) {
    console.error('\n✗ 重启失败\n');
    process.exit(1);
  }
}

// 服务管理 - 查看状态
function serviceStatus() {
  try {
    console.log('');
    execSync('systemctl status cf-tunnel-manager', { stdio: 'inherit' });
    console.log('');
  } catch (error) {
    // systemctl status 返回非 0 退出码是正常的
    console.log('');
  }
}

// 服务管理 - 查看日志
function viewLogs() {
  try {
    console.log('\n📋 查看日志 (按 Ctrl+C 退出)...\n');
    execSync('journalctl -u cf-tunnel-manager -f', { stdio: 'inherit' });
  } catch (error) {
    // Ctrl+C 会触发错误，这是正常的
    console.log('\n');
  }
}


// 配置 CLI
program
  .name('cftm')
  .description('CloudFlare Tunnel Manager - 命令行管理工具')
  .version('1.0.0');

// 重置管理员密码
program
  .command('reset-admin')
  .description('重置管理员账号（删除所有用户并创建新的默认管理员）')
  .action(resetAdmin);

// 修改管理员密码
program
  .command('change-password')
  .alias('passwd')
  .description('修改管理员密码')
  .action(changeAdminPassword);

// 列出用户
program
  .command('list-users')
  .alias('ls')
  .description('列出所有用户')
  .action(listUsers);

// 添加用户
program
  .command('add-user')
  .alias('add')
  .description('创建新用户')
  .action(addUser);

// 删除用户
program
  .command('remove-user <username>')
  .alias('rm')
  .description('删除指定用户')
  .action(removeUser);

// 显示状态
program
  .command('status')
  .description('显示系统状态')
  .action(showStatus);

// 服务管理命令
program
  .command('start')
  .description('启动服务')
  .action(startService);

program
  .command('stop')
  .description('停止服务')
  .action(stopService);

program
  .command('restart')
  .description('重启服务')
  .action(restartService);

program
  .command('service')
  .description('查看服务状态')
  .action(serviceStatus);

program
  .command('logs')
  .description('查看服务日志')
  .action(viewLogs);

// 解析命令
program.parse(process.argv);

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
