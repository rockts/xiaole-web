import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// Config for Vue 3 + Vite
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        host: '0.0.0.0',
        port: 3000,
        proxy: {
            // 后端 API 代理 - 所有后端路径都转发到 8000
            '/token': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/health': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/ws': {
                target: 'ws://127.0.0.1:8000',
                ws: true,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('proxy error', err);
                    });
                }
            },
            '/sessions': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/session': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/messages': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/chat': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/files': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/static': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/memory': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/analytics': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/documents': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/tasks': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/tools': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/reminders': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/voice': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/feedback': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/faces': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/dashboard': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/vision': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/schedule': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
})
