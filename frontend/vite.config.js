import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { webserver_port } from '../../../sites/common_site_config.json'

const proxyTarget = `http://127.0.0.1:${webserver_port}`

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/assets': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/files': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/private/files': {
        target: proxyTarget,
        changeOrigin: true,
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
  optimizeDeps: {
    include: ['frappe-ui > feather-icons', 'showdown', 'engine.io-client'],
  },
})
