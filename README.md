# Wedingo

Plataforma web para crear y gestionar invitaciones de boda personalizadas.

**Versión actual:** [v2.130.0](https://github.com/LightOracle67/wedingo/releases)  
**Stack:** React 19 + TypeScript 7 + Vite 8 + Firebase (Firestore, Auth, Hosting)  
**Tests:** Vitest + Playwright + axe-core | **CI/CD:** GitHub Actions  

---

## Estado del proyecto

| Aspecto | Estado |
|---|---|
| Tests | 2269 tests (vitest) + suite Playwright e2e || Cobertura | 86.0% statements / 75.1% branches / 83.2% functions / 88.1% lines |
| Lint | 0 warnings (oxlint) |
| TypeScript | 0 errors (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `skipLibCheck=true` — solo .d.ts de terceros) |
| `any` en source | 0 |
| `!important` en CSS | 41 |
| Idiomas | 100 |
| Temas | 21 (7 claros, 7 oscuros, 7 LGTBIQ+) |
| Bundle (crítico) | ~272KB gzip (JS inicial: index+vendors; Sentry/changelog/idiomas en chunks lazy) |

---

## Rutas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `LandingPage` | Crear invitación o acceder con código |
| `/:inviteToken` | `PublicInvitation` | Invitación pública (11 secciones dinámicas) |
| `/:inviteToken/setup` | `SetupPage` | Configuración inicial |
| `/:inviteToken/admin` | `AdminPage` | Panel de administración (6 pestañas) |
| `/:inviteToken/print` | `PrintPage` | Tarjeta imprimible |
| `/${SUPERADMIN_ROUTE}` | `SuperAdminLogin` | Login de superadmin |
| `/${SUPERADMIN_DASHBOARD}` | `SuperAdminPanel` | Gestión de plataforma |

---

## Funcionalidades

### Invitación pública

11 secciones renderizadas dinámicamente según `config.sectionOrder`:

| Sección | Contenido |
|---|---|
| **Hero** | Foto de novios (circular, máscara radial 60-100%, borde dorado animado), countdown calendárico (años/meses/días), padrinos, mensaje |
| **Details** | Fecha+hora, botón calendario (Google + .ics compartido), ubicación, mapa (Google Maps Embed sin API key), mensaje de confirmación |
| **Transport** | Opciones de transporte (autobús/taxi), salidas con hora y mapa |
| **Info** | Itinerario con agenda interactiva, código de vestimenta, política infantil |
| **Story** | Historia de amor (texto libre) |
| **Gallery** | Galería de fotos con lightbox, carrusel automático, descripciones |
| **Gifts** | Información de regalos + IBAN (cifrado) |
| **Accommodation** | Alojamiento |
| **VenueMap** | Mapa del recinto (sección propia reordenable) |
| **Tables** | Distribución de mesas con lupa a pantalla completa |
| **RSVP** | Confirmación de asistencia con acompañantes |

### Funciones diferenciadoras (ronda v2.100)

- **Calendario desde la invitación:** util compartida `buildIcsFile` (RFC 5545) reutilizada en Detalles y el panel; validación de fecha/rollover y escape de texto.
- **Agenda interactiva:** el día del evento el itinerario resalta el evento en curso (badge EN CURSO) y muestra cuenta atrás por evento (en X min), sin re-renders por segundo.
- **Ranking para el DJ:** export del ranking de canciones desde la encuesta de música (solo visible para el admin), texto legible + protección anti-CSV-injection.
- **Impresión profesional con QR:** la tarjeta imprimible incluye el código QR de la invitación (carga lazy, no bloquea la impresión).
- **Modo sorpresa:** el editor de secciones marca secciones con 🎁 que quedan ocultas a los invitados hasta el día del evento (con fecha inválida nunca se revelan).
- **Modo invitado senior:** texto Muy grande (1.5×) y narración de la invitación por voz (Web Speech API) en el panel de accesibilidad.

### Funciones diferenciadoras (ronda v2.101)

- **Dashboard predictivo de asistencia:** el Panel proyecta el total final según el ritmo real de confirmaciones (personas/día), % del aforo estimado, tendencia (alza/baja/estable) y días restantes.
- **Confirmaciones en tiempo real:** el contador de la portada se actualiza al instante (onSnapshot) y se degrada a polling de 20s si el canal de Firestore falla.
- **Regalos-experiencia:** la lista de regalos admite el sufijo `| experiencia` (insignia 🎁) conservando las líneas antiguas.
- **Historial de visitas por día:** cada visita se registra por día (subcolección segura con incremento acotado) y el Panel muestra los últimos 7 días como gráfico de barras.
- **Idioma por invitación:** la pareja fija el idioma base (es/en/automático) que se aplica a los invitados que no eligieron idioma en su dispositivo.

### Funciones diferenciadoras (ronda v2.102)

- **Mapa de mesas inteligente:** botón "Auto-asignar" en Distribución que reparte los confirmados sin mesa entre las mesas con hueco de forma equilibrada (round-robin) en un único batch atómico.
- **Filtro por invitado en fotos del día:** desplegable con los autores para ver solo sus fotos.
- **Recordatorio automático a no confirmados:** el panel muestra cuántas personas faltan y genera el texto del recordatorio con un clic.

### Funciones diferenciadoras (ronda v2.103)

- **Temas premium:** nuevo grupo «Premium» con «Marfil antiguo» (claro/bronce) y «Amatista profunda» (oscuro/plata), con vista previa en el selector.
- **Impresión con el tema:** la tarjeta imprimible hereda los colores de la invitación.
- **Confirmaciones por día:** mini-gráfico de 14 días en el Panel (ritmo real de confirmaciones).
- **Backup completo:** la copia de seguridad incluye ahora el historial de visitas por día (restore sin sobrescribir días existentes).

### Funciones diferenciadoras (ronda v2.104)

- **Lista de confirmados en la portada:** nuevo checkbox en Extras «Mostrar la lista de personas que han confirmado» que muestra los nombres de quienes confirmaron (chips de prueba social), además del contador numérico. Privacidad/GDPR: cada invitado puede optar por aparecer al responder el RSVP (consentimiento explícito art. 7), y la lista pública es de solo-creación (no se puede sobrescribir ni suplantar) con cap anti-spam. El toggle está oculto por defecto.

### Ronda v2.105

- **Fix de extras «no activables»:** activar SOLO alguno de voiceNotes / dayPhotos / mailbox / toasts / venueMap ocultaba la sección de extras (falta de esos toggles en `sectionHasContent`); ya se alinean todos.
- **Trivia de la pareja mejorada:** botón «Comprobar», marcador de aciertos (X de N), felicitación al acertar todas, estado persistido en sessionStorage por invitación, pista y dificultad (fácil/media/difícil) por pregunta. El editor admite `pregunta | respuesta | pista | dificultad`.

### Ronda v2.106

- **Personalización completa de la invitación:** selectores de fuente para títulos y texto (Playfair, Lora, Georgia/Times, Great Vibes, OpenDyslexic — todas autoalojadas) e inputs de color para acento, títulos, texto y fondo. Se aplican solo en la vista del invitado y quedan sanitizadas (lista blanca + hex).
- **Nuevo editor de trivia por tipos:** cada pregunta tiene tipo (texto libre, elección única o multirrespuesta) y, para elección, un editor de opciones con checkbox/radio para marcar cuáles son correctas. La sección pública renderiza cada tipo y evalúa el acierto correctamente. Retrocompatible con las preguntas antiguas.

### Ronda v2.107

- **Edición manual de respuestas RSVP desde la tabla de asistencia:** los novios pueden añadir invitados a mano (invitaciones físicas a personas sin dispositivo) y editar respuestas existentes (nombre, asistencia, notas de menú/alergias) desde un modal. Escritura atómica con `writeBatch` que cumple la regla Firestore (contador del grupo, tope anti-spam).
- **Auditoría de overflows horizontales en móvil/tablet:** se eliminó el scroll horizontal espurio en toda la app (textos largos, badges, decoraciones) con `overflow-x: hidden` en body y contenedor de scroll, quiebre de palabras en textos y snacks; plus un spec e2e que mide el desbordamiento en 320–768 px.

### Ronda v2.108

- **Fix del RSVP con acompañantes en pantallas muy pequeñas:** el selector de asistencia («Con acompañantes» + botón «+ Añadir acompañante») ahora hace wrap (el botón baja de línea si no cabe) y el select usa `min-width: min(180px, 100%)`; el grid no crea celdas más estrechas que el contenido; y los labels de consentimiento con texto largo ya quiebran las palabras sin desbordar. Test de regresión unitario + test e2e de overflow con 2 acompañantes a 320 px.

### Ronda v2.109

- **Fix de la sección de extras:** se eliminó el scroll interior (max-height + overflow-y) que cortaba el contenido y rompía la visualización; ahora la sección crece de forma natural con el scroll de la invitación y tiene eyebrow general.
- **Nueva sección «Mapa del recinto» (venuemap):** el mapa sale de la sección de extras y pasa a ser una sección **propia y reordenable** en el editor de secciones, con su propia tarjeta (eyebrow + título + mapa 16:9). `normalize-config` la añade automáticamente al orden de invitaciones existentes.

### Ronda v2.110 (UI/UX)

- **Botón «Volver arriba»** en la invitación pública (scroll suave en el contenedor real).
- **Pestañas del admin** en una sola fila con scroll horizontal en móvil (sin wraps).
- **Reset de filtros** y **contador de resultados** (aria-live) en la tabla de asistencia.
- **Copiar enlace** en el Panel; **scroll-to-top real** al cambiar de pestaña.
- **Feedback táctil `:active`** en botones, animación «pop» en reacciones, **contador de caracteres** en dedicatorias y **barra de aforo** accesible en la proyección; + `type="button"` donde falltaba.

### Ronda v2.111

- **Fix de la sección de extras (causa raíz):** `welcomeVideo` y `rsvpDeadline` se contaban como «contenido» de la sección extras aunque no se renderizan en ella (el vídeo es un overlay y la fecha límite afecta solo al RSVP). Cuando eran el único extra activo, la sección quedaba vacía o invisible. `hasExtras` ahora se deriva de los bloques reales (`extraBlocks.length > 0`), fuente única.
- **Errores profundos:** tope del contador de la lista de confirmados subido a 2000 (evita ruptura en bodas grandes), la trivia persiste las opciones marcadas al recargar, y las reacciones actualizan el contador al instante (+1 inmediato).

### Ronda v2.112

- **Nueva sección pública «Distribución de mesas»:** los invitados ven el plano de mesas que preparas en Distribución, con selector de zona y **lupa a pantalla completa** (modal). Se destaca la mesa del invitado si está asignado. Se activa desde Extras («Distribución de mesas»). La geometría es compartida con el editor para que ambas vistas dibujen el plano idéntico.

### Ronda v2.113

- **Confirmaciones accesibles:** se migraron los últimos `window.confirm` nativos (inaccesibles) al modal accesible con focus-trap: el guardado del editor con cambios de menú y los tres flujos de borrado de RSVP (retirar, eliminar en lote, vaciar). Se reordenó `ConfirmProvider` para envolver `AppProvider`.
- **UX RSVP:** aviso accesible con el número total de personas a confirmar al asistir con acompañantes («Confirmarás N personas»).

### Ronda v2.116 (seguridad: criticos auditoría)

- **Fix carrera crítica del autosave:** un autosave programado para la invitación A ya no puede dispararse tras navegar a B y volcar los datos de A dentro del documento de B. `useAutoSave` recibe ahora el ref del token activo y aborta la escritura a Firestore si el usuario cambió de invitación durante el debounce.
- **Cifrado con token (documentado C1):** se aclara que el cifrado AES-GCM deriva del token de invitación por diseño (token = credencial de acceso compartida con los invitados); aporta ofuscación en reposo, no confidencialidad frente al poseedor legítimo. La protección real se centra en NO filtrar el token.
- **Mitigada la fuga del token en Sentry:** las URLs (ruta `/<token>` y query `?t=/invitar`) y el hash se redactan (`[redacted]`) en errores, breadcrumbs y session replay vía `beforeSend`/`beforeBreadcrumb` + `redactSecretsFromUrl`, para que la credencial no salga del navegador.

### Ronda v2.115 (seguridad reglas)

- **Endurecido `isValidSafeUrl` en Firestore:** la regex `javascript:` era bypaseable con saltos de línea (RE2 no cruza `\n`) y no bloqueaba `data:`/`vbscript:` ni protocol-relative; ahora se exige URL `http(s)://` absoluta y se descarta cualquier valor con `\n\r\t` (XSS almacenado en href).
- **Sincronizados los temas premium** (`antique-ivory`, `deep-amethyst`) con la regla `isValidTheme` para que guardarlos no dé `permission-denied`.

### Ronda v2.114 (estabilidad)

- **Fix descarga de galería cifrada:** en Herramientas la galería se descargaba como ciphertext ilegible (AES-GCM); ahora se descifra cada imagen antes de descargar.
- **Cascade delete GDPR:** el borrado de una invitación ahora limpia también accessLog, confirmedPeople, `_backup`, mesas (nombres de invitados), visitas, etc. en los 3 paneles del superadmin.
- **Sesión «zombi»:** una renovación de sesión Firestore en vuelo ya no resucita la sesión tras un logout; y el contador de fallos de renovación se resetea al reloguear.
- **Hora medianoche:** la hora `"0"` ya no se convierte a mediodía en el `.ics` ni en la predicción de asistencia.
- **Caps de parseo:** parsers tolerantes ante datos corruptos (evita freezes y listas perdidas).

### RSVP

- Modelo individual: cada persona elige `solo/a` / `con acompañantes` / `no asiste`
- Acompañantes con nombre + menú + alergias (checkboxes + texto libre "otras alergias") + checkbox «¿es niño?»
- **Cada acompañante tiene su propio documento Firestore** (writeBatch), vinculado al principal
- Primer acompañante obligatorio (sin botón ✕)
- Validación completa: consentimiento salud (si alergias), menú (si activado); los niños se marcan con el checkbox «¿es niño?» (sin fechas de nacimiento ni consentimiento parental: el invitado principal actúa como tutor)
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

7 claros, 7 oscuros, 7 LGTBIQ+, cada uno con `--invite-core-color` único.| Claros | Oscuros | LGTBIQ+ |
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

### Control de animaciones

Cada animación de la invitación (del sobre al confeti y las microinteracciones) se puede desactivar individualmente con un checkbox con nombre y hint:

- **Base de los novios** (nueva sección «Animaciones» del editor): se guarda en `config.disabledAnimations` y aplica a todos los invitados.
- **Preferencia del invitado** (panel de accesibilidad ♿): cada visitante puede desactivar más animaciones en su dispositivo; nunca reactiva las que la pareja apagó.
- Catálogo canónico en `src/lib/animations.ts` (43 animaciones en 12 grupos), reglas CSS de kill en `src/styles/animations.css` y respeto total de `prefers-reduced-motion`.

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
| v2.130.0 | 2026-08-24 | Toggle «Vídeo de bienvenida» en Portada del setup: por fin es configurable desde la UI (URL + activación) con i18n completo y tests |
| v2.124.1 | 2026-08-24 | Eliminada la sección extras: regalos/trivia fuera, toggles reubicados (rsvpDeadline+confirmados→Invitados, recinto→nuevo formulario Recinto) |
| v2.124.0 | 2026-08-24 | Poda bloatware: eliminadas 11 funciones sin uso real (sorpresas, reacciones, encuesta musical, notas, buzón, brindis, notas de voz, fotos del día, coche compartido, confirmados en vivo, Facebook) + limpieza i18n (193 claves), ruta crypto legacy y legacyToken; datos de producción depurados; rules endurecidas |
| v2.123.9 | 2026-08-24 | Limpieza: eliminada carpeta functions/ (cleanupExpiredData imposible en plan Spark), firebase.json/package.json/CI depurados, informe de candidatos a eliminación con uso real medido en producción |
| v2.123.7 | 2026-08-23 | RSVP: select ¿es niño? por acompañante (isChild persistido) sustituye fechas de nacimiento, consentimiento parental condicionado al select, eliminada sección childrenCount y lógica muerta age/birthDate, columna Niño en admin+Excel |
| v2.123.6 | 2026-08-23 | Auditoría ronda 2: LEGAL en rules (TTL accessLog, ownerKey autoservicio, voiceConsent, consentLog.lang), CALIDAD logs/catches/decrypt→safeLogError + redact.ts anti-ciclo, i18n fechas localizadas y mojibake=0, A11Y aria-labels icon-buttons |
| v2.123.0 | 2026-08-20 | Ronda 5 accesibilidad: teclado en miniaturas galería (flechas+foco+aria-current), whitelist anti-inyección CSS en AccessibilityPanel |
| v2.122.0 | 2026-08-20 | Ronda 4 infra+legal: target es2022, manualChunks i18n correcto, fix override uuid, política versionada con fecha, sección Cookies y almacenamiento |
| v2.121.0 | 2026-08-20 | Ronda 3 robustez: crypto.randomUUID en IDs, aviso en encrypt fallido, tests useSessionRenewal/Modal/axe (Modal, CollapsibleSection) |
| v2.120.0 | 2026-08-20 | Ronda 2 seguridad del logging: safe-error (redacta token en errores y logs), elimina dump de objetos/paths, sin PII (email) en logs, dead code loggingInRef |
| v2.119.0 | 2026-08-20 | Ronda 1 accesibilidad AAA: teclado en editor de mesas + campos X/Y, focus trap en modales anidados + scroll-lock, contraste footer/menú/trivia, labels 'otras alergias', h2-fuera-de-button, aria-live gracias |
| v2.118.0 | 2026-08-20 | Fase 2 de la auditoría: utilidad safe-href (XSS reflejado), checksum IBAN mod-97, isEncryptedMedia en dayphotos/voicenotes, clave por token en cifrado (N→1 derivaciones), O(n) en asistencia, preload Lora, claves i18n |
| v2.117.0 | 2026-08-20 | Auditoría integral: fix GDPR retención (scheduler no borraba), cutoff parental 2012-08-21, suite tests al verde (2303), lint:ci OK, versionado unificado |
|---|---|---|
| v2.116.0 | 2026-08-19 | Seguridad: fix carrera crítica del autosave entre invitaciones + mitigación de la fuga del token en Sentry (cifrado con token documentado) |
| v2.115.0 | 2026-08-19 | Seguridad de reglas: `isValidSafeUrl` endurecido (XSS por nueva línea, data/vbscript) + temas premium sincronizados |
| v2.114.0 | 2026-08-17 | Ronda de estabilidad (auditoría profunda): fix descarga galería cifrada, cascade delete GDPR, sesión zombi, hora medianoche, caps de parseo |
| v2.113.0 | 2026-08-17 | Ronda de mejora general: confirmaciones accesibles (AppContext + RSVP) y resumen de personas en el RSVP |
| v2.112.0 | 2026-08-17 | Nueva sección pública de distribución de mesas con lupa a pantalla completa (zona + plano idéntico al editor) |
| v2.111.0 | 2026-08-17 | Fix de la sección de extras (causa raíz: welcomeVideo/rsvpDeadline) + errores profundos (cap de confirmados, persistencia de trivia, contador de reacciones) |
| v2.110.0 | 2026-08-17 | Ronda de mejora UI/UX: botón volver arriba, tabs con scroll en móvil, reset de filtros y contador, copiar enlace, feedback táctil y animaciones, barra de aforo |
| v2.109.0 | 2026-08-17 | Fix de la sección de extras (scroll natural + eyebrow) y nueva sección propia reordenable del mapa del recinto (venuemap) |
| v2.108.0 | 2026-08-17 | Fix de visualización del RSVP con acompañantes en pantallas muy pequeñas (flexWrap del selector, min-width responsive, quiebre de texto en consentimientos) |
| v2.107.0 | 2026-08-17 | Edición manual de respuestas RSVP en la tabla + auditoría y corrección de overflows horizontales en móvil/tablet (overflow-x, quiebre de palabras, spec e2e) |
| v2.106.0 | 2026-08-17 | Personalización completa (fuentes y colores del tema sanitizados) + nuevo editor de trivia por tipos (texto, elección única, multirrespuesta con opciones correctas) |
| v2.105.0 | 2026-08-17 | Fix de extras no activables (sectionHasContent) + trivia de la pareja mejorada (comprobar, marcador, felicitación, persistencia, pista y dificultad) |
| v2.104.0 | 2026-08-17 | Lista de confirmados en la portada: nuevo checkbox en Extras (prueba social con opt-in de nombres GDPR y colección create-only con cap anti-spam) |
| v2.103.0 | 2026-08-17 | Ronda final sin backend: temas premium (grupo Premium con Marfil antiguo y Amatista profunda), impresión con el tema, confirmaciones por día en el Panel y backup con historial de visitas |
| v2.102.0 | 2026-08-17 | Funciones diferenciadoras (bloque 3): mapa de mesas inteligente (auto-asignación equilibrada en batch), filtro por invitado en fotos del día y recordatorio automático a no confirmados |
| v2.101.0 | 2026-08-17 | Funciones diferenciadoras (bloque 2): dashboard predictivo de asistencia, confirmaciones en tiempo real (onSnapshot+fallback), regalos-experiencia, historial de visitas por día con regla segura y gráfico, idioma por invitación; tests de reglas 28/28 |
| v2.100.0 | 2026-08-17 | Funciones diferenciadoras (bloque 1): calendario compartido .ics, ranking para el DJ con anti-CSV-injection, QR en impresión, modo sorpresa por secciones, agenda interactiva en vivo y narración por voz senior; 28 tests nuevos (2256) |
| v2.97.1 | 2026-08-12 | Cobertura 83.5→86.4% líneas: axe en las 5 secciones sociales restantes, voice-store/FormStore/file-utils/MetricsTab/SupportTab/ToolsTab/DistribucionTab; gate de cobertura ajustado a umbrales verificados |
| v2.97.2 | 2026-08-12 | Cobertura a 88.8% de líneas (2106 tests): ManageTab, DataTab, InvitationDetailModal, SuperAdminPanel, PlatformTab, DashboardTab y secciones sociales; umbrales CI subidos |
| v2.97.3 | 2026-08-12 | Cobertura a 89% de líneas (2114 tests): VoiceNotes, DayPhotos, transport-utils, useInertBackground, GoogleTranslateToggle; umbrales CI a 88.5/86/83.5/78 |
| v2.97.4 | 2026-08-12 | Cobertura a 90% de líneas (2124 tests): SupportTab, ManageTab, MetricsTab; umbrales CI a 89.5/87.5/84.5/78.5 |
| v2.97.5 | 2026-08-12 | Cobertura a 90.2% de líneas (2129 tests): DistribucionTab y RideShareSection; umbrales CI verificados |
| v2.97.6 | 2026-08-12 | Cobertura a 90.5% de líneas (2132 tests): ToolsTab y MusicPollSection; umbrales CI a 90/88/85/79 |
| v2.97.7 | 2026-08-12 | Cobertura a 90.5% de líneas (2136 tests): RsvpSection — validación, reintento, contacto y envío |
| v2.97.8 | 2026-08-12 | Cobertura a 91% de líneas (2142 tests): TriviaSection y ManageTab; umbrales CI a 90.5/88/85.5/79.5 |
| v2.97.9 | 2026-08-12 | Cobertura a 91.2% de líneas (2146 tests): VoiceNotes, ComplianceTab y arrastre en DistribucionTab; umbrales CI a 90.5/88.5/85.5/79.5 |
| v2.98.0 | 2026-08-12 | Cobertura a 91.3% de líneas (2147 tests): impresión de confirmaciones en DataTab; umbrales CI a 91/88.5/85.5/79.5 |
| v2.98.1 | 2026-08-12 | Cobertura a 91.4% de líneas (2149 tests): sentry — retirada de consentimiento y guard único |
| v2.98.2 | 2026-08-12 | Cobertura a 91.4% de líneas (2151 tests): VoiceNotes — estado vacío y fecha |
| v2.98.3 | 2026-08-12 | Cobertura a 91.5% de líneas (2153 tests): DistribucionTab — asignación y mesa llena |
| v2.98.4 | 2026-08-12 | Cobertura a 91.9% de líneas (2155 tests): DataTab — purga con cascadeDelete; umbrales CI a 91.5/89/86/80 |
| v2.98.5 | 2026-08-12 | Ronda de mejora: cobertura a 92.2% (2160 tests), axe para Pagination/LoadingOverlay/CollapsibleSection, cutoff GDPR 2012-08-13 |
| v2.98.6 | 2026-08-16 | Control de animaciones por checkboxes (43 animaciones, 12 grupos): base del admin + preferencia por invitado, con nombre y hint por animación; registro canónico, CSS de kill y modularización (Confetti, WeddingDecorations, SetupToggleRow, AnimationChecklist) |
| v2.99.0 | 2026-08-16 | Mejora general de formularios y paneles: contexto estable de config (fin del re-render por tecla) + formularios memoizados; modal accesible de confirmación/prompt; tabs con sync de URL (botón atrás); paginación de listas largas; código de vestimenta i18n; accesibilidad (focus, targets táctiles, captions, file inputs) |
| v2.97.0 | 2026-08-12 | Invitados esperados como número (0..1000); estadísticas calculadas desde ese número |
| v2.96.11 | 2026-08-11 | Hardening: escritor XLSX blindado (NaN/control-chars/límite columnas), fix a11y botón 👁, límites de bundle ajustados |
| v2.96.10 | 2026-08-11 | Seguridad: xlsx/SheetJS (2 avisos alta) sustituido por escritor OOXML propio; npm audit prod 0 vulnerabilidades |
| v2.96.9 | 2026-08-11 | Auditoría de tercer nivel: asset muerto eliminado; listeners/intervalos/Sentry/CI/SW verificados |
| v2.96.8 | 2026-08-11 | Auditoría profunda: ruta inicial −98KB gzip (xlsx/qrcode lazy), fix XSS en impresión RSVP, cutoff GDPR de consentimiento parental actualizado |
| v2.96.7 | 2026-08-11 | Auditoría de segundo nivel: 21 variables CSS muertas eliminadas; i18n/e2e/bundle verificados |
| v2.96.6 | 2026-08-11 | Sanitización y limpieza exhaustiva: dead code, tipos y CSS muertos eliminados; hooks corregidos; audit de XSS/secrets/reglas |
| v2.96.5 | 2026-08-11 | Ninguna exportación se ejecuta con datos vacíos (Excel, PDF, galería, RSVP, auditoría, backup) |
| v2.96.4 | 2026-08-11 | Selector de secciones bajo los controles de mesas en Distribución |
| v2.96.3 | 2026-08-11 | Retiradas las formas Rectángulo y Óvalo al añadir mesas; solo Círculo y Cuadrado |
| v2.96.2 | 2026-08-11 | Prueba de formato de todos los Excel descargables (ida y vuelta celda a celda); builders extraídos a excel-builders.ts |
| v2.96.1 | 2026-08-11 | Todos los exports pasan de CSV a Excel (.xlsx): asistencia, menús, invitados, RSVP por invitación y auditoría |
| v2.96.0 | 2026-08-11 | Exportación a Excel (.xlsx): invitados con estado, buzón, asistencia con menús/dieta y mesas por sección |
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
