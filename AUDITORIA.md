# Auditoría Completa de Mejora Progresiva — Wedingo

**Fecha:** 2026-08-09 · **Versión actual:** v2.95.44 → **v2.95.45 (auditoría del superadmin)**

---

## Auditoría de flujos del superadmin (v2.95.45)

Análisis completo de los 6 tabs + login + contexto + reglas. **1991 tests, oxlint/tsc/build limpios, hosting + firestore.rules desplegados.**

### Flujos auditados
- **Login** (`/_/console`): Firebase Auth real con email whitelistado, `onAuthStateChanged` con guard (no fuerza cierre durante login), sesión 60 min renovable, logout con signOut + limpieza.
- **Dashboard**: stats globales (RSVP, invitaciones, storage), limpieza de invitaciones expiradas (>12 meses) con cascada.
- **InvitationsTab**: listado/búsqueda, borrado en cascada, export JSON sanitizado.
- **TokensTab**: gestión de tokens legacy (`_activeSetupToken`) + revocación.
- **DataTab**: export individual/seleccionado/total, borrado individual/masivo/total con confirmación por texto "ELIMINAR".
- **SettingsTab**: cuenta, sesión, logout.
- **ComplianceTab**: registro de tratamiento (estático).

### Fallos encontrados y corregidos
1. **[ALTO] Export individual/seleccionado filtraba datos sensibles**: `exportOne`/`exportSelected` volcaban el documento completo de la invitación (incluía `setupTokenHash` y, en legacy, `_activeSetupToken`/`legacyToken` en claro). Ahora usan `sanitizeInvitationForExport` (igual que el export total).
2. **[ALTO] InvitationsTab borrado incompleto**: el borrado en cascada no eliminaba las FUNCIONES SOCIALES (reactions/notes/songs/rides/gifts) ni `_counters` ni `consentLog` → PII de invitados quedaba huérfana y legible (GDPR art. 17). Corregido con la lista completa de subcolecciones.
3. **[ALTO] Dashboard cleanup sin setupTokens ni consentLog**: la limpieza de expiradas dejaba hashes de tokens y registros de consentimiento huérfanos (la función cloud sí los borra; el cliente no). Corregido.
4. **[MEDIO] DataTab cascadeDelete sin consentLog**: la subcolección nueva (v2.95.44) no se limpiaba al borrar. Corregido.
5. **[MEDIO] TokensTab solo gestionaba tokens legacy**: tras v2.95.22 los tokens viven en `setupTokens/{hash}` y el tab no los mostraba (no se podían revocar desde la UI). Ahora también lista `setupTokens` (hash abreviado + invitación) y permite revocar (borrar el registro → la regla de sesión deja de aceptar el hash).

### Riesgos aceptados / pendientes (documentados)
- **MFA/App Check** en el login de superadmin: operativo (requiere consola Firebase).
- `navigator.credentials.store` guarda la contraseña en el gestor del navegador (comportamiento estándar; revisar en terminales compartidos).
- La sesión superadmin comparte la clave `wedin_session` con la sesión admin/setup (login de uno invalida el otro; menor).
- `cleanupExpiredData` (función) sin aislamiento de errores por invitación: no desplegable en plan Spark.
- `consentLog` crece sin tope (una entrada por decisión): aceptable, solo superadmin lo lee.

---

## Ronda 3 — Implementación de pendientes (v2.95.44)

Se implementaron los pendientes documentados en las rondas 1-2. **1991 tests / 148 ficheros, 0 unhandled, oxlint/tsc/build limpios, hosting + firestore.rules + functions desplegados.**

