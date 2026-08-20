import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { resolve } from 'path';
export default defineConfig({
    plugins: [
        vue(),
        cssInjectedByJsPlugin(),
        dts({
            include: ['src/**/*.ts', 'src/**/*.vue'],
            outDir: 'dist',
            rollupTypes: false
        })
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                additionalData: `@use "${resolve(__dirname, 'src/assets/styles/_mixins.scss').replace(/\\/g, '/')}" as *;\n`,
                silenceDeprecations: ['import', 'global-builtin', 'slash-div'],
            },
        },
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'PptEditorUI',
            formats: ['es'],
            fileName: 'ppt-editor-ui'
        },
        rollupOptions: {
            external: [
                'vue',
                'ant-design-vue',
                '@ant-design/icons-vue',
                '@mdi/js',
                '@icon-park/vue-next',
                'chartist',
                'pptxgenjs',
                /^prosemirror-.*/,
                'file-saver',
                'html-to-image',
                'jszip',
                'lodash',
                'dexie',
                'crypto-js',
                'clipboard',
                'tinycolor2',
                'nanoid',
                'mitt',
                'vuedraggable',
                'hfmath',
                'animate.css',
                'svg-pathdata',
                'svg-arc-to-cubic-bezier',
                /^@univerjs\/.*/,
                'react',
                'react-dom',
                'rxjs',
            ],
            output: {
                globals: {
                    vue: 'Vue',
                    'ant-design-vue': 'antd',
                    '@mdi/js': 'MdiJs',
                },
                dir: 'dist'
            }
        },
        emptyOutDir: true,
        outDir: 'dist'
    }
});
//# sourceMappingURL=vite.lib.config.js.map