import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import * as path from 'path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const name = 'docx'
const pkg = JSON.parse(
  readFileSync(path.resolve(currentDir, 'package.json'), 'utf8')
) as { version?: string }

const autoImportPlugins = [
  AutoImport({
    imports: ['vue'],
    resolvers: [
      AntDesignVueResolver({
        importStyle: false,
      }),
    ],
    dts: false,
  }),
  Components({
    resolvers: [
      AntDesignVueResolver({
        importStyle: false,
      }),
    ],
    dts: false,
  }),
]

export default defineConfig({
  esbuild: {
    drop: ['console', 'debugger'],
  },
  plugins: [
    vue({
      isProduction: true,
    }),
    cssInjectedByJsPlugin(),
    dts({
      include: ['src/**/*.ts'],
      tsconfigPath: path.resolve(currentDir, 'tsconfig.json'),
      outDir: 'dist',
      rollupTypes: false
    }),
    ...autoImportPlugins,
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(currentDir, 'src') },
      { find: /^dayjs$/, replacement: 'dayjs/esm/index.js' },
      { find: /^dayjs\/plugin\/(.*)\.js$/, replacement: 'dayjs/esm/plugin/$1/index.js' },
      { find: /^dayjs\/locale\/(.*)\.js$/, replacement: 'dayjs/esm/locale/$1.js' }
    ]
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '')
  },
  build: {
    sourcemap: false,
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    lib: {
      name,
      fileName: name,
      formats: ['es'],
      entry: path.resolve(currentDir, 'src/editor/index.ts')
    },
    rollupOptions: {
      external: [
        'vue',
        'qrcode',
        '@vervedoc/docx-editor-collaboration',
        /^@vervedoc\/docx-editor-collaboration\//,
        /^@vervedoc\/docx-editor/,
        /^@vervedoc\/core/,
        '@vervedoc/design',
        /^@vervedoc\/design\//,
        '@vervedoc/ui',
        /^@vervedoc\/ui\//,
      ],
      output: {
        dir: 'dist',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('/src/app/')) return 'editor-view'
          if (id.includes('/src/components/')) return 'components'
          return undefined
        },
      },
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.message.includes('resolveComponent')) {
          return
        }
        warn(warning)
      }
    }
  }
})
