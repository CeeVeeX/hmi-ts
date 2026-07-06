import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { libInjectCss } from 'vite-plugin-lib-inject-css'

export default defineConfig({
  plugins: [vue(), libInjectCss()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        components: resolve(__dirname, 'src/components/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'index') {
            return 'index.js'
          }

          if (chunkInfo.name === 'components') {
            return 'components/index.js'
          }

          return '[name].js'
        },
      },
    },
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
  },
})
