import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { resolve } from 'path';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var isLib = mode === 'lib';
    var isExternal = function (id) {
        if (['vue', 'ant-design-vue', '@mdi/js'].includes(id)) {
            return true;
        }
        return false;
    };
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
                external: isExternal,
                onwarn: function (warning, warn) {
                    if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('"use client"')) {
                        return;
                    }
                    warn(warning);
                },
                output: {
                    globals: {
                        vue: 'Vue',
                        'ant-design-vue': 'antd',
                        '@mdi/js': 'MdiJs',
                    },
                    chunkFileNames: 'chunks/[name]-[hash].js',
                    assetFileNames: 'assets/[name]-[hash][extname]',
                    manualChunks: function (id) {
                        if (id.includes('node_modules/exceljs')) {
                            return 'exceljs';
                        }
                        if (id.includes('node_modules/@univerjs/') || id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/rxjs')) {
                            if (id.includes('/locale/en-US'))
                                return 'univer-locale-en';
                            if (id.includes('/locale/zh-CN'))
                                return 'univer-locale-zh';
                            if (id.includes('/locale/'))
                                return 'univer-locales';
                            return 'univer-core';
                        }
                        return undefined;
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
    };
});
