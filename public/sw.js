// 小乐 AI 管家 Service Worker
// 版本号用于缓存更新
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `xiaole-ai-${CACHE_VERSION}`;

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/',
    '/favicon-dark.png',
    '/favicon-light.png',
    '/logo-xiaole.svg',
    '/manifest.json'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // 跳过等待，立即激活
                return self.skipWaiting();
            })
    );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // 删除旧版本缓存
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('xiaole-ai-') && name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                // 立即控制所有页面
                return self.clients.claim();
            })
    );
});

// 处理 fetch 请求
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 只处理同源请求
    if (url.origin !== self.location.origin) {
        return;
    }

    // API 请求不缓存，直接走网络
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
        return;
    }

    // 对于导航请求（页面），使用网络优先策略
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // 网络失败时返回缓存的首页
                    return caches.match('/');
                })
        );
        return;
    }

    // 对于静态资源，使用缓存优先策略
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then((response) => {
                        // 检查响应是否有效
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 克隆响应用于缓存
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            });

                        return response;
                    });
            })
    );
});

// 处理推送通知（预留）
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || '你有新消息',
        icon: '/favicon-dark.png',
        badge: '/favicon-dark.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || '小乐 AI', options)
    );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window' })
            .then((clients) => {
                // 如果已有窗口打开，聚焦到它
                for (const client of clients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // 否则打开新窗口
                if (self.clients.openWindow) {
                    return self.clients.openWindow(url);
                }
            })
    );
});
