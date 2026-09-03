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
      name: 'VerveDocExcelParser',
      formats: ['es'],
      fileName: 'excel-parser',
    },
    rollupOptions: {
      external: (id) => id === 'exceljs' || id.startsWith('exceljs/'),
      output: {
        exports: 'named',
      },
    },
    sourcemap: false,
    emptyOutDir: true,
  },
})