### H4 — Autoservicio de borrado de aportaciones sociales (GDPR art. 17)
- **BLOQUEADO POR EL PLAN**: el proyecto está en el plan **Spark**, que no permite desplegar Cloud Functions (requiere Blaze). La verificación segura de propiedad en el borrado anónimo exige una función `deleteContribution` (las reglas no pueden recibir datos en `delete`, y permitir el borrado anónimo por id permitiría enumerar y borrar aportaciones ajenas). Se revirtió la implementación de la ronda; el flujo GDPR vigente sigue siendo: borrado por admin/superadmin + solicitud por email (plazo 30 días). **Pendiente de mover a Blaze.**

### Legal — Resto de pendientes
- **IndexedDB respeta el rechazo**: si `hasRejectedConsent()`, Firestore se inicializa con `memoryLocalCache` (el rechazo ya no se revierte en la siguiente carga; ePrivacy art. 5.3).
- **Registro servidor de consentimiento**: cada decisión del banner se guarda en `invitations/{token}/consentLog` (`{ status, version, ts }`, sin PII) con regla de solo-admin; GDPR art. 7.1 demostrable.

### Perf — Re-render del Setup y del RSVP
- **RSVP: `rsvpForm` aislado** en un contexto anidado (`RsvpFormContext`): teclear en el formulario ya no re-renderiza `PublicInvitation`/AdminPage/DataRequestModal/AppContext (solo `RsvpSection`).
- **Setup: `FormStore` con selectores por campo** (`useFormField`/`useFormStore`): cada sección y los ~19 `SetupToggleField` leen su propio campo con `useSyncExternalStore` → teclear ya no re-renderiza todo el árbol (AppShell, SetupForm, secciones). `formData` se mantiene como fuente de verdad para el guardado. Se convirtieron las 9 secciones + SetupForm + App.tsx (theme).

### Otros
- `eucalyptus.webp` ya comprimido (ronda 2); funciones compilan y se despliegan.

---

## Ronda 2 (v2.95.43) — referencia


Método: 4 auditorías paralelas con ángulos nuevos (cloud functions, backup/restore, PrintPage, sesiones, flujos de foco, validación de formularios, teardown de consentimiento, plan del re-render del Setup). Verificación: **1991 tests / 148 ficheros, 0 unhandled rejections, oxlint, tsc y build limpios.**

### Seguridad
- **[A1] Reordenado de galería restaurado**: la regla de update de `gallery` (v2.95.41) solo admitía `description` y rompía `updateGalleryOrder` → ahora permite `position` (int).
- **[M3] Export del invitado sin credenciales**: `exportGuestLocalData` ya NO incluye `wedin_session` ni `wedin_setup_token_*` (en dispositivo compartido son credenciales del responsable, no del invitado).
- **[R1] Restore de RSVP corregido** (PanelTab): los `{seconds,nanoseconds}` de los Timestamps se reconstruyen a `Date` para que `setDoc` cumpla la regla `is timestamp`.
- **[B1→documentado] Inyección CSS vía `backgroundImage`**: se documenta como riesgo menor (el flujo normal resuelve a `data:image/webp;base64`); defensa en profundidad opcional.
- **[M1] Cifrado de datos de salud con clave pública**: riesgo asumido y documentado (misma naturaleza que el cifrado de bankInfo; el token viaja en la URL).
- **[A2→no-issue] "Retirar respuesta"**: el botón ya es solo-admin en la UI (no hay vía de invitado).

### Accesibilidad
- **[C1 CRÍTICO] Restauración de foco al abridor**: `useFocusTrap` ahora filtra SOLO modales visibles y excluye el propio (el menú de navegación con `aria-modal` oculto estaba capturando el foco de vuelta).
- **[C3 CRÍTICO] linen-soft y blush-pearl**: revertido a texto claro (la tarjeta es un gradiente OSCURO, no crema) y los gradientes de card unificados en oscuro → ≥4.5:1 en todo el panel.
- **[Alto] Contraste**: banner offline `#e06060→#c9302c` (≥4.5:1), botón "Retirar" `#ef4444→#b91c1c`, aviso de edad `#e88b2c→#d97b18`.
- **[Alto] Errores RSVP**: `role="alert"` en el feedback + `aria-invalid`/`aria-describedby` en nombre, menú y fecha.
- **[Alto] DataTab**: `<caption>` + `scope="col"`, token copiable por teclado (`role=button`+Enter/Espacio), input de confirmación con `aria-label`.
- **[Medio] Botón dentro de `<label>`**: el enlace a la política en RSVP y SetupForm ahora es `role="link"` con teclado (HTML válido).
- **[Bajo]**: token de setup `disabled→readOnly` (enfocable), targets de SectionOrderEditor ≥24px (WCAG 2.5.8).

