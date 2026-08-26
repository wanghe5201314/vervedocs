import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import * as path from 'path'
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  // @ts-ignore
  const playgroundDir = path.dirname(fileURLToPath(import.meta.url))
  const docxPackageDir = path.resolve(playgroundDir, '../../packages/docx')
  const env = loadEnv(mode, playgroundDir, '')
  const pkg = JSON.parse(
    readFileSync(path.resolve(docxPackageDir, 'package.json'), 'utf8')
  ) as { version?: string }

  const autoImportPlugins = [
    AutoImport({
      resolvers: [
        AntDesignVueResolver({
          importStyle: 'css-in-js',
        }),
      ],
      dts: path.resolve(playgroundDir, 'src/auto-imports.d.ts'),
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: 'css-in-js',
        }),
      ],
      dts: path.resolve(playgroundDir, 'src/components.d.ts'),
    }),
  ]

  const localJsonPlugin = {
    name: 'local-json-loader',
    configureServer(server: any) {
      server.middlewares.use('/test-output.json', (_req: any, res: any) => {
        const desktopPath = path.join(homedir(), 'Desktop', 'test-output.json')
        try {
          if (!existsSync(desktopPath)) {
            res.statusCode = 404
            res.end('File not found: ' + desktopPath)
            return
          }
          const content = readFileSync(desktopPath, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(content)
        } catch (e) {
          res.statusCode = 500
          res.end('Read error: ' + (e as Error).message)
        }
      })
    }
  }

  return {
    plugins: [vue(), ...autoImportPlugins, localJsonPlugin],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version || '')
    },
    base: './',
    resolve: {
      alias: [
        // 开发时直连库源码，便于 HMR
        { find: '@vervedoc/docx', replacement: path.resolve(docxPackageDir, 'src/editor/index.ts') },
        { find: '@', replacement: path.resolve(docxPackageDir, 'src') },
        { find: /^dayjs$/, replacement: 'dayjs/esm/index.js' },
        { find: /^dayjs\/plugin\/(.*)\.js$/, replacement: 'dayjs/esm/plugin/$1/index.js' },
        { find: /^dayjs\/locale\/(.*)\.js$/, replacement: 'dayjs/esm/locale/$1.js' }
      ]
    },
    server: {
      host: '0.0.0.0',
      fs: {
        allow: [playgroundDir, docxPackageDir, path.resolve(playgroundDir, '../..')]
      },
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
