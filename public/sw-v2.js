const CACHE_NAME = 'counseling-booking-helper-v2';
const OFFLINE_URL = '/';

// Cache the minimal app shell needed for a basic offline fallback.
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icon.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Never proxy Firebase/Auth/Firestore or API traffic through the service worker.
    if (
        event.request.method !== 'GET' ||
        requestUrl.origin !== self.location.origin ||
        requestUrl.pathname.startsWith('/api/')
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok && event.request.url.startsWith('http')) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match(OFFLINE_URL);
                    }

                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

self.addEventListener('push', (event) => {
    let data = {
        title: '상담 예약 도우미',
        body: '새로운 상담 예약 알림이 있습니다.',
    };

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
        tag: data.tag || 'counseling-booking-helper-notification',
        data: {
            url: data.url || '/',
        },
        actions: [
            { action: 'open', title: '열기' },
            { action: 'close', title: '닫기' },
        ],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }

            return self.clients.openWindow(urlToOpen);
        })
    );
});
