# Wedingo

Plataforma web para crear y gestionar invitaciones de boda personalizadas.

**Versión actual:** [v2.95.15](https://github.com/LightOracle67/wedingo/releases/tag/v2.95.15)  
**Stack:** React 19 + TypeScript 7 + Vite 8 + Firebase (Firestore, Auth, Hosting)  
**Tests:** Vitest + Playwright + axe-core | **CI/CD:** GitHub Actions  

---

## Estado del proyecto

| Aspecto | Estado |
|---|---|
| Tests | 1934 tests, 145 test files |
| Cobertura | 95.1% statements / 92.5% branches / 94.1% functions / 96.7% lines |
| Lint | 0 warnings (oxlint) |
| TypeScript | 0 errors (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck=true` — solo .d.ts de terceros) |
| `any` en source | 0 |
| `!important` en CSS | 41 |
| Idiomas | 100 |
| Temas | 21 (7 claros, 7 oscuros, 7 LGTBIQ+) |
| Bundle (crítico) | ~317KB gzip (JS inicial, analytics y Sentry en chunks lazy) |

---

## Rutas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `LandingPage` | Crear invitación o acceder con código |
| `/:inviteToken` | `PublicInvitation` | Invitación pública (8 secciones dinámicas) |
| `/:inviteToken/setup` | `SetupPage` | Configuración inicial |
| `/:inviteToken/admin` | `AdminPage` | Panel de administración (6 pestañas) |
| `/:inviteToken/print` | `PrintPage` | Tarjeta imprimible |
| `/${SUPERADMIN_ROUTE}` | `SuperAdminLogin` | Login de superadmin |
| `/${SUPERADMIN_DASHBOARD}` | `SuperAdminPanel` | Gestión de plataforma |

---

## Funcionalidades

### Invitación pública

8 secciones renderizadas dinámicamente según `config.sectionOrder`:

| Sección | Contenido |
|---|---|
| **Hero** | Foto de novios (circular, máscara radial 60-100%, borde dorado animado), countdown calendárico (años/meses/días), padrinos, mensaje |
| **Details** | Fecha+hora, botón calendario, ubicación, mapa (Google Maps Embed sin API key), mensaje de confirmación |
| **Info** | Horario, código de vestimenta, política infantil |
| **Story** | Historia de amor (texto libre) |
| **Gallery** | Galería de fotos con lightbox, carrusel automático, descripciones |
| **Gifts** | Información de regalos + IBAN (cifrado) |
| **Accommodation** | Información de alojamiento |
| **Transport** | Opciones de transporte (autobús/taxi/ambos), salidas con hora y mapa, o mensaje de coche propio |

### RSVP

- Modelo individual: cada persona elige `solo/a` / `con acompañantes` / `no asiste`
- Acompañantes con nombre + menú + alergias (checkboxes + texto libre "otras alergias")
- **Cada acompañante tiene su propio documento Firestore** (writeBatch), vinculado al principal
- Primer acompañante obligatorio (sin botón ✕)
- Validación completa: fecha nacimiento, consentimiento parental (<14), consentimiento salud (si alergias), menú (si activado)
- Prefill al escribir el nombre: restaura datos del invitado y acompañantes
- Banner informativo "Acompañas a X" para acompañantes
- Cache local sin sobrescritura de datos de acompañantes
- Select de asistencia con `width: auto; min-width: 180px`
- Menú por platos (menú fijo o seleccionable) con orden predefinido y descripción al elegir
- Elección de transporte en dos pasos (medio + salida con sitio y hora 24h), guardada en Firestore

### Panel de administración (6 pestañas)

| Pestaña | Funcionalidad |
|---|---|
| **Panel** | Dashboard: stats (confirmados/declinados/pendientes/visitas), últimas respuestas, backup/restore |
| **Invitación** | Editor completo de la configuración |
| **Asistencia** | CRUD completo: tabla con filtros, búsqueda, paginación, checkboxes selección múltiple, delete batch, columna "Acompaña a", export PDF |
| **Compartir** | Enlace público, WhatsApp/Telegram/SMS, mensaje aleatorio personalizable |
| **Acceso** | Gestión de token, logout, eliminar invitación completa |
| **Soporte** | Ayuda, derechos ARSO (GDPR/CCPA/LGPD), contacto |

### Temas (21)

7 claros, 7 oscuros, 7 LGTBIQ+, cada uno con `--invite-core-color` único.

| Claros | Oscuros | LGTBIQ+ |
|---|---|---|
| Golden, Forest, Rose | Amber-night, Onyx-gold, Midnight-royal | Rainbow, Trans, Nonbinary |
| Linen-soft, Blush-pearl | Burgundy-velvet, Sapphire-night | Lesbian, Bi, Pan, Ace |
| Lavender-mist, Champagne-bubble | Emerald-grove, Plum-twilight | |

- Textos oscuros con sombras claras en temas oscuros
- Textos claros con sombras oscuras en temas claros
- Fondos animados con glow radial por tema en body

### Idiomas

100 idiomas vía `react-i18next` + `i18next-browser-languagedetector`.  
Selector en el pie de página y barra de admin. Carga bajo demanda con `i18next-resources-to-backend`.

---

## Almacenamiento de imágenes

Para evitar el límite de 1MB por documento en Firestore, las imágenes se guardan en **subcolecciones** cifradas:

```
/invitations/{token}/configImages/{imageId}   → foto, sello, fondo, esquinas
/invitations/{token}/gallery/{imageId}        → galería (10 slots)
/invitations/{token}/audio/{docId}            → audio fragmentado (200KB chunks)
```

El documento de configuración solo contiene referencias (`__cfgimg:couplePhoto`), no data URLs.

**Compresión de imágenes:**
- `compressImage`: WebP con calidad progresiva + reducción de dimensiones (≤300KB target para usos ligeros; alta calidad 1920px/~450KB para foto de novios, fondo y galería)
- `compressImageTransparent`: WebP con alpha, fallback a PNG (preserva transparencia)
- Canvas sin fondo blanco (no JPEG, que no soporta alpha)
- `saveConfigImage`: cifra AES-256-GCM + PBKDF2 (600K iteraciones) antes de guardar

**Audio:**
- `compressAudio`: normalización, resample a 22050Hz, codificación base64
- Fragmentación en chunks de 200KB, batches múltiples para evitar límite 11MB de Firestore
- Sin límite de duración (canción completa)

---

## Sesión y autenticación

- **Token de acceso:** único por invitación, guardado como **hash SHA-256** en la colección privada `setupTokens` (documentId = hash, no enumerable); el documento público de la invitación no contiene el token
- **Prueba de conocimiento:** activar una sesión exige conocer el token (el hash se compara contra `setupTokens/{hash}`); `get` está permitido sin sesión (el login lo necesita antes de activarla), `list` denegado
- **Sesión en sessionStorage:** tipo, identificador, TTL 60 min (no persiste al cerrar el navegador)
- **Sesión en Firestore:** `activeSession` + `sessionExpiresAt` (TTL 60 min, mínimo de 30 min para absorber latencia de reloj), renovación cada 60s
- **Reparación automática:** si `activeSession` falta o expiró en Firestore, se repara/migra al recargar
- **Login:** username + setup token, transacción Firestore atómica con `setupTokens/{hash}`, TOCTOU protegido
- **Logout:** limpia sessionStorage + Firestore + caché
- **Rate limiting:** 30s de bloqueo tras intentos fallidos en el login

### Flujo de sesión

```
Login → leer setupTokens/{hash(token)} → runTransaction({ activeSession, sessionExpiresAt, setupTokenHash }) → saveSession(sessionStorage)
Recarga → getSession(sessionStorage) → getDoc(Firestore)
  ├─ activeSession + sessionExpiresAt válidas → restaurar ✅
  ├─ sesión inactiva/expirada → reparar (prueba de token + updateDoc) → restaurar ✅
  └─ documento inexistente → clearSession()
Renovación (60s) → updateDoc(sessionExpiresAt) + renewSession(sessionStorage)
Logout → clearSession() + updateDoc(null, null)
```

---

## Seguridad

| Medida | Implementación |
|---|---|
| Cifrado | AES-256-GCM + PBKDF2 (600K iteraciones) |
| CSP | Headers HTTP + meta tag: self, Firebase, Google APIs, Sentry, Google Fonts |
| Firestore | Reglas con validación de sesión activa, XSS protection (`isSafeText`), límites de tamaño, invitations y setupTokens no enumerables |
| Tokens | Hash SHA-256 en `setupTokens` (documentId = hash), prueba de conocimiento para activar la sesión, TTL 60 min |
| Autenticación | SuperAdmin con Firebase Auth |
| Almacenamiento | Consentimiento GDPR para localStorage/sessionStorage |
| Headers | HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict |
| Permissions-Policy | cámara/micrófono/geolocalización bloqueados |

---

## Mapa

**Google Maps Embed** (sin API key) a partir de la URL de lugar compartida:
```
https://www.google.com/maps/place/Nombre+del+venue/@lat,lng,17z
```
- Solo se aceptan URLs `google.com/maps/place/...` (enlaces cortos y búsquedas rechazadas en el setup, con validación visual)
- El nombre del lugar se deriva de la URL (no hay campo manual)
- Opciones por invitación: vista **Mapa / Satélite / Híbrido** y **mapa estático** (interacción bloqueada)
- `<iframe>` nativo, sin dependencias externas; reemplaza Leaflet (eliminado en v2.34.0)

---

## Decoraciones

- **Eucalipto:** imágenes laterales animadas (float + wind-sway)
- **Esquinas:** imagen decorativa subible (PNG/SVG, una imagen para las 4 esquinas)
- **Luces:** 20 fireflies animados con 6 colores, 4 trayectorias
- **Sello:** imagen personalizada que llena la cera circular (máscara + cover) y como fondo tras el texto dorado
- **Envelope:** animación 3D (flap, sello cera, flash blanco, texto dorado, partículas orbitales)
- **Fondo:** imagen semi-transparente en cada `.story-card` vía CSS `--story-card-user-bg`, ajustada a la card (cover) y estática frente al scroll

---

## Rendimiento

- **Code splitting:** Sentry lazy (`import("@sentry/react")`), vendor chunks (firebase, react, sentry)
- **Service Worker:** v2 con STATIC_CACHE + FONT_CACHE, cache-first assets, offline fallback
- **Fuentes:** Google Fonts CDN (no bundle), preconnect fonts.gstatic.com
- **Sourcemaps:** condicionales (solo con `SENTRY_AUTH_TOKEN`)
- **Monitorización:** Sentry (errores + rendimiento, prod 0.1 traces), Firebase Analytics, Web Vitals

---

## Scripts

```bash
npm run dev          # Servidor desarrollo (Vite)
npm run build        # Build producción
npm test             # Tests unitarios (Vitest)
npm run test:coverage # Tests con cobertura
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run lint         # Oxlint
npm run e2e          # Tests E2E (Playwright)
npm run deploy       # Build → deploy Firebase Hosting
npm run analyze      # Bundle visualizer
```

## CI/CD (GitHub Actions)

```
push a main → lint → typecheck → test (JUnit) → coverage → audit → build → bundle check → e2e → deploy Firebase
```

## Variables de entorno

```
VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID,
VITE_SUPERADMIN_ROUTE, VITE_ADMIN_EMAILS, VITE_SENTRY_DSN,
SENTRY_AUTH_TOKEN, FIREBASE_TOKEN
```

---

## Historial de versiones

Consulta el [`CHANGELOG`](./src/lib/changelog.ts) completo o las [releases en GitHub](https://github.com/LightOracle67/wedingo/releases).

Hitos principales:

| Versión | Fecha | Hito |
|---|---|---|
| v2.0.1 | 2026-06-30 | Primera versión: accesibilidad, footer, superadmin |
| v2.1.0 | 2026-07-01 | 76+ idiomas, compliance GDPR, Art. 30 |
| v2.2.0 | 2026-07-02 | RSVP acompañantes, animación envelope, fondos por tema |
| v2.4.0 | 2026-07-04 | scroll-snap nativo, glow radial, fireflies |
| v2.7.0 | 2026-07-07 | Envelope animado completo (flash, texto dorado, glow orbital) |
| v2.9.0 | 2026-07-09 | Migración a TypeScript |
| v2.10.0 | 2026-07-10 | Envelope realista (papel, sombra, luces orbitales) |
| v2.13.0 | 2026-07-13 | Bundle 9.0→6.1MB, vendor chunk, Service Worker |
| v2.21.0 | 2026-07-21 | Audio fragmentado, subcolecciones gallery+audio |
| v2.27.0 | 2026-07-27 | 316→0 typecheck errors, strict flags, coverage 75% |
| v2.28.0 | 2026-07-27 | 1611 tests, 0 lint/typecheck, Sentry, Playwright |
| v2.31.0 | 2026-07-29 | Acompañantes con datos obligatorios completos |
| v2.32.0 | 2026-07-29 | AttendanceTab CRUD, columna "Acompañante de" |
| v2.33.0 | 2026-07-30 | Imágenes en subcolección (evita truncado 1MB) |
| v2.34.0 | 2026-07-30 | Google Maps Embed reemplaza Leaflet, logs exhaustivos |
| v2.35.0 | 2026-07-31 | normalizeConfig fix, audio chunks 200KB, changelog reescrito |
| v2.36.0 | 2026-07-31 | CI/CD real (build-and-test, e2e, deploy, sentry-release), react-router v8 |
| v2.36.1 | 2026-07-31 | Ajustes finales CI (e2e, audit, sourcemaps) |
| v2.37.0 | 2026-08-01 | weddingSiteURL, opciones de mapa, fondo/esquinas estáticas, envelope y z-index rediseñados, cuenta atrás calendárica |
| v2.38.0 | 2026-08-01 | Sección Transporte (opciones + salidas con mapa), MapEmbed generalizado |
| v2.39.0 | 2026-08-04 | Hora única type=time, itinerario por eventos, RSVP con elección de transporte (salida+hora guardadas), tabla de asistencia ampliada, panel a 80% sin scroll de página, accesibilidad completa |
| v2.40.0 | 2026-08-04 | Seguridad: token de setup fuera del documento público (hash + setupTokens), sesión con prueba de conocimiento, invitations no enumerable, rate limit RSVP, validación server-side; token visible en el setup con checkbox obligatorio; rendimiento (JS inicial 435→315KB, analytics/sentry lazy, countdown sin re-renders); accesibilidad (focus trap, skip-link); i18n corregido |
| v2.40.1 | 2026-08-04 | Eliminado el modal del token del setup: el token del formulario es el único y se usa para el auto-login al guardar |
| v2.41.0 | 2026-08-04 | Campo Postre en el setup + esquema de RSVP por invitación (`rsvpResponses/{token}/responses`) con contador anti-spam en el documento grupo |
| v2.41.1 | 2026-08-04 | Fix login: `setupTokens/{hash}` legible sin sesión (el login la necesita antes de activarla); list denegado |
| v2.41.2 | 2026-08-04 | Fix login: mínimo de sesión a 30 min (margen sobre el TTL de 60 min) y unidad de minutos corregida |
| v2.41.3 | 2026-08-04 | Eliminado el campo Postre del setup (el postre es un plato más de cada menú) |
| v2.42.0 | 2026-08-04 | Auditoría y limpieza de código legacy: módulos muertos eliminados, campos legacy de configuración y sus fallbacks, tests de reglas al esquema RSVP por invitación |
| v2.43.0 | 2026-08-05 | Cobertura al 90%+ en los 4 umbrales (94.1/90.0/93.8/95.9), ~180 tests nuevos, gate de cobertura a 90/90/90/90 y limpieza de ramas inalcanzables |
| v2.43.1 | 2026-08-05 | Fix recuperación de imágenes (reintentos ante fallos de red) + script de migración a refs `__cfgimg` (doc de invitación de 527KB → 1.7KB) + fix del hint del itinerario `{{max}}` |
| v2.43.2 | 2026-08-05 | Mensaje de bienvenida de Detalles con hora ('La celebración dará comienzo a las XX:XX...') y eliminada la variante que repetía el lugar con la hora |
| v2.44.0 | 2026-08-05 | Código de vestimenta con opción 'Otro' + mensaje personalizado (validación y reglas de Firestore actualizadas) |
| v2.44.1 | 2026-08-05 | Sección hora/lugar: hora como story-note, eliminado el mensaje de bienvenida de Detalles y sus claves i18n sin uso |
| v2.44.2 | 2026-08-05 | Fix imágenes: el auto-guardado migra a configImages (refs `__cfgimg`) en vez de guardar blobs inline; doc de invitación de 844KB → 2.7KB |
| v2.45.0 | 2026-08-05 | Eliminado el soporte legacy del horario (`weddingSchedule`): solo itinerario por eventos, sección oculta si no hay, esquema y reglas limpias |
| v2.45.1 | 2026-08-05 | Texto de la hora de la celebración: "La ceremonia dará comienzo a las XX:XX h." (es/en) |
| v2.46.0 | 2026-08-05 | Calidad de imagen mejorada: foto de novios, fondo y galería a 2400px / ~800KB (antes 1600px / 300KB) |
| v2.46.1 | 2026-08-05 | Fix subida de imágenes: target ajustado a 700KB y guarda de 1MB para no superar el límite de Firestore |
| v2.46.2 | 2026-08-05 | Subida de imágenes: compresión a 1920px/450KB + reintentos ante fallos transitorios de red |
| v2.47.0 | 2026-08-05 | Modo de visualización de mapas por área (iframe / solo nombre / oculto) en boda, transporte y alojamiento |
| v2.47.1 | 2026-08-05 | Título de la sección de invitados: "Horario de la celebración" → "Itinerario" (es/en) |
| v2.48.0 | 2026-08-05 | Secciones sin contenido ocultas en la invitación + auto-desactivación al guardar con aviso; menú oculto en RSVP si no hay platos |
| v2.49.0 | 2026-08-05 | Cobertura de tests ampliada (1784 tests, branches 91.4%, statements 94.5%) |
| v2.50.0 | 2026-08-05 | Cobertura ampliada (1787 tests, branches 91.8%) + umbrales del gate a 94/91/93/96 |
| v2.51.0 | 2026-08-05 | Cobertura ampliada (1801 tests, branches 92.2%, functions 94.1%) |
| v2.52.0 | 2026-08-05 | Cobertura ampliada (1805 tests, branches 92.3%, statements 94.8%) |
| v2.53.0 | 2026-08-05 | Cobertura ampliada (1809 tests, statements 95.1%, branches 92.5%, lines 96.7%) |
| v2.54.0 | 2026-08-05 | Cobertura ampliada (1812 tests, branches 92.5%) |
| v2.55.0 | 2026-08-05 | Cobertura ampliada (1816 tests, branches 92.6%, statements 95.1%) |
| v2.56.0 | 2026-08-05 | Cobertura ampliada (1817 tests) |
| v2.57.0 | 2026-08-05 | Cobertura ampliada (1818 tests, branches 92.6%) |
| v2.58.0 | 2026-08-05 | Cobertura ampliada (1820 tests, functions 94.2%) |
| v2.59.0 | 2026-08-05 | Cobertura ampliada (1822 tests, branches 92.7%) |
| v2.60.0 | 2026-08-05 | Cobertura ampliada (1824 tests) |
| v2.61.0 | 2026-08-05 | Cobertura ampliada (1825 tests, statements 95.3%, lines 96.9%) |
| v2.62.0 | 2026-08-06 | Rendimiento (lazy secciones), PWA offline, SEO dinámico, GDPR autoservicio + consentimiento analytics, accesibilidad galería y contraste |
| v2.63.0 | 2026-08-06 | Seguridad crítica (token legacy y edición con cuentas ajenas), GDPR cleanup PII, reglas reforzadas, rendimiento y accesibilidad |
| v2.64.0 | 2026-08-06 | Bugfix RSVP (contador legible), consentimiento total (Sentry, fuentes autoalojadas), rendimiento (re-renders, image-store, SW), secretos en env, accesibilidad |
| v2.65.0 | 2026-08-06 | Seguridad (storage.rules, _visits, setupTokens, magic bytes JPEG), fix autosave, UX (beforeunload, indicador guardado, lightbox, mapa, menú) |
| v2.66.0 | 2026-08-06 | Funcionalidad (countdown h/m/s, compartir, CSV, descargar foto), analítica de eventos, rendimiento (blur, precache SW), infra (functions, e2e, firebase-tools 15) |
| v2.67.0 | 2026-08-06 | Legalidad (OpenDyslexic local, política con Sentry/GA), SEO (robots, og:image, sitemap, JSON-LD), onboarding, accesibilidad y changelog paginado |
| v2.68.0 | 2026-08-06 | Bugfix (seo, autosave, galería, emuladores), rendimiento (preload, buffer CWV, luciérnagas, fuentes), móvil/CLS y export completo |
| v2.69.0 | 2026-08-06 | Bugfix (audio al borrar, editor música, print, menú, inputs), PWA (actualización, offline SPA, fuentes), lightbox y botones directions/.ics |

---

## Licencia

MIT © 2026 Adrián Carrasco López
