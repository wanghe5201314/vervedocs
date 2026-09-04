import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      entryRoot: 'src',
      outDir: 'dist',
      insertTypesEntry: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'VerveDocDocxParser',
      formats: ['es'],
      fileName: 'docx-parser',
    },
    rollupOptions: {
      external: (id) =>
        id === 'jszip' ||
        id.startsWith('jszip/') ||
        id === 'docx' ||
        id.startsWith('docx/') ||
        id === '@vervedoc/docx-editor-schema' ||
        id.startsWith('@vervedoc/docx-editor-schema/'),
      output: {
        exports: 'named',
      },
    },
    sourcemap: false,
    emptyOutDir: true,
  },
})
