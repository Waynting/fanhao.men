// Offline support. Bump CACHE_VERSION to drop old caches after a change to this file.
const CACHE_VERSION = "v3"
const PAGE_CACHE = `pages-${CACHE_VERSION}`
const ASSET_CACHE = `assets-${CACHE_VERSION}`
const PRECACHE_PAGES = ["/dashboard", "/dashboard/new", "/explore", "/settings", "/about", "/share"]

const OFFLINE_HTML = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>離線中</title>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:4rem 1rem;color:#18181b">
<h1 style="font-size:1.25rem">目前離線</h1>
<p style="color:#71717a">這個頁面還沒有快取。連上網路後再試一次，或先回到清單。</p>
<p><a href="/dashboard">回到我的清單</a></p></body></html>`

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_PAGES))
      .catch(() => {})
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== PAGE_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Hashed build output never changes: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa-icon/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          })
      )
    )
    return
  }

  // Pages: network first so deploys show up immediately, cache as offline fallback.
  // RSC fetches from client-side navigation are skipped; offline, Next falls back to a
  // full navigation, which lands here.
  // Auth pages carry one-time codes in the URL; never cache them.
  if (request.mode === "navigate" && !url.pathname.startsWith("/auth/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(PAGE_CACHE).then((cache) => cache.put(url.pathname, copy))
          }
          return response
        })
        .catch(() =>
          caches
            .match(url.pathname)
            .then(
              (cached) =>
                cached ||
                new Response(OFFLINE_HTML, {
                  headers: { "Content-Type": "text/html; charset=utf-8" },
                })
            )
        )
    )
  }
})
