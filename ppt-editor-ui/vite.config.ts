import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "${resolve(__dirname, 'src/assets/styles/_mixins.scss').replace(/\\/g, '/')}" as *;\n`,
        silenceDeprecations: ['import', 'global-builtin', 'slash-div'],
      },
    },
  },
  base: './',
  build: {
    outDir: 'site',
    emptyOutDir: true,
  }
})
