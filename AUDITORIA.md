# Auditoría Completa de Mejora Progresiva — Wedingo

**Fecha:** 2026-08-09 · **Versión auditada:** v2.95.40 → **Resultado:** v2.95.41
**Disparador:** 23 commits desde la última gran ronda (v2.95.29) — regla "cada 20 commits" de AGENTS.md.

Método: 4 auditorías estáticas paralelas (seguridad, accesibilidad, legal internacional, rendimiento/calidad) + implementación de los fixes factibles + verificación (1991 tests, oxlint, tsc, build).

---

## Resumen de puntuación

| Área | Estado previo | Hallazgos | Resueltos |
|---|---|---|---|
| Seguridad | sólida | 2 altos, 6 medios, 7 bajos | 1 alto*, 4 medios, 2 bajos |
| Accesibilidad | buena | 3 altos, 5 medios, 5 bajos | 3 altos, 4 medios, 5 bajos |
| Legal (GDPR/UK/CCPA/LGPD/PIPEDA/POPIA) | cumplimiento sólido | 1 medio-alto, 6 medios, 5 bajos | 1 medio-alto, 4 medios, 4 bajos |
| Rendimiento/Calidad | muy buena | 1 medio-alto, 5 medios, 8 bajos | 1 medio-alto, 4 medios, 6 bajos |

\* El fix de App Check/MFA es operativo (requiere consola de Firebase) → documentado como recomendación.

---

## 1. Seguridad

### Resueltos
- **[M3] Reglas de medios endurecidas** (`firestore.rules`): `gallery`/`audio`/`configImages` exigen ahora `keys().hasOnly(...)` (sin campos extra) + `isEncryptedMedia()`: el `data` debe ser base64 AES-GCM con cabecera ≥44 chars (imposible alojar `data:text/html`, SVG o texto arbitrario con sesión admin). El `update` de gallery se limita a `description`.
- **[B3] Update de RSVP saneado**: `guestName`/`dietaryInfo` con `isSafeText` + límites, igual que el create (asimetría corregida).
- **[M4] CSP estrechada** (`firebase.json` + `index.html`): `script-src` sin el wildcard `https://*.googleapis.com` (se mantienen hosts explícitos `apis.google.com`, `www.google.com`, `*.gstatic.com`). El SDK de Firebase va empaquetado, no carga scripts externos.
- **[B6] `TOKEN_ROUTE_REGEX` alineada** a `^[a-zA-Z0-9]{10}$` (coincide con la regla de Firestore).

### Documentados como riesgos aceptados (con justificación)
- **[M1] `setupTokenHash` persistido en el doc público**: es SHA-256 de un token de 160 bits; su retirada exigiría un rediseño de la regla de sesión (Firestore rules no permiten parámetros fuera del `request.resource.data`). No revierte el token.
- **[M2] Cifrado "cosmético" con clave derivada del `inviteToken` público**: el objetivo es ofuscación/anti-scraping + integridad, no confidencialidad frente a quien conoce la URL. Documentado para no dar falsa seguridad.

### Recomendaciones operativas (requieren consola/credenciales, NO código)
- **[A1] Habilitar Firebase App Check (reCAPTCHA Enterprise)** y exigir `app.check()` en escrituras anónimas (RSVP, sociales, `_visits`, alta de sesión). Activar **MFA** en la cuenta superadmin y **rotar** su contraseña (está en AGENTS.md).
- **[B5] Tratar `/_/s53k` como público** (la oscuridad no protege: está en el bundle). Rotar el token de la invitación de prueba.
- **[B7] Mantener al día** la fecha de corte parental `2013-08-08` (CI ya la verifica).
- **[B1/B2] Aceptar** el límite del bloqueo de login en cliente y los topes de funciones sociales (mitigado por entropía 2^160).

---

## 2. Accesibilidad (WCAG 2.2 AA)

### Resueltos
- **[Alto] Contraste de eyebrows en temas bandera** (`rainbow/trans/nonbinary/lesbian/bi/pan`): añadidos al override `--invite-eyebrow-color: #f2ead6` (antes ~1.03:1).
- **[Alto] Contraste de texto en temas claros `linen-soft` y `blush-pearl`**: título/copy oscurecidos (ahora 7.9-9.6:1 título, 4.9-5.1:1 copy; antes 1.2-2.7:1).
- **[Alto] `inert` en el fondo de los modales compartidos**: `Modal.tsx` usa el nuevo `useInertBackground` → el lector de pantalla/cursor virtual ya no lee el fondo.
- **[Medio] `useFocusTrap` robusto**: listener en `document` (recupera el foco si escapa), fallback de foco al contenedor si no hay focables, y respeta dobles modales.
- **[Medio] Tabs del SuperAdminPanel**: patrón ARIA completo con flechas/Home/End y roving tabindex (igual que AdminPage).
- **[Medio] Banner offline**: `role="status"` + `aria-live="polite"`.
- **[Bajo] Contraste**: `text-boda-texto/60` → 75%; `.setup-error` `#e06060` → `#e87272`; versión del footer `opacity 0.4` → `0.6`.

### Pendientes de decisión (documentados)
- `rtl.css` es código muerto (solo se publican es/en) — se mantiene porque hay test RTL y podría reutilizarse.
- Targets táctiles <44px (botones de section-order ~18-22px, `.rsvp-remove-btn`): mejorables pero funcionales con teclado (alternativa ↑/↓).

