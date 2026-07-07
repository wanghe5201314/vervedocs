import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

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
      alias: {
        '@': resolve(__dirname, 'src')
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
        external: ['vue', 'element-plus', '@mdi/js'],
        output: {
          globals: {
            vue: 'Vue',
            'element-plus': 'ElementPlus',
            '@mdi/js': 'MdiJs'
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
