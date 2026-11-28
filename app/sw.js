import { defaultCache } from "@serwist/next/worker"
import { Serwist, NetworkFirst, CacheFirst, ExpirationPlugin } from "serwist"

const PAGE_CACHE = "rodcroft-pages"
const STATIC_CACHE = "rodcroft-static"
const pagePlugins = [
  new ExpirationPlugin({
    maxEntries: 96,
    maxAgeSeconds: 14 * 24 * 60 * 60,
  }),
]

/**
 * Airplane mode / no signal: serve the last cached page immediately.
 * Online: race the network briefly, then fall back to cache so hops stay snappy.
 */
class OfflineFirstNavigation extends NetworkFirst {
  async handle(options) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const cache = await caches.open(PAGE_CACHE)
      const cached =
        (await cache.match(options.request, { ignoreSearch: true })) ||
        (await cache.match(options.request))
      if (cached) return cached
    }
    return super.handle(options)
  }
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new OfflineFirstNavigation({
        cacheName: PAGE_CACHE,
        // Was 3s — every offline/weak-signal hop felt stuck. Keep under 1s.
        networkTimeoutSeconds: 0.8,
        plugins: pagePlugins,
      }),
    },
    // Next static + RSC flight assets for smooth client navigations offline.
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/_next/data/") ||
        url.pathname.startsWith("/icons/") ||
        url.pathname === "/favicon.svg" ||
        (request.destination === "script" && url.pathname.startsWith("/_next/")),
      handler: new CacheFirst({
        cacheName: STATIC_CACHE,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 280,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        // Last resort only when this URL was never cached while online.
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document"
        },
      },
    ],
  },
})

serwist.addEventListeners()
