const CACHE = 'prixburg-lowdata-v15';
const PRECACHE = [
    './',
    './index.html',
    './login.html',
    './app.css',
    './supabase-config.js',
    './db.js',
    './permitted_users.js',
    './protect_user.js',
    './nav.js',
    './gates.js',
    './manufacturing-factory.html',
    './sales-finance.html',
    './ceo-analysis.html',
    './ceo-net-profit.html',
    './ceo-gross-profit.html',
    './sales-analysis-reports.html',
    './profit-expense-reports.html',
    './outstanding-credit.html',
    './outstanding-credit-entry.html',
    './production-reports.html',
    './finished-products.html',
    './raw-materials.html'
];

self.addEventListener('message', function (event) {
    if (event && event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            return Promise.all(PRECACHE.map(function (url) {
                return cache.add(url).catch(function () {});
            }));
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            const hadOlderCopy = keys.some(function (key) { return key !== CACHE; });
            return Promise.all(keys.filter(function (key) {
                return key !== CACHE;
            }).map(function (key) {
                return caches.delete(key);
            })).then(function () {
                return hadOlderCopy;
            });
        }).then(function (hadOlderCopy) {
            return self.clients.claim().then(function () {
                return hadOlderCopy;
            });
        }).then(function (hadOlderCopy) {
            if (!hadOlderCopy) return;
            return self.clients.matchAll({ type: 'window' }).then(function (clients) {
                return Promise.all(clients.map(function (client) {
                    if (!client.url || client.url.indexOf(self.location.origin) !== 0) return null;
                    return client.navigate(client.url);
                }));
            });
        })
    );
});

function isHomePath(pathname) {
    return pathname === '/' || pathname === '' || /\/index\.html$/i.test(pathname);
}

function offlinePageResponse(requestUrl) {
    const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Prixburg - Offline</title><style>body{font-family:system-ui,sans-serif;margin:40px;background:#f4f4f5;color:#09090b}a{color:#09090b;font-weight:600}</style></head><body><h1>Page unavailable</h1><p>Prixburg could not open that screen. Check your connection, then try again.</p><p><a href="./index.html">Back to Home</a></p><p style="color:#71717a;font-size:13px">' + String(requestUrl || '').replace(/[<>&]/g, '') + '</p></body></html>';
    return new Response(html, {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}

function savedCopy(cache, request) {
    const url = new URL(request.url);
    const matchOpts = request.mode === 'navigate' ? { ignoreSearch: true } : undefined;
    return cache.match(request, matchOpts).then(function (cached) {
        if (cached) return cached;
        if (request.mode !== 'navigate') return Promise.reject(new Error('offline'));
        // Never substitute Home for another route — that made clicks look broken.
        if (isHomePath(url.pathname)) {
            return cache.match('./index.html').then(function (home) {
                return home || cache.match('./login.html') || offlinePageResponse(request.url);
            });
        }
        return offlinePageResponse(request.url);
    });
}

self.addEventListener('fetch', function (event) {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.split('/').pop() === 'sw.js') return;

    event.respondWith(
        caches.open(CACHE).then(function (cache) {
            return fetch(request, { cache: 'no-store', credentials: 'same-origin' }).then(function (response) {
                if (response && response.ok) cache.put(request, response.clone()).catch(function () {});
                return response;
            }).catch(function () {
                return savedCopy(cache, request);
            });
        })
    );
});
