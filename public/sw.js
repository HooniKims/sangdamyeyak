const CACHE_NAME = 'schoolholic-v1';
const OFFLINE_URL = '/';

// 캐싱할 정적 자원
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icon.svg',
];

// 설치 이벤트 - 정적 자원 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// 활성화 이벤트 - 이전 캐시 정리
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// 네트워크 우선 전략 (Network First)
self.addEventListener('fetch', (event) => {
    // API 요청은 항상 네트워크 우선
    if (event.request.url.includes('/api/') ||
        event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebase')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: '오프라인 상태입니다.' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503,
                });
            })
        );
        return;
    }

    // 정적 자원은 Network First with Cache Fallback
    if (event.request.method === 'GET') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // 성공 응답을 캐시에 저장 (http/https 프로토콜만 지원)
                    if (response.status === 200 && (event.request.url.startsWith('http'))) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // 오프라인 시 캐시에서 제공
                    return caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // HTML 요청이면 오프라인 페이지 반환
                        if (event.request.headers.get('accept')?.includes('text/html')) {
                            return caches.match(OFFLINE_URL);
                        }
                        return new Response('오프라인 상태입니다.', { status: 503 });
                    });
                })
        );
    }
});

// 푸시 알림 수신 처리
self.addEventListener('push', (event) => {
    let data = { title: '스쿨홀릭', body: '새로운 알림이 있습니다.' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'schoolholic-notification',
        data: {
            url: data.url || '/',
        },
        actions: [
            { action: 'open', title: '열기' },
            { action: 'close', title: '닫기' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 이미 열려있는 탭이 있으면 포커스
            for (const client of clientList) {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // 없으면 새 탭 열기
            return self.clients.openWindow(urlToOpen);
        })
    );
});
