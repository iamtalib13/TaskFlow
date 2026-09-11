import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import frappeuiPlugin from 'frappe-ui/vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/assets/taskflow/frontend/' : '/',
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
        target: 'http://sahayog.com:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
  optimizeDeps: {
    exclude: ['frappe-ui'],
  },
  build: {
    outDir: `../${path.basename(path.resolve('..'))}/public/frontend`,
    emptyOutDir: true,
    target: 'es2015',
  },
}))
