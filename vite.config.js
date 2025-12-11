import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// Config for Vue 3 + Vite
export default defineConfig({
    plugins: [
        vue(),
        // 添加中间件处理 SPA 路由，确保前端路由不被代理
        {
            name: 'spa-routing',
            configureServer(server) {
                // 在代理之前添加中间件，拦截前端路由请求
                server.middlewares.use((req, res, next) => {
                    const url = req.url || ''
                    
                    // 前端路由列表 - 这些路径刷新时应该返回 index.html
                    const frontendRoutes = [
                        '/chat',
                        '/memory',
                        '/behavior',
                        '/tasks',
                        '/task/',
                        '/documents',
                        '/tools',
                        '/reminders',
                        '/settings',
                        '/login',
                        '/share/'
                    ]
                    
                    // 检查是否是前端路由（GET 请求，且 Accept 头包含 text/html）
                    const isHtmlRequest = req.method === 'GET' && 
                        (req.headers.accept || '').includes('text/html')
                    
                    if (isHtmlRequest) {
                        const isFrontendRoute = frontendRoutes.some(route => 
                            url === route || url.startsWith(route + '/') || url.startsWith(route + '?')
                        )
                        
                        if (isFrontendRoute) {
                            console.log('[SPA] 前端路由，返回 index.html:', url)
                            req.url = '/'
                            return next()
                        }
                    }
                    
                    next()
                })
            }
        }
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        host: '0.0.0.0',
        port: 3000,
        // 确保 SPA 路由正确回退到 index.html
        strictPort: false,
        // 添加中间件处理 SPA 路由
        middlewareMode: false,
        proxy: {
            // 后端 API 代理 - 所有后端路径都转发到 8000
            '/token': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/ws': {
                target: 'ws://127.0.0.1:8000',
                ws: true,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('proxy error', err);
                    });
                }
            },
            '/sessions': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/session': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/messages': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/chat/stream': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/chat/sessions': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/api/chat': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            },
            '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/files': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/vision': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/documents': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/memory': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/voice': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/static': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/analytics': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/tasks': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/tools': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/reminders': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/feedback': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/faces': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/dashboard': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/schedule': { target: 'http://127.0.0.1:8000', changeOrigin: true }
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
})
