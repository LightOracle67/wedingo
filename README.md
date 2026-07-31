# Wedingo

Plataforma web para crear y gestionar invitaciones de boda personalizadas.

**Versión actual:** [v2.35.0](https://github.com/LightOracle67/wedingo/releases/tag/v2.35.0)  
**Stack:** React 19 + TypeScript 7 + Vite 8 + Firebase (Firestore, Auth, Hosting)  
**Tests:** Vitest + Playwright + axe-core | **CI/CD:** GitHub Actions  

---

## Estado del proyecto

| Aspecto | Estado |
|---|---|
| Tests | 1590 tests, 139 test files |
| Cobertura | ~87% statements |
| Lint | 0 warnings (oxlint) |
| TypeScript | 0 errors (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck=false`) |
| `any` en source | 0 |
| `!important` en CSS | 41 |
| Idiomas | 100 |
| Temas | 21 (7 claros, 7 oscuros, 7 LGTBIQ+) |
| Bundle (crítico) | ~972KB (index + vendor chunks) + Sentry lazy (~264KB) |

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
| **Hero** | Foto de novios (circular, máscara radial 60-100%, borde dorado animado), countdown, padrinos, mensaje |
| **Details** | Fecha, hora, lugar, mapa (Google Maps Embed sin API key), transporte, botón calendario |
| **Info** | Horario, código de vestimenta, política infantil |
| **Story** | Historia de amor (texto libre) |
| **Gallery** | Galería de fotos con lightbox, carrusel automático, descripciones |
| **Gifts** | Información de regalos + IBAN (cifrado) |
| **Accommodation** | Información de alojamiento |
| **RSVP** | Confirmación individual con acompañantes, menú, alergias, consents |

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
- `compressImage`: WebP con calidad progresiva + reducción de dimensiones (≤300KB target)
- `compressImageTransparent`: WebP con alpha, fallback a PNG (preserva transparencia)
- Canvas sin fondo blanco (no JPEG, que no soporta alpha)
- `saveConfigImage`: cifra AES-256-GCM + PBKDF2 (600K iteraciones) antes de guardar

**Audio:**
- `compressAudio`: normalización, resample a 22050Hz, codificación base64
- Fragmentación en chunks de 200KB, batches múltiples para evitar límite 11MB de Firestore
- Sin límite de duración (canción completa)

---

## Sesión y autenticación

- **Token de acceso:** único por invitación (`_activeSetupToken`), generado al primer guardado
- **Sesión en localStorage:** tipo, identificador, TTL 24h (persiste al cerrar navegador)
- **Sesión en Firestore:** `activeSession: serverTimestamp()`, renovación cada 60s
- **Reparación automática:** si `activeSession` falta en Firestore, se restaura al recargar
- **Login:** username + setup token, transacción Firestore atómica, TOCTOU protegido
- **Logout:** limpia localStorage + Firestore + caché
- **Rate limiting:** 3 intentos → bloqueo 30s

### Flujo de sesión

```
Login → runTransaction({ activeSession, sessionExpiresAt }) → saveSession(localStorage)
Recarga → getSession(localStorage) → getDoc(Firestore)
  ├─ activeSession válida → restaurar ✅
  ├─ activeSession ausente → reparar (updateDoc) → restaurar ✅
  └─ sesión expirada → clearSession()
Renovación (60s) → updateDoc + renewSession(localStorage)
Logout → clearSession() + updateDoc(null, null)
```

---

## Seguridad

| Medida | Implementación |
|---|---|
| Cifrado | AES-256-GCM + PBKDF2 (600K iteraciones) |
| CSP | Headers HTTP + meta tag: self, Firebase, Google APIs, Sentry, OSM, Google Fonts |
| Firestore | Reglas con validación de sesión activa, XSS protection (`isSafeText`), límites de tamaño |
| Tokens | Únicos por invitación, renovación 60s, expiración 24h |
| Autenticación | SuperAdmin con Firebase Auth |
| Almacenamiento | Consentimiento GDPR para localStorage |
| Headers | HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict |
| Permissions-Policy | cámara/micrófono/geolocalización bloqueados |

---

## Mapa

**Google Maps Embed** (sin API key):
```
https://maps.google.com/maps?q=41.3874,2.1686&hl=es&z=14&output=embed
```
- `<iframe>` nativo, sin dependencias externas
- Geocodificación vía Nominatim (OpenStreetMap) como fallback
- Reemplaza Leaflet (eliminado en v2.34.0)

---

## Decoraciones

- **Eucalipto:** imágenes laterales animadas (float + wind-sway)
- **Esquinas:** imagen decorativa subible (PNG/SVG, una imagen para las 4 esquinas)
- **Luces:** 24 fireflies animados con 6 colores, 4 trayectorias
- **Sello:** imagen personalizada dentro de la cera roja y como fondo tras el texto dorado
- **Envelope:** animación 3D (flap, sello cera, flash blanco, texto dorado, partículas orbitales)
- **Fondo:** imagen semi-transparente en cada `.story-card` vía CSS `--story-card-user-bg`

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

---

## Licencia

MIT © 2026 Adrián Carrasco López
