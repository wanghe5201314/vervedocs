import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { resolve } from 'path'
import { existsSync } from 'node:fs'

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'
  const collabNodeModules = existsSync(resolve(__dirname, '../vervedocs-libs/docx-editor-collaboration/node_modules'))
    ? resolve(__dirname, '../vervedocs-libs/docx-editor-collaboration/node_modules')
    : resolve(__dirname, 'node_modules')
  const isExternal = (id: string) => {
    if (['vue', 'ant-design-vue', '@mdi/js'].includes(id)) {
      return true
    }
    if (id.startsWith('@univerjs/')) {
      return true
    }
    if (id === '@vervedoc/docx-editor-collaboration' || id.startsWith('@vervedoc/docx-editor-collaboration/')) {
      return true
    }
    return false
  }

  return {
    plugins: [
      vue(),
      isLib ? cssInjectedByJsPlugin() : null,
      isLib ? dts({
        include: ['src/**/*.ts', 'src/**/*.vue'],
        outDir: 'dist',
        rollupTypes: false
      }) : null
    ].filter(Boolean),
    resolve: {
      dedupe: ['yjs', 'y-protocols', '@hocuspocus/provider', 'lib0', 'eventemitter3'],
      alias: {
        '@': resolve(__dirname, 'src'),
        'yjs': resolve(collabNodeModules, 'yjs'),
        'y-protocols': resolve(collabNodeModules, 'y-protocols'),
        '@hocuspocus/provider': resolve(collabNodeModules, '@hocuspocus/provider'),
        'lib0': resolve(collabNodeModules, 'lib0'),
        'eventemitter3': resolve(collabNodeModules, 'eventemitter3'),
      }
    },
    base: isLib ? undefined : './',
    build: isLib ? {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'ExcelEditorUI',
        formats: ['es'],
        fileName: 'excel-editor-ui'
      },
      rollupOptions: {
        external: isExternal,
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('"use client"')) {
            return
          }
          warn(warning)
        },
        output: {
          globals: {
            vue: 'Vue',
            'ant-design-vue': 'antd',
            '@mdi/js': 'MdiJs',
            '@vervedoc/docx-editor-collaboration': 'DocxEditorCollaboration',
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks(id) {
            if (id.includes('node_modules/exceljs')) {
              return 'exceljs'
            }
            return undefined
          },
          dir: 'dist'
        }
      },
      emptyOutDir: true,
      outDir: 'dist'
    } : {
      outDir: 'site',
      emptyOutDir: true,
    }
  }
})
