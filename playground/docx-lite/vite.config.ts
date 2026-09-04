import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export default defineConfig(() => {
  // @ts-ignore
  const playgroundDir = path.dirname(fileURLToPath(import.meta.url))
  const litePackageDir = path.resolve(playgroundDir, '../../packages/docx-lite')
  const parserPackageDir = path.resolve(playgroundDir, '../../packages/docx-parser')
  const pkg = JSON.parse(
    readFileSync(path.resolve(litePackageDir, 'package.json'), 'utf8')
  ) as { version?: string }

  return {
    plugins: [vue()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version || '')
    },
    base: './',
    resolve: {
      alias: [
        {
          find: '@vervedoc/docx-lite',
          replacement: path.resolve(litePackageDir, 'src/editor/index.ts')
        },
        {
          find: '@vervedoc/docx-parser',
          replacement: path.resolve(parserPackageDir, 'src/index.ts')
        },
        { find: '@', replacement: path.resolve(litePackageDir, 'src') }
      ]
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      open: true,
      fs: {
        allow: [
          playgroundDir,
          litePackageDir,
          parserPackageDir,
          path.resolve(playgroundDir, '../..')
        ]
      }
    }
  }
})
