import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import * as path from 'path'
import { existsSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { stripUseClientDirective } from '../../packages/excel/vite/strip-use-client-directive'

export default defineConfig(() => {
  // @ts-ignore
  const playgroundDir = path.dirname(fileURLToPath(import.meta.url))
  const excelPackageDir = path.resolve(playgroundDir, '../../packages/excel')
  const collabPluginDir = path.resolve(
    playgroundDir,
    '../../plugins/docx-editor-collaboration'
  )
  const collabNodeModules = existsSync(path.resolve(collabPluginDir, 'node_modules'))
    ? path.resolve(collabPluginDir, 'node_modules')
    : path.resolve(excelPackageDir, 'node_modules')
  const yjsRealDir = realpathSync(path.resolve(collabNodeModules, 'yjs'))
  const lib0Dir = path.resolve(path.dirname(yjsRealDir), 'lib0')

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

  return {
    plugins: [vue(), stripUseClientDirective(), ...autoImportPlugins],
    base: './',
    resolve: {
      dedupe: ['yjs', 'y-protocols', '@hocuspocus/provider', 'lib0', 'eventemitter3'],
      alias: [
        {
          find: '@vervedoc/excel',
          replacement: path.resolve(excelPackageDir, 'src/index.ts'),
        },
        { find: '@', replacement: path.resolve(excelPackageDir, 'src') },
        {
          find: 'yjs',
          replacement: path.resolve(collabNodeModules, 'yjs'),
        },
        {
          find: 'lib0',
          replacement: lib0Dir,
        },
        {
          find: 'y-protocols',
          replacement: path.resolve(collabNodeModules, 'y-protocols'),
        },
        {
          find: '@hocuspocus/provider',
          replacement: path.resolve(collabNodeModules, '@hocuspocus/provider'),
        },
        {
          find: 'eventemitter3',
          replacement: path.resolve(collabNodeModules, 'eventemitter3'),
        },
      ],
    },
    server: {
      host: '0.0.0.0',
      fs: {
        allow: [
          playgroundDir,
          excelPackageDir,
          collabPluginDir,
          path.resolve(playgroundDir, '../..'),
        ],
      },
    },
  }
})