### Legal
- **[Alto] Consentimiento parental corregido**: cutoff `2013-08-08→2012-08-10` (hoy −14a +1d) y **script CI reparado** (la ventana era de 364 días; ahora valida `(hoy−14a, hoy−14a+1d]`). Menores de 13 quedaban eximidos.
- **[Medio-Alto] Sentry se detiene al retirar consentimiento**: nuevo `disableSentryTracking()` (`Sentry.close()` + stop replay) llamado en rechazo, guardar preferencias sin analítica y borrado de datos.
- **[Medio] Política corregida**: retención del creador "hasta 12 meses post-evento", edad de consentimiento en España = **14** (LOPDGDD art. 7), `cookie.point3` matiza "sin tu consentimiento", fecha de registro "agosto 2026".
- **[Bajo] `wedin_deploy_id`** ahora se escribe con `safeSetItem` (gate ePrivacy); **preconnect** redundante de `apis.google.com` eliminado; **parser de consentimiento** alineado (exige `ts`).
- **[3] IndexedDB re-poblada tras rechazo**: documentado como limitación (la caché offline es "almacenamiento necesario" y así se declara en la política); la mitigación completa (memoryLocalCache sin consentimiento) queda como mejora futura.

### Rendimiento / Calidad
- **[H1 CRÍTICO deploy-blocker] `npx vitest run` fallaba** con 80 unhandled rejections (faltaba `configImageIdFromRef` en 2 mocks) → corregido. El gate de deploy queda verde.
- **[H4] `eucalyptus.webp`**: comprimido 119→60 KB (800×800, q78) + `width/height` (anti-CLS).
- **[H5] `rings.webp` (102 KB) eliminado** (asset muerto) + CSS `.invite-rings` y `story-map__canvas/__image/__status/__caption` y `upload-grid`.
- **[H7] 18 clases CSS muertas eliminadas** (setup-background-*, setup-search-result, data-tab-empty-row, theme-picker__group, etc.).
- **[H3/H2] Pendientes de refactor documentados** (ver "Próximos pasos"): mover el formulario RSVP fuera del `RsvpContext` y el store de selectores `useFormField` para el Setup (plan completo incluido).

---

## Ronda 1 (v2.95.41) — referencia

**Versión auditada:** v2.95.40 → **Resultado:** v2.95.41
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
1. **Operativo**: App Check + MFA superadmin + rotación de credenciales (mayor mitigación de abuso/DoS) — requiere consola de Firebase.
2. **H4 (bloqueado por plan Spark)**: el autoservicio de borrado social necesita Cloud Functions (plan Blaze). Sin Blaze, se mantiene el borrado admin + email.
3. **[Perf] Setup (completado en v2.95.44)**: store de selectores `useFormField`/`useFormStore`; re-render acotado por campo.
4. **[Perf] RSVP (completado en v2.95.44)**: `rsvpForm` aislado en `RsvpFormContext`.
5. **[Legal] Consentimiento (completado en v2.95.44)**: registro servidor `consentLog` + IndexedDB `memoryLocalCache` bajo rechazo.
6. **Exports solo-usados-por-tests** (9): eliminar o acotar (higiene menor).
7. **`functions`**: revisar aislamiento de errores y paginación en `cleanupExpiredData` (mejora de robustez).
