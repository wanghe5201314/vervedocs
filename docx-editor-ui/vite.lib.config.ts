import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import * as path from 'path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// @ts-ignore
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const name = 'docx-editor'
const pkg = JSON.parse(
  readFileSync(path.resolve(currentDir, 'package.json'), 'utf8')
) as { version?: string }

const autoImportPlugins = [
  AutoImport({
    resolvers: [ElementPlusResolver()],
    dts: false,
  }),
  Components({
    resolvers: [ElementPlusResolver()],
    dts: false,
  }),
]

export default defineConfig({
  plugins: [
    vue({
      isProduction: true,
    }),
    cssInjectedByJsPlugin(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.vue'],
      // @ts-ignore
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
    lib: {
      name,
      fileName: name,
      entry: path.resolve(currentDir, 'src/editor/index.ts')
    },
    rollupOptions: {
      external: [
        'vue',
        'element-plus',
        /^element-plus\//,
        '@element-plus/icons-vue',
        '@mdi/js',
        'echarts',
        /^echarts\//,
        'docx',
        'jszip',
        'qrcode',
        'plyr',
        'prismjs',
        /^prismjs\//,
        /^@wanghe1995\/docx-editor/,
      ],
      output: {
        globals: {
          vue: 'Vue',
          'element-plus': 'ElementPlus',
          'element-plus/es': 'ElementPlus',
          '@element-plus/icons-vue': 'ElementPlusIconsVue',
          '@mdi/js': 'mdiJs',
          echarts: 'echarts',
          docx: 'docx',
          jszip: 'JSZip',
          qrcode: 'QRCode',
          plyr: 'Plyr',
          prismjs: 'Prism',
          '@wanghe1995/docx-editor-core': 'DocxEditorCore',
          '@wanghe1995/docx-editor-schema': 'DocxEditorSchema',
          '@wanghe1995/docx-editor-state': 'DocxEditorState',
          '@wanghe1995/docx-editor-transform': 'DocxEditorTransform',
          '@wanghe1995/docx-editor-view': 'DocxEditorView',
          '@wanghe1995/docx-editor-history': 'DocxEditorHistory',
          '@wanghe1995/docx-editor-keymap': 'DocxEditorKeymap',
          '@wanghe1995/docx-editor-commands': 'DocxEditorCommands',
          '@wanghe1995/docx-editor-ai': 'DocxEditorAi',
          '@wanghe1995/docx-editor-chart': 'DocxEditorChart',
          '@wanghe1995/docx-editor-collaboration': 'DocxEditorCollaboration',
          '@wanghe1995/docx-editor-comment': 'DocxEditorComment',
          'element-plus/es/locale/lang/zh-cn': 'ElementPlusLocaleZhCn',
        }
      }
    }
  }
})