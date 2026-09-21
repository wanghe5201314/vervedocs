import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { dirname, resolve } from 'path'
import { existsSync, realpathSync } from 'node:fs'
import { stripUseClientDirective } from './vite/strip-use-client-directive'

export default defineConfig(() => {
  const collabNodeModules = existsSync(resolve(__dirname, '../../plugins/docx-editor-collaboration/node_modules'))
    ? resolve(__dirname, '../../plugins/docx-editor-collaboration/node_modules')
    : resolve(__dirname, 'node_modules')
  const yjsRealDir = realpathSync(resolve(collabNodeModules, 'yjs'))
  const lib0Dir = resolve(dirname(yjsRealDir), 'lib0')

  const isExternal = (id: string) => {
    if (['vue', '@mdi/js'].includes(id)) {
      return true
    }
    if (id.startsWith('@univerjs/')) {
      return true
    }
    if (id === '@vervedoc/docx-editor-collaboration' || id.startsWith('@vervedoc/docx-editor-collaboration/')) {
      return true
    }
    if (id === '@vervedoc/excel-parser' || id.startsWith('@vervedoc/excel-parser/')) {
      return true
    }
    if (id === '@vervedoc/design' || id.startsWith('@vervedoc/design/')) {
      return true
    }
    if (id === '@vervedoc/ui' || id.startsWith('@vervedoc/ui/')) {
      return true
    }
    return false
  }

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
    plugins: [
      vue(),
      stripUseClientDirective(),
      ...autoImportPlugins,
      cssInjectedByJsPlugin(),
      dts({
        include: ['src/**/*.ts', 'src/**/*.vue'],
        outDir: 'dist',
        rollupTypes: false
      })
    ],
    resolve: {
      dedupe: ['yjs', 'y-protocols', '@hocuspocus/provider', 'lib0', 'eventemitter3'],
      alias: {
        '@': resolve(__dirname, 'src'),
        'yjs': resolve(collabNodeModules, 'yjs'),
        'lib0': lib0Dir,
        'y-protocols': resolve(collabNodeModules, 'y-protocols'),
        '@hocuspocus/provider': resolve(collabNodeModules, '@hocuspocus/provider'),
        'eventemitter3': resolve(collabNodeModules, 'eventemitter3'),
      }
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'ExcelEditorUI',
        formats: ['es'],
        fileName: 'excel-editor-ui'
      },
      rollupOptions: {
        external: isExternal,
        onwarn(warning, warn) {
          if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.message.includes('resolveComponent')) {
            return
          }
          warn(warning)
        },
        output: {
          globals: {
            vue: 'Vue',
            '@mdi/js': 'MdiJs',
            '@vervedoc/docx-editor-collaboration': 'DocxEditorCollaboration',
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          dir: 'dist'
        }
      },
      emptyOutDir: true,
      outDir: 'dist'
    }
  }
})
