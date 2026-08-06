/**
 * Service Worker de Wedingo.
 *
 * Estrategia de caché:
 * - Los assets del build (/assets/*.js, *.css) son inmutables (hash) y se
 *   PRECACAN al instalar: el plugin de Vite inyecta la lista real en
 *   `__PRECACHE_ASSETS__` durante cada build.
 * - Navegaciones: network-first con caída a offline.html sin conexión.
 * - Fuentes de Google (fonts.gstatic.com) y assets: cache-first.
 *
 * El número de versión de la caché cambia en cada build (__SW_VERSION__)
 * para invalidar los caches antiguos al actualizar la app.
 */
const SW_VERSION = "__SW_VERSION__";
const STATIC_CACHE = `wedingo-static-${SW_VERSION}`;
const FONT_CACHE = `wedingo-fonts-${SW_VERSION}`;

/* Lista de recursos que se precachean al instalar el SW.
 * El plugin de Vite sustituye __PRECACHE_ASSETS__ por los ficheros
 * reales del build (hashed) en el momento de compilar. */
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/favicon16.png",
  "/favicon32.png",
  "/favicon96.png",
  "/favicon192.png",
  "/favicon512.png",
  "/manifest.json",
  // Tipografías autoalojadas (incluida la de accesibilidad) para que la
  // primera carga sin conexión no quede sin fuentes.
  "/fonts/PlayfairDisplay-normal-400.woff2",
  "/fonts/PlayfairDisplay-italic-400.woff2",
  "/fonts/PlayfairDisplay-normal-700.woff2",
  "/fonts/Lora-normal-400.woff2",
  "/fonts/Lora-italic-400.woff2",
  "/fonts/Lora-normal-700.woff2",
  "/fonts/GreatVibes-normal-400.woff2",
  "/fonts/OpenDyslexic-Regular.otf",
  ...__PRECACHE_ASSETS__,
];

self.addEventListener("install", (event) => {
  // Precachea todos los recursos esenciales (la SPA funciona tras instalar).
  // Se usa allSettled de requests individuales: si UNA URL falla (404/cuota),
  // el resto se sigue cacheando (addAll rechazaba todo y el offline quedaba
  // roto con un SW vacío).
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Elimina los caches de versiones anteriores.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== FONT_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/** Almacena una respuesta en la caché indicada si es satisfactoria. */
function putCache(cacheName, request, response) {
  if (!response || response.status !== 200 || response.type === "opaque") return;
  const clone = response.clone();
  caches.open(cacheName).then((cache) => cache.put(request, clone));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Navegaciones: red primero; sin conexión se sirve la SPA precachead
  // (la invitación funciona offline) y offline.html solo como último recurso.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html").then((r) => r || caches.match("/offline.html"))
      )
    );
    return;
  }

  // Fuentes de Google: cache-first (evitan redes caras por visita).
  if (url.hostname === "fonts.gstatic.com" || url.pathname.endsWith(".woff2") || url.pathname.endsWith(".woff")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          putCache(FONT_CACHE, request, response);
          return response;
        });
      })
    );
    return;
  }

  // Solo se cachean recursos del mismo origen.
  if (url.origin !== self.location.origin) return;

  // Assets con hash inmutable: cache-first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          putCache(STATIC_CACHE, request, response);
          return response;
        });
      })
    );
    return;
  }

  // Resto (same-origin): stale-while-revalidate SOLO para recursos estáticos
  // (HTML, JS, CSS, imágenes y fuentes). Nunca se cachean respuestas JSON o
  // de API para no servir datos de la invitación desde caché.
  const staticExt = /\.(html?|js|mjs|css|png|jpe?g|gif|svg|webp|ico|woff2?|otf|ttf)$/;
  if (!staticExt.test(url.pathname)) {
    // Navegaciones no estáticas o respuestas de datos: red directa.
    event.respondWith(fetch(request));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        putCache(STATIC_CACHE, request, response);
        return response;
      });
      return cached || network;
    }).catch(() => caches.match(request))
  );
});
