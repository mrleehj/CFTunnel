#!/usr/bin/env node

/**
 * CloudFlare Tunnel Manager - CLI 绠＄悊宸ュ叿
 * 鎻愪緵缁熶竴鐨勫懡浠よ鎺ュ彛绠＄悊绯荤粺
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

// 鍒涘缓 readline 鎺ュ彛
function createReadline() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// 闅愯棌杈撳叆鐨勫瘑鐮?
function askPassword(question) {
  return new Promise((resolve) => {
    const rl = createReadline();
    process.stdout.write(question);
    
    // 闅愯棌杈撳叆
    process.stdin.setRawMode(true);
    let password = '';
    
    process.stdin.on('data', (char) => {
      char = char.toString();
      
      if (char === '\n' || char === '\r' || char === '\u0004') {
        // Enter 鎴?Ctrl+D
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

// 鏅€氶棶棰?
function ask(question) {
  return new Promise((resolve) => {
    const rl = createReadline();
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// 閲嶇疆绠＄悊鍛樺瘑鐮?
async function resetAdmin() {
  console.log('\n馃攼 閲嶇疆绠＄悊鍛樺瘑鐮乗n');
  
  try {
    // 鍒犻櫎鐜版湁鐢ㄦ埛鏂囦欢
    if (existsSync(USERS_FILE)) {
      await fs.unlink(USERS_FILE);
      console.log('鉁?宸插垹闄ょ幇鏈夌敤鎴锋暟鎹?);
    }
    
    // 鍒涘缓鏂扮殑榛樿绠＄悊鍛?
    const result = await initializeDefaultAdmin();
    
    if (result) {
      console.log('\n鉁?绠＄悊鍛樿处鍙烽噸缃畬鎴愶紒');
      console.log('\n璇蜂娇鐢ㄤ笂闈㈡樉绀虹殑鐢ㄦ埛鍚嶅拰瀵嗙爜鐧诲綍绯荤粺銆俓n');
    } else {
      console.log('\n鉂?閲嶇疆澶辫触\n');
    }
  } catch (error) {
    console.error('\n鉂?閲嶇疆澶辫触:', error.message);
    process.exit(1);
  }
}

// 淇敼绠＄悊鍛樺瘑鐮?
async function changeAdminPassword() {
  console.log('\n馃攼 淇敼绠＄悊鍛樺瘑鐮乗n');
  
  try {
    const users = await getAllUsers();
    const admin = users.find(u => u.role === 'admin');
    
    if (!admin) {
      console.log('鉂?鏈壘鍒扮鐞嗗憳璐﹀彿');
      console.log('馃挕 璇峰厛杩愯: cftm reset-admin\n');
      return;
    }
    
    console.log('绠＄悊鍛樿处鍙?', admin.username);
    console.log('');
    
    // 杈撳叆鏃у瘑鐮?
    const oldPassword = await askPassword('璇疯緭鍏ュ綋鍓嶅瘑鐮? ');
    
    // 杈撳叆鏂板瘑鐮?
    const newPassword = await askPassword('璇疯緭鍏ユ柊瀵嗙爜锛堣嚦灏?8 浣嶏紝鍖呭惈澶у皬鍐欏瓧姣嶅拰鏁板瓧锛? ');
    
    // 楠岃瘉瀵嗙爜寮哄害
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      console.log('\n鉂?瀵嗙爜涓嶇鍚堣姹?');
      validation.errors.forEach(err => console.log('   -', err));
      console.log('');
      return;
    }
    
    // 纭瀵嗙爜
    const confirmPassword = await askPassword('璇峰啀娆¤緭鍏ユ柊瀵嗙爜: ');
    
    if (newPassword !== confirmPassword) {
      console.log('\n鉂?涓ゆ杈撳叆鐨勫瘑鐮佷笉涓€鑷碶n');
      return;
    }
    
    // 淇敼瀵嗙爜
    await changePassword(admin.id, oldPassword, newPassword);
    
    console.log('\n鉁?瀵嗙爜淇敼鎴愬姛\n');
    console.log('璇蜂娇鐢ㄦ柊瀵嗙爜閲嶆柊鐧诲綍绯荤粺銆俓n');
    
  } catch (error) {
    console.error('\n鉂?淇敼澶辫触:', error.message);
    process.exit(1);
  }
}

// 鍒楀嚭鎵€鏈夌敤鎴?
async function listUsers() {
  console.log('\n馃懃 绯荤粺鐢ㄦ埛鍒楄〃\n');
  console.log('閰嶇疆鐩綍:', CONFIG_DIR);
  console.log('鐢ㄦ埛鏂囦欢:', USERS_FILE);
  console.log('');
  
  if (!existsSync(USERS_FILE)) {
    console.log('鉂?鐢ㄦ埛鏂囦欢涓嶅瓨鍦?);
    console.log('');
    console.log('馃挕 鎻愮ず锛?);
    console.log('   1. 鍚姩鏈嶅姟鍣ㄤ細鑷姩鍒涘缓榛樿绠＄悊鍛樿处鍙?);
    console.log('   2. 鎴栬繍琛? cftm reset-admin');
    console.log('');
    return;
  }
  
  try {
    const users = await getAllUsers();
    
    if (users.length === 0) {
      console.log('鉂?娌℃湁鎵惧埌浠讳綍鐢ㄦ埛');
      console.log('');
      console.log('馃挕 杩愯: cftm reset-admin');
      console.log('');
      return;
    }
    
    console.log('鎵惧埌', users.length, '涓敤鎴凤細\n');
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n鐢ㄦ埛 ${index + 1}:`);
      console.log('  ID:', user.id);
      console.log('  鐢ㄦ埛鍚?', user.username);
      console.log('  瑙掕壊:', user.role === 'admin' ? '馃攽 绠＄悊鍛? : '馃懁 鏅€氱敤鎴?);
      console.log('  鍒涘缓鏃堕棿:', new Date(user.createdAt).toLocaleString('zh-CN'));
      console.log('  鏈€鍚庣櫥褰?', user.lastLogin ? new Date(user.lastLogin).toLocaleString('zh-CN') : '浠庢湭鐧诲綍');
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n鈿狅笍  娉ㄦ剰锛氬瘑鐮佸凡鍔犲瘑瀛樺偍锛屾棤娉曠洿鎺ユ煡鐪?);
    console.log('馃挕 濡傛灉蹇樿瀵嗙爜锛岃杩愯: cftm reset-admin\n');
    
  } catch (error) {
    console.error('鉂?璇诲彇鐢ㄦ埛澶辫触:', error.message);
  }
}

// 鍒涘缓鏂扮敤鎴?
async function addUser() {
  console.log('\n鉃?鍒涘缓鏂扮敤鎴穃n');
  
  try {
    // 杈撳叆鐢ㄦ埛鍚?
    const username = await ask('璇疯緭鍏ョ敤鎴峰悕: ');
    
    if (!username || username.trim().length === 0) {
      console.log('\n鉂?鐢ㄦ埛鍚嶄笉鑳戒负绌篭n');
      return;
    }
    
    // 杈撳叆瀵嗙爜
    const password = await askPassword('璇疯緭鍏ュ瘑鐮侊紙鑷冲皯 8 浣嶏紝鍖呭惈澶у皬鍐欏瓧姣嶅拰鏁板瓧锛? ');
    
    // 楠岃瘉瀵嗙爜寮哄害
    const validation = validatePassword(password);
    if (!validation.valid) {
      console.log('\n鉂?瀵嗙爜涓嶇鍚堣姹?');
      validation.errors.forEach(err => console.log('   -', err));
      console.log('');
      return;
    }
    
    // 纭瀵嗙爜
    const confirmPassword = await askPassword('璇峰啀娆¤緭鍏ュ瘑鐮? ');
    
    if (password !== confirmPassword) {
      console.log('\n鉂?涓ゆ杈撳叆鐨勫瘑鐮佷笉涓€鑷碶n');
      return;
    }
    
    // 閫夋嫨瑙掕壊
    const roleInput = await ask('璇烽€夋嫨瑙掕壊 (1=绠＄悊鍛? 2=鏅€氱敤鎴? [2]: ');
    const role = roleInput.trim() === '1' ? 'admin' : 'user';
    
    // 鍒涘缓鐢ㄦ埛
    const user = await createUser(username.trim(), password, role);
    
    console.log('\n鉁?鐢ㄦ埛鍒涘缓鎴愬姛锛?);
    console.log('\n鐢ㄦ埛淇℃伅:');
    console.log('  鐢ㄦ埛鍚?', user.username);
    console.log('  瑙掕壊:', user.role === 'admin' ? '绠＄悊鍛? : '鏅€氱敤鎴?);
    console.log('');
    
  } catch (error) {
    console.error('\n鉂?鍒涘缓澶辫触:', error.message);
    process.exit(1);
  }
}

// 鍒犻櫎鐢ㄦ埛
async function removeUser(username) {
  console.log('\n馃棏锔? 鍒犻櫎鐢ㄦ埛\n');
  
  try {
    const users = await getAllUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      console.log(`鉂?鏈壘鍒扮敤鎴? ${username}\n`);
      return;
    }
    
    console.log('鐢ㄦ埛淇℃伅:');
    console.log('  鐢ㄦ埛鍚?', user.username);
    console.log('  瑙掕壊:', user.role === 'admin' ? '绠＄悊鍛? : '鏅€氱敤鎴?);
    console.log('');
    
    const confirm = await ask('纭畾瑕佸垹闄ゆ鐢ㄦ埛鍚楋紵(yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('\n鉂?宸插彇娑圽n');
      return;
    }
    
    await deleteUser(user.id);
    
    console.log('\n鉁?鐢ㄦ埛宸插垹闄n');
    
  } catch (error) {
    console.error('\n鉂?鍒犻櫎澶辫触:', error.message);
    process.exit(1);
  }
}

// 鏄剧ず绯荤粺鐘舵€?
async function showStatus() {
  console.log('\n馃搳 绯荤粺鐘舵€乗n');
  console.log('='.repeat(80));
  
  // 閰嶇疆鐩綍
  console.log('\n馃搧 閰嶇疆鐩綍:');
  console.log('  璺緞:', CONFIG_DIR);
  console.log('  瀛樺湪:', existsSync(CONFIG_DIR) ? '鉁?鏄? : '鉂?鍚?);
  
  // 鐢ㄦ埛鏂囦欢
  console.log('\n馃懃 鐢ㄦ埛鏁版嵁:');
  console.log('  鏂囦欢:', USERS_FILE);
  console.log('  瀛樺湪:', existsSync(USERS_FILE) ? '鉁?鏄? : '鉂?鍚?);
  
  if (existsSync(USERS_FILE)) {
    try {
      const users = await getAllUsers();
      console.log('  鐢ㄦ埛鏁?', users.length);
      console.log('  绠＄悊鍛?', users.filter(u => u.role === 'admin').length);
      console.log('  鏅€氱敤鎴?', users.filter(u => u.role === 'user').length);
    } catch (error) {
      console.log('  鐘舵€? 鉂?璇诲彇澶辫触');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('');
}

// 鏈嶅姟绠＄悊 - 鍚姩
function startService() {
  try {
    console.log('\n馃殌 鍚姩鏈嶅姟...\n');
    execSync('systemctl start cf-tunnel-manager', { stdio: 'inherit' });
    console.log('\n鉁?鏈嶅姟宸插惎鍔╘n');
  } catch (error) {
    console.error('\n鉂?鍚姩澶辫触\n');
    process.exit(1);
  }
}

// 鏈嶅姟绠＄悊 - 鍋滄
function stopService() {
  try {
    console.log('\n馃洃 鍋滄鏈嶅姟...\n');
    execSync('systemctl stop cf-tunnel-manager', { stdio: 'inherit' });
    console.log('\n鉁?鏈嶅姟宸插仠姝n');
  } catch (error) {
    console.error('\n鉂?鍋滄澶辫触\n');
    process.exit(1);
  }
}

// 鏈嶅姟绠＄悊 - 閲嶅惎
function restartService() {
  try {
    console.log('\n馃攧 閲嶅惎鏈嶅姟...\n');
    execSync('systemctl restart cf-tunnel-manager', { stdio: 'inherit' });
    console.log('\n鉁?鏈嶅姟宸查噸鍚痋n');
  } catch (error) {
    console.error('\n鉂?閲嶅惎澶辫触\n');
    process.exit(1);
  }
}

// 鏈嶅姟绠＄悊 - 鏌ョ湅鐘舵€?
function serviceStatus() {
  try {
    console.log('');
    execSync('systemctl status cf-tunnel-manager', { stdio: 'inherit' });
    console.log('');
  } catch (error) {
    // systemctl status 杩斿洖闈?閫€鍑虹爜鏄甯哥殑
    console.log('');
  }
}

// 鏈嶅姟绠＄悊 - 鏌ョ湅鏃ュ織
function viewLogs() {
  try {
    console.log('\n馃搵 鏌ョ湅鏃ュ織 (鎸?Ctrl+C 閫€鍑?...\n');
    execSync('journalctl -u cf-tunnel-manager -f', { stdio: 'inherit' });
  } catch (error) {
    // Ctrl+C 浼氳Е鍙戦敊璇紝杩欐槸姝ｅ父鐨?
    console.log('\n');
  }
}

// 閰嶇疆 CLI
program
  .name('cftm')
  .description('CloudFlare Tunnel Manager - 鍛戒护琛岀鐞嗗伐鍏?)
  .version('1.0.0');

// 閲嶇疆绠＄悊鍛樺瘑鐮?
program
  .command('reset-admin')
  .description('閲嶇疆绠＄悊鍛樿处鍙凤紙鍒犻櫎鎵€鏈夌敤鎴峰苟鍒涘缓鏂扮殑榛樿绠＄悊鍛橈級')
  .action(resetAdmin);

// 淇敼绠＄悊鍛樺瘑鐮?
program
  .command('change-password')
  .alias('passwd')
  .description('淇敼绠＄悊鍛樺瘑鐮?)
  .action(changeAdminPassword);

// 鍒楀嚭鐢ㄦ埛
program
  .command('list-users')
  .alias('ls')
  .description('鍒楀嚭鎵€鏈夌敤鎴?)
  .action(listUsers);

// 娣诲姞鐢ㄦ埛
program
  .command('add-user')
  .alias('add')
  .description('鍒涘缓鏂扮敤鎴?)
  .action(addUser);

// 鍒犻櫎鐢ㄦ埛
program
  .command('remove-user <username>')
  .alias('rm')
  .description('鍒犻櫎鎸囧畾鐢ㄦ埛')
  .action(removeUser);

// 鏄剧ず鐘舵€?
program
  .command('status')
  .description('鏄剧ず绯荤粺鐘舵€?)
  .action(showStatus);

// 鏈嶅姟绠＄悊鍛戒护
program
  .command('start')
  .description('鍚姩鏈嶅姟')
  .action(startService);

program
  .command('stop')
  .description('鍋滄鏈嶅姟')
  .action(stopService);

program
  .command('restart')
  .description('閲嶅惎鏈嶅姟')
  .action(restartService);

program
  .command('service')
  .description('鏌ョ湅鏈嶅姟鐘舵€?)
  .action(serviceStatus);

program
  .command('logs')
  .description('鏌ョ湅鏈嶅姟鏃ュ織')
  .action(viewLogs);

// 瑙ｆ瀽鍛戒护
program.parse(process.argv);

// 濡傛灉娌℃湁鎻愪緵鍛戒护锛屾樉绀哄府鍔?
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
