// Update cache names any time any of the cached files change.
const CACHE_NAME = 'static-cache-v6'

// Add list of files to cache here.
const FILES_TO_CACHE = [
    '/index.html',
    '/build/bundle.js',
    '/build/bundle.css'
]

const staticAssets = new Set(FILES_TO_CACHE)

self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install')

    event.waitUntil(
        caches.open(CACHE_NAME)
              .then(cache => {
                  console.log('[ServiceWorker] Pre-caching offline page')
                  return cache.addAll(FILES_TO_CACHE)
              })
    )

    self.skipWaiting()
})

self.addEventListener('activate', event => {
    console.log(`[ServiceWorker] Activate: ${CACHE_NAME}`)

    // Remove previous cached data from disk.
    event.waitUntil(
        caches.keys()
              .then(keyList => {
                  return Promise.all(keyList.map((key) => {
                      if (key !== CACHE_NAME) {
                          console.log('[ServiceWorker] Removing old cache', key)
                          return caches.delete(key)
                      }
                  }))
              })
    )

    self.clients.claim()
});

// self.addEventListener('fetch', event => {
//     event.respondWith(
//         caches.match(event.request)
//               .then(response => {
//                   return response || fetch(event.request);
//               })
//     )
// })


async function fetchAndCache (request) {
    const cache = await caches.open(CACHE_NAME)
    try {
        const response = await fetch(request)
        await cache.put(request, response.clone())
        return response
    } catch (err) {
        const response = await cache.match(request)
        if (response) return response
        throw err
    }
}

// listen for the fetch events
self.addEventListener('fetch', (event) => {

    if (event.request.method !== 'GET' || event.request.headers.has('range'))
        return

    const url = new URL(event.request.url)

    const isHttp = url.protocol.startsWith('http')
    const isDevServerRequest = url.hostname === self.location.hostname && url.port !== self.location.port
    const isStaticAsset = url.host === self.location.host && staticAssets.has(url.pathname)

    if (isHttp && !isDevServerRequest && isStaticAsset) {
        event.respondWith(
            (async () => {
                // always serve static files and bundler-generated assets from cache.
                // if your application has other URLs with data that will never change,
                // set this variable to true for them and they will only be fetched once.
                const cachedAsset = isStaticAsset && (await caches.match(event.request))
                return cachedAsset || fetchAndCache(event.request)
            })()
        )
    }
})
