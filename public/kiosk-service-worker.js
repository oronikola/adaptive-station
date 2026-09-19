const CACHE_NAME = 'adaptive-station-kiosk-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    const isKioskShell = url.pathname === '/kiosk';
    const isBuildAsset = url.pathname.startsWith('/build/');
    if (!isKioskShell && !isBuildAsset) {
        return;
    }

    event.respondWith((async () => {
        try {
            const response = await fetch(request);
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
            return response;
        } catch {
            const cached = await caches.match(request);
            if (cached) {
                return cached;
            }

            throw new Error('The kiosk shell is not cached yet. Connect once to finish setup.');
        }
    })());
});
