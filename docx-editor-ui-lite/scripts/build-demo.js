#!/usr/bin/env node

/**
 * 构建演示应用用于 nginx 部署
 * 
 * 功能:
 * 1. 复制 test.html 到 demo/index.html
 * 2. 修改导入路径使用 dist 中的构建产物
 * 3. 复制必要的资源文件
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('🚀 开始构建演示应用...\n');

// 1. 确保 demo 目录存在
const demoDir = join(rootDir, 'demo');
if (!existsSync(demoDir)) {
  mkdirSync(demoDir, { recursive: true });
  console.log('✅ 创建 demo 目录');
}

// 2. 复制 test.html 并修改导入路径
const testHtmlPath = join(rootDir, 'test.html');
const demoHtmlPath = join(demoDir, 'index.html');

let htmlContent = readFileSync(testHtmlPath, 'utf-8');

// 将导入路径从 src/index.ts 改为 docx-editor-core.js (dist 的产物)
htmlContent = htmlContent.replace(
  /from ['"]\.\/src\/index\.ts['"]/g,
  "from './docx-editor-core.js'"
);

writeFileSync(demoHtmlPath, htmlContent, 'utf-8');
console.log('✅ 复制并修改 test.html -> demo/index.html');

// 3. 复制 fonts 资源到 demo/fonts（确保目录结构正确）
const fontsDir = join(rootDir, 'fonts');
const demoFontsDest = join(demoDir, 'fonts');

if (existsSync(fontsDir)) {
  const materialIconsSrc = join(fontsDir, 'material-icons');
  const materialIconsDest = join(demoFontsDest, 'material-icons');
  
  if (existsSync(materialIconsSrc)) {
    if (!existsSync(demoFontsDest)) {
      mkdirSync(demoFontsDest, { recursive: true });
    }
    cpSync(materialIconsSrc, materialIconsDest, { recursive: true });
    console.log('✅ 复制 material-icons 字体资源到 demo/fonts');
  }
}

// 4. 复制 dist 目录的所有文件到 demo
const distDir = join(rootDir, 'dist');
if (!existsSync(distDir)) {
  console.warn('\n⚠️  警告：dist 目录不存在！');
  console.warn('   请先运行：npm run build\n');
} else {
  cpSync(distDir, demoDir, { recursive: true });
  console.log('✅ 复制 dist 构建产物到 demo 目录');
}

console.log('\n✨ 演示应用构建完成！\n');
console.log('📦 部署说明:');
console.log('   1. 先运行：npm run build (构建核心库)');
console.log('   2. 再运行：npm run build:demo (构建演示应用)');
console.log('   3. 将 demo 目录下的所有文件上传到 nginx 服务器');
console.log('   4. nginx 配置参考：nginx.conf.example\n');
