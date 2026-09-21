import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import dts from 'vite-plugin-dts'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    cssInjectedByJsPlugin({
      styleId: 'vervedoc-core-style',
      topExecutionPriority: true
    }),
    dts({
      insertTypesEntry: true,
      rollupTypes: false
    })
  ],
  worker: {
    format: 'es'
  },
  build: {
    sourcemap: true,
    lib: {
      name: 'VerveDocCore',
      fileName: 'core',
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'umd']
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