---

## 3. Legalidad internacional

### Resueltos
- **[H1] Consentimiento demostrable (GDPR 7.1)**: el banner guarda ahora `{ status, ts, version }` con `PRIVACY_POLICY_VERSION`; **re-consentimiento automático** si la política cambia de versión.
- **[H3] Rechazo persistente (ePrivacy 5.3)**: al rechazar se limpia la caché de invitación en localStorage **y** el IndexedDB de Firestore del proyecto (`eraseFirestoreIndexedDB`); `ConfigContext` ya no re-cachea tras el rechazo.
- **[H2] Retirar consentimiento sin borrar todo (GDPR 7.3)**: nuevo enlace **"Preferencias de cookies"** en el footer (vía `cookiePrefsOpen` en UI context) que reabre el banner en modo ajustes.
- **[H5/H7] Política alineada**: EN ahora incluye cláusula CCPA de no discriminación completa, vía de reclamación POPIA ante la Information Regulator, y conservación automática a los 12 meses (ES y EN).
- **[H8] Google Maps revelado** como destinatario en la política (carga bajo clic) — ES y EN.
- **[H10] Política actualizada**: menciona la limpieza automática a los 12 meses (cron) además del borrado manual.

### Notas
- **[H4] Supresión social por invitado (GDPR 17)**: el borrado en cascada borra las subcolecciones sociales al eliminar la invitación; falta borrado per-invitado por `guestId`. Requiere función cloud o borrado en lote del admin → **recomendación**.
- **[H12] Export desde Firestore** de las respuestas del invitado: hoy solo se exportan los datos del navegador (vía válida bajo GDPR: respuesta en 30 días) → **recomendación**.
- **[H6] `wedin_deploy_id`** y preferencias de a11y escriben en localStorage sin gate: documentado; impacto menor (claves técnicas no personales).

---

## 4. Rendimiento y calidad

### Resueltos
- **[Alto] Countdown movido a `HeroSection`**: el tick de 1s ya no re-renderiza toda la página (solo la sección); con `weddingDate` estable en `heroProps`.
- **[Medio-Bajo] Cleanup de `setTimeout`**: secuencia del sobre (EnvelopeOverlay), cierre del vídeo y confeti (PublicInvitation) se limpian al desmontar.
- **[Bajo] 5 advertencias `INEFFECTIVE_DYNAMIC_IMPORT` silenciadas**: `analytics.ts` (CookieConsent/vitals/DetailsSection/useRsvp), `setup-token.ts`, `error-utils.ts` → imports estáticos (el chunk pesado `lazy-analytics` de `firebase/analytics` sigue fuera de la ruta crítica).
- **[Bajo] Keys de `departures` en RsvpSection**: se iteran con índice global (O(n)) en vez de `indexOf` (O(n²)); `departuresOfType` muerto eliminado.
- **[Bajo] API muerta de `useStoryNavigation`**: `transition`/`startTransition`/`isTransitioning` y la clase `app-scene--transitioning` eliminados.
- **[Medio] CSS muerto eliminado** (~130 líneas): bloque `.lang-popup*` de `lang.css`, utilidades manuales duplicadas de `admin.css`, variable `--page-blur*` (y sus 21 usos) y duplicación de `--font-heading/--font-body` en los 20 temas (ahora solo en `:root`).

### Recomendaciones (pendientes)
- **[#1] Re-render del Setup por tecla** (`ConfigContext.formData` como un único objeto): scope por campo o `React.memo` por sección. Es el mayor coste de CPU del admin — requiere refactor medio.
- **[#3] Bundle inicial ~280KB gzip**: mantener la división de chunks actual (correcta); opcional mover `LandingPage` fuera del chunk eager.
- **[#9] Comprimir `eucalyptus.webp`** (119KB decorativa) y añadir `width/height` — requiere herramienta de imagen.
- **7 exports muertos** (solo usados por tests): se mantienen por cobertura (`isValidIBAN`, `isDateInPast`, `VISITS_MAX_INCREMENT`, `clearGalleryCache`, `clearConfigImageCache`, `estimateAudioSize`, `clearSocialMeta`).

---

## Lo que ya estaba bien (sin tocar)
- Reglas Firestore muy sólidas (sesión con TTL, `_visits` acotado, `isSafeText`, whitelist de temas, contadores anti-spam, RSVP con `privacyConsentAt` parental).
- Cero `dangerouslySetInnerHTML`/`eval`; CSP estricta con headers HSTS/nosniff/frame-ancestors.
- Consentimiento previo real a analytics/Sentry (buffer en memoria, sin envío antes de aceptar); mapas click-to-load.
- Lazy-loading ejemplar (páginas, modales, Sentry, analítica); imágenes con lazy+decoding+anti-CLS; LCP con `fetchPriority`.
- Sin fugas de listeners/timers/suscripciones; `prefers-reduced-motion` a 3 niveles.
- Cero `any` y cero `@ts-ignore` en producción; comentarios exhaustivos en todos los módulos grandes.

---

## Próximos pasos recomendados
1. **Operativo**: App Check + MFA superadmin + rotación de credenciales (mayor mitigación de abuso/DoS).
2. **H4**: borrado por invitado de contribuciones sociales en retirada/supresión.
3. **#1 Perf**: scoping del estado del Setup (re-render por sección).
4. Compresión de `eucalyptus.webp`.
