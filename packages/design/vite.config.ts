import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      outDir: 'dist',
      rollupTypes: false
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VerveDocDesign',
      formats: ['es'],
      fileName: 'vervedoc-design'
    },
    rollupOptions: {
      output: {
        dir: 'dist'
      }
    },
    sourcemap: false
  }
})
