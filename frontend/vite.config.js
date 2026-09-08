import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import frappeuiPlugin from 'frappe-ui/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/assets/taskflow/frontend/',
  plugins: [
    frappeuiPlugin({
      frappeProxy: false,
      buildConfig: false,
    }),
    vue(),
  ],
  server: {
    port: 8080,
    proxy: {
      '^/(app|api|assets|files|private)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: `../${path.basename(path.resolve('..'))}/public/frontend`,
    emptyOutDir: true,
    target: 'es2015',
  },
})
