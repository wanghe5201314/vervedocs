import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import * as path from 'path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  // @ts-ignore
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const env = loadEnv(mode, process.cwd(), '')
  const pkg = JSON.parse(
    readFileSync(path.resolve(currentDir, 'package.json'), 'utf8')
  ) as { version?: string }

  const autoImportPlugins = [
    AutoImport({
      resolvers: [
        AntDesignVueResolver({
          importStyle: 'css-in-js',
        }),
      ],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: 'css-in-js',
        }),
      ],
      dts: 'src/components.d.ts',
    }),
  ]

  return {
    plugins: [vue(), ...autoImportPlugins],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version || '')
    },
    base: './',
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(currentDir, 'src') },
        { find: /^dayjs$/, replacement: 'dayjs/esm/index.js' },
        { find: /^dayjs\/plugin\/(.*)\.js$/, replacement: 'dayjs/esm/plugin/$1/index.js' },
        { find: /^dayjs\/locale\/(.*)\.js$/, replacement: 'dayjs/esm/locale/$1.js' }
      ]
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_BIZ_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://127.0.0.1:8090',
          changeOrigin: true
        },
        '/files': {
          target: env.VITE_BIZ_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://127.0.0.1:8090',
          changeOrigin: true
        }
      }
    }
  }
})
