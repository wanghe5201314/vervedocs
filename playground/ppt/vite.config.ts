/*
 * @Author: Avan0203 1208097313@qq.com
 * @Date: 2026-08-26 16:35:38
 * @LastEditors: Avan0203 1208097313@qq.com
 * @LastEditTime: 2026-08-26 16:42:03
 * @FilePath: \vervedocs-1\playground\ppt\vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'
import { fileURLToPath } from 'node:url'

const playgroundDir = path.dirname(fileURLToPath(import.meta.url))
const pptPackageDir = path.resolve(playgroundDir, '../../packages/ppt')
const mixinsPath = path
  .resolve(pptPackageDir, 'src/assets/styles/_mixins.scss')
  .replace(/\\/g, '/')

export default defineConfig({
  plugins: [vue()],
  define: {
    global: 'globalThis',
  },
  base: './',
  resolve: {
    alias: [
      {
        find: '@vervedoc/ppt',
        replacement: path.resolve(pptPackageDir, 'src/index.ts'),
      },
      { find: '@', replacement: path.resolve(pptPackageDir, 'src') },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "${mixinsPath}" as *;\n`,
        silenceDeprecations: ['import', 'global-builtin', 'slash-div'],
      },
    },
  },
  server: {
    host: '0.0.0.0',
    fs: {
      allow: [
        playgroundDir,
        pptPackageDir,
        path.resolve(playgroundDir, '../..'),
      ],
    },
  },
})
