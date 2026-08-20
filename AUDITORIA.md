# Auditoría Completa de Mejora Progresiva — Wedingo

**Fecha:** 2026-08-20 · **Versión actual:** v2.116.0 · **Auditoría integral sin límite de profundidad**

---

## Auditoría Integral 2026-08-20 (v2.116.0)

Auditoría sin límite de profundidad ejecutada sobre las 8 dimensiones: seguridad, rendimiento, accesibilidad, i18n, legal, calidad de código, tests y tooling/CI. 388 ficheros fuente, 2303 tests. No se modificó código: solo lectura + líneas base verificadas.

### Puntuación global estimada

| Dimensión | Estado | Notable |
|---|---|---|
| Seguridad | **78%** | 1 ALTO (vector hash URL), 3 MEDIOS, sin críticos |
| Rendimiento | **74%** | Firestore 166 KB gz crítico, PBKDF2/galería, FOUT Lora |
| Accesibilidad | **72%** | FOCO TRAP con fallo en modales interiores, editor de mesas sin teclado |
| i18n | **86%** | 1704/1704 claves, 1 clave dinámica ausente, fechas sin locale |
| Legal/Privacidad | **68%** | **CRÍTICO: scheduler de retención no borra nada** |
| Calidad de código | **88%** | 0 `any`, strict completo, 2 fallos de lint |
| Tests/cobertura | **80%** | 2303 tests pero **2 fallos + 1 unhandled** |
| Tooling/CI | **76%** | lint:ci rojo, versionado divergente, overrides UUID |

### Hallazgos CRÍTICOS (bloquean deploy si no se corrigen)

#### C1 — El borrado automático de datos (GDPR art. 5.1.e) no ejecuta NUNCA
`functions/index.ts:111` usa `new Date(\`${data.weddingMonth} 1, 2000\`)` para parsear el mes en español ("enero", "abril", "agosto", "diciembre"…). En runtime Node (locale inglés) esos nombres dan `Invalid Date` → `getMonth()` = `NaN` → `new Date(year, NaN, day)` = Invalid → `eventTime = NaN` → la condición `eventTime > 0` nunca se cumple. **Ninguna invitación expirada se borra** → retención indefinida pese a la política que promete "12 meses". Verificado con `node -e` (enero/abril/agosto/diciembre → Invalid Date; los meses que coinciden con el inglés sí parsean parcialmente).
- **Fix:** mapa explícito `MONTHS[es] - 1` (1 línea), test de regresión en `functions/index.test.ts`, deploy de functions.

#### C2 — La suite de tests está en ROJO
`npm run vitest run` → `src/lib/__tests__/excel-export.test.ts:202,210` (2 fallos: producción emite `"400×200"` como string y los tests esperan números) + unhandled error `window is not defined` en `src/__tests__/main.test.tsx` (React-dom sigue renderizando tras teardown → falso positivo). Verificado ejecutando la suite parcial. **La política "no despliegues si falla vitest" está bloqueada**.
- **Fix:** alinear test con el formato real (o revertir el formato), y silenciar/arreglar el teardown de `main.test.tsx`.

### Hallazgos ALTOS

1. **S1 — Vector XSS reflejado por hash de URL sin re-validar en render.** `ConfigContext.tsx:200-217` hidrata la config desde `window.location.hash`; `normalize-config.ts:276-279` trunca `instagramUrl`/`facebookUrl` sin validar esquema; `DetailsSection.tsx:168,198` los pinta como `href=` sin whitelist. Un enlace `…/TOKEN#<payload>` puede injertar un `javascript:`/`data:` en `href`. Mitigado en la práctica por el CSP (`script-src 'self'`) y por las reglas en escritura, pero es defensa-en-capas defectuosa. **Fix:** utilidad central `isSafeHref` (http(s) + host whitelist de instagram/facebook) en `normalize-config` o en el render.
2. **A1 — Editor de mesas de Distribución sin acceso por teclado** (`DistribucionTab.tsx:613-626`): mesas en `<div onPointerDown>` sin `role`/`tabIndex` y sin alternativa de teclado (WCAG 2.1.1). Afecta a todo el flujo de asignación de mesas.
3. **C3/LINT — Ignorar este estado rompe CI**: `npm run lint:ci` falla ya: error `no-duplicate-imports` en `src/lib/invitation-subcollections.ts:26` + 4 warnings `react/only-export-components` tratados como error (`ConfirmContext.tsx:64`, `AnimationsContext.tsx:137`, `ConfigContext.tsx:65,83`).
4. **T1 — `excel-export.test.ts` roto por regresión de formato** (ver C2): la producción cambió cell "400×200" a string y el test quedó obsoleto. Fragilidad de test frente a cambio de contrato.
5. **C4/H1 — Versionado divergente**: `package.json` 2.99.9 vs `package-lock.json` 2.96.9 vs `src/lib/constants.ts` 2.116.0. El build y `release` de Sentry usan la versión del package (equivocada). `scripts/bump-version.js` no toca el lock.

### Hallazgos MEDIOS (selección)

- **S2 — Errores con `console.error(..., { error: err })`** en ~10 sitios (`useSetupAuth.ts:231,429`, `AuthContext.tsx:55`, `image-store`, `music-store`, `useRsvp`): si la excepción de Firestore incluye el `ref`/path con el `inviteToken`, Sentry no lo redacta en el mensaje (solo en request URL). Loguear `err.message`.
- **S3 — `dayphotos` y `voicenotes`** (`firestore.rules:499-506, 484-494`): el campo `data` se valida SOLO por tamaño, NO por `isEncryptedMedia` (a diferencia de gallery/audio/configImages). Un invitado puede alojar texto arbitrario en claro (abuso de almacenamiento, sin cifrado en reposo).
- **S4 — `Sections`/`tables` lectura pública con nombres completos** (`firestore.rules:545-571`, `guests`): la distribución de mesas expone nombres completos de confirmados al margen del opt-in de `confirmedPeople`. Lectura solo con sesión o anonimizar.
- **S5 — `SuperAdminContext.tsx:99`** registra el email del responsable en `console.error`.
- **P1 — PBKDF2 600k por imagen**: `crypto-utils.ts` deriva clave por salt aleatorio por mensaje; una galería de 20 fotos paga 20 derivaciones (~0,1-0,5 s c/u en móvil). Derivar UNA clave por token + IV por mensaje.
- **P2 — FOUT en Lora**: `index.html` preload de Playfair/GreatVibes pero no de `Lora` (fuente del cuerpo de la invitación, `.story-copy`).
- **P3 — O(n²) al deduplicar nombres** en el select de búsqueda de `AttendanceTab.tsx:357-366` (con 500 respuestas ≈ 250k comparaciones en cada render).
- **A2 — Focus trap incompleto en modales interiores**: `useInertBackground` (`useFocusTrap.ts:100-110`) solo inerta los hermanos de `#root`; modales dentro de `<main>` (AttendanceTab, lightbox, vídeo de bienvenida, InvitationDetailModal) dejan el fondo legible por el lector de pantalla. Tampoco hay scroll-lock en esos casos.
- **A3 — Contraste:** footer `opacity: 0.4` ≈ 1.9:1 (`App.tsx:358`), versión del menú móvil 0.6 (`index.css:2346-2350`), rojos/verdes pequeños (`AccessTab.tsx:64`, `index.css:2994-2998`).
- **A4 — Inputs "otras alergias" sin label** (solo placeholder): `RsvpSection.tsx:686-698, 914-922`.
- **L1 — Retención de logs indefinida**: `accessLog`, `configLog`, `visitLog`, `consentLog`, `auditLog` sin plazos ni purga (GDPR 5.1.e); dependen del borrado completo (roto en C1).
- **L2 — Doble política de privacidad divergente**: `src/content/privacy-policy.md` (incompleta, sin voz/fotos/menores/mesas/logs) NO se muestra en la app; la visible es la cadena i18n `legal.privacyPolicy`. La versión de re-consentimiento (`PRIVACY_POLICY_VERSION=2026-08-10`) no coincide con el `.md` ("2026-07-22").
- **L3 — Funciones sociales sin transparencia art. 13** en el punto de recogida (notes, songs, rides, gifts, mailbox, voz, fotos del día): no informan de visibilidad pública, tratamiento ni plazo. La voz (`VoiceNotesSection`) usa `getUserMedia` sin consentimiento de tratamiento explícito.
- **L4 — Sin autoservicio de supresión de aportaciones sociales en servidor** (borrado solo admin/superadmin en reglas); el `ownerKey` prometido en el changelog no existe en `functions/`.
- **L5 — Sin política de cookies separada**; el `consentLog` no se registra en la landing (sin token).
- **Q1 — IBAN**: `config-validation.ts:112-117` valida solo formato/longitud (regex), mientras `iban-utils.ts` implementa checksum mod-97 completo y no se usa en producción. Rechaza/acepta mal IBANs.
- **Q2 — 10 dobles-cast `as unknown as`** (`useRsvp.ts:856-869`, `PublicInvitation.tsx:979`, `InvitationsTab.tsx:104`…) que degradan el tipado de payloads RSVP.
- **Q3 — `Math.random` para IDs** en `AttendanceTab.tsx:151`, `voice-store.ts:42`, `ExtrasSectionForm.tsx:97` → `crypto.randomUUID()`.
- **Q4 — `key={i}` en listas reordenables/editable** (`GalleryArrayEditor.tsx:266`, `SetupArrayEditor.tsx:46`, `RsvpSection.tsx:507`).
- **Q5 — `encrypt`/`decrypt` devuelven `""` en silencio** (`crypto-utils.ts:106,131`): un fallo de WebCrypto guardaría `bankInfo` vacío sin aviso.
- **I1 — Falta clave `rsvp.menuOtro`** (se usa `t("rsvp.menu"+order)` con `"otro"` en `constants.ts:40`) → muestra la clave cruda si un invitado elige ese plato.
- **I2 — `panel.withCompanions` interpola `count` en clave NO plural** → "1 acompañante(s)".
- **I3 — Fechas sin `i18n.language`** (~13 sitios: `excel-builders.ts:310-317`, `VoiceNotesSection.tsx:156`, `DataTab.tsx:976`, `MetricsTab.tsx:128`…) → usan el locale del navegador, no el de la UI.
- **I4 — HTML exportado de DataTab con texto ES hardcodeado** (`DataTab.tsx:332-334`).
- **T2 — `isSafeText` no cubierto por tests de reglas** (`scripts/rules-test.mjs` con emulador real) y `src/lib/__tests__/firestore-rules.test.ts` es una simulación JS que duplica la lógica, no el emulador.
- **T3 — axe solo audita 2 componentes triviales** (`ErrorBoundary`, `LoadingOverlay`); sin regresión a11y en páginas reales.
- **H3 — Overrides `uuid ^11.1.1` no aplica** a `universal-analytics` (require `uuid ^14`) → `npm ls` ELSPROBLEMS.
- **H4 — `manualChunks` captura `react-i18next` con la regla react** antes que la de i18n (`vite.config.js:118-119`): el chunk i18n no sale limpio.
- **H5 — `build.target`/`minify` sin fijar** vs `BROWSER_COMPAT.md` (120+); fijar `target:"es2022"`.

### Hallazgos BAJOS (selección)

- Dead code: 17 exports de `lib/` usados solo en tests (`isValidIBAN`, `isDateInPast`, `clearAllStorage`, `encodeInviteConfig`, `loadDecryptedField`…).
- `loggingInRef` nunca leído en `SuperAdminContext.tsx`.
- `catch {}` sin señal en renovación de sesión (`AuthContext.tsx:74`) y `generateNewToken` (`SetupPage.tsx:81`).
- 9 ficheros >700 líneas con candidatos claros de extracción (RsvpSection 1249, PublicInvitation 1033, DataTab 1016, useRsvp 1015, ManageTab 936, DistribucionTab 842, ConfigContext 780, AttendanceTab 737, GallerySection 719).
- `eucalyptus.webp` 800×800 / 61 KB mostrada a ~300 px (`src/assets/eucalyptus.webp`).
- Key dinámica `monthNames.*` y valores persistidos `weddingMonth: "enero"…` atados al español (no escalan a 3er idioma).
- CI sin `permissions:` mínimo, actions sin pin por SHA, sin upload de artefactos Playwright.
- `@sentry/vite-plugin` nunca corre (sin `SENTRY_AUTH_TOKEN` en CI).
- Configs: `oxlint` sin plugins typescript/jest/vitest; `check-bundle-size` referencia chunk `vendor-xlsx` muerto; local Node v26 vs `.nvmrc` 22.
- CSP meta de `index.html:58` diverge del header (`upgrade-insecure-requests`, `frame-ancestors`).

### Verificado como CORRECTO (no duplicar trabajo)

- **Seguridad:** sin `dangerouslySetInnerHTML` (solo tests); textos de Firestore renderizados con interpolación React escapada + `isSafeText`/`isValidSafeUrl`/`isValidLongSafeText` en reglas; enlaces de mapas validados con `isValidGoogleMapsUrl`; sesión admin/setup avalada por reglas (`setupTokenValid`, TTL 30min-48h, renovación con ataque anti-sesión-zombi, logout sin escalada); redacción del token en Sentry (`redactSecretsFromUrl`); cifrado AES-GCM documentado (modelo de amenaza C1 correcto); analytics/Sentry sin PII y gated por consentimiento; uploads validados por tipo/tamaño + reglas; sin `eval`/`new Function`; `.env` ignorado en git.
- **Prestaciones:** todo memoizado por sección (`PublicInvitation`), timers con cleanup + pausa por `visibilitychange`, animaciones CSS (sin rAF), paginación de tablas, cachés LRU/single-flight de imagen/audio, split de chunks (auth/storage/analytics/sentry/qrcode lazy), headers inmutable para assets, PWA correctamente precacheados.
- **Accesibilidad:** skip link, focus trap compartido con restauración de foco, restauración a abridor, tabs ARIA con roving, toasts con `role=status`/`alert`, alt en imágenes, `target=_blank` con `rel=noopener`, `prefers-reduced-motion` global + kill-switches, RTL soportado, AccessibilityPanel completo, jerarquía de headings correcta, focus-visible con anillo doble.
- **i18n:** cobertura 100% (1704 claves, sin claves solo-ES o solo-EN), carga lazy de locales, `load: languageOnly`, plurales `_one/_other` correctos, countdown/idioma por invitación.
- **Legal:** RSVP con consentimientos completos (privacy + health + parental cutoff CI + contact opt-in + opt-in lista de confirmados), `consentLog` en servidor con versión/ts, borrado en cascada completo al eliminar la invitación (todas las subcolecciones + setupTokens + rsvpResponses), fuentes autoalojadas (sin Google Fonts), mapas/traductor bajo clic, audífonos de política en ambos idiomas (GDPR/UK/CCPA/LGPD/PIPEDA/POPIA).
- **Calidad:** `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`, 0 `any`, 0 `@ts-ignore`, TODOs = 0, keys de `.map` completas, inputs controlados, tokens con `crypto.getRandomValues` con muestreo correcto.
- **Tooling:** `tsc --noEmit` EXIT 0, `npm audit` 0 vulnerabilidades, CI sólido (lint:ci, typecheck x2, vitest con thresholds 89.5/80/86.5/91.8, deploy sin confirmación), emuladores configurados.

### Comandos de verificación ejecutados

- `npm run lint` → 1 error + 5 warnings (ver C3)
- `npm run typecheck` → EXIT 0
- `npm run build` → OK en 342 ms (chunks: vendor-firebase 572 KB/167 gz, vendor-sentry 271/88, vendor-react 223/71, index 100/29)
- `npm audit --omit=dev` → 0 vulnerabilidades
- `npx vitest run src/lib/__tests__/excel-export.test.ts src/__tests__/main.test.tsx` → 2 fallados + 1 unhandled (ver C2)
- `node -e "new Date('enero 1, 2000')"` → Invalid Date (ver C1)

### Plan de acción recomendado (en orden)

1. **Fase 1 (críticos):** C1 scheduler de retención + test; C2 suite de tests (2 fallos + unhandled); C3/C4 lint:ci + versionado.
2. **Fase 2 (altos):** S1 `isSafeHref` central; A1 teclado del editor de mesas; T1 contrato de export Excel; S3 `isEncryptedMedia` en dayphotos/voicenotes; P1 clave por token en crypto-utils.
3. **Fase 3 (medios):** A2 focus trap en modales interiores; L4 autoservicio de supresión; I1/I2 claves i18n; Q1 checksum IBAN; P2 preload Lora; P3 `Set` en AttendanceTab.
4. **Fase 4 (mejora continua):** política única de privacidad versionada, política de cookies, purga de logs, reordenar manualChunks, fijar `target`, axe en páginas reales, tests de `useSessionRenewal`/`Modal`/secciones sociales, fijación visual E2E, migrar tests de reglas al emulador.

---

## Auditoría del superadmin (v2.95.45 — 2026-08-09)

**Versión anterior:** v2.95.44 → **v2.95.45 (auditoría del superadmin)**

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

## Funciones nuevas del superadmin (58 propuestas)

**Implementadas y desplegadas (34) en v2.95.46–49:**

- **Fase 1 (9)**: editor global de configuración, traspaso de titularidad, clonado, expiración manual, previsualización sin contar visita, copia de secciones, sello de verificación, notas internas, mensaje de agradecimiento post-RSVP.
- **Fase 2 (8)**: actividad reciente, embudo (visitas sin confirmar), confirmaciones por día, historial de respaldos, búsqueda por contenido, comparativa de temas, columna de usuario, estadísticas de dispositivo (UA).
- **Fase 3 (9)**: modo mantenimiento, banner global, listas negras de URLs y tokens, umbral de expiración, estado de invitación (activa/revisión/bloqueada), etiquetas con filtro, aforo máximo, firma digital en RSVP, avisos de expiración en dashboard.
- **Fase 4 (8)**: cierre de sesión remota, registro de accesos, previsualización por dispositivo, QR, auto-respuesta, modo presentación, invitado asistido (v2.95.49-50).
- **Fase 5 (4 viables)**: PDF/imprimir confirmaciones, restauración de backup, auditoría de config (configLog), GC de Storage huérfano (v2.95.50).

- **Lote final (8, v2.95.52)**: panel de detalle de invitación (RSVP+menús, moderación social, galería, configLog, reset, export, import CSV), búsqueda global de invitados (GDPR), tema en bloque, comparador de invitaciones, validador de configuración y fecha de creación.

Con esto queda implementado TODO el lote viable sin backend. Las ~16 que requieren Cloud Functions/servicios externos se mantienen descartadas.
- **Lote verde/ámbar (13, v2.95.51)**: export CSV de confirmaciones, resumen de menús, columnas de visitas/actividad, filtros por actividad, enlace directo al admin, QR-PNG, copiar enlace e .ics, agenda de próximas bodas, aviso de boda pasada (bloquea RSVP) y traducción con widget de Google (usuario-initiated, disclosed).

**Descartadas definitivamente (~16)** — el plan Spark es permanente (sin migración a Blaze), por lo que las funciones que requieren Cloud Functions o servicios externos NO se implementarán: API/webhooks, backup automático programado, alertas por email, traducción automática, encuesta personalizada, comparador de invitados vs. confirmados, bloqueo geográfico por IP, simulación de reglas Firestore, autoservicio de borrado social (H4), detección de abuso con bloqueo automático y notificaciones de seguridad por email.

## Próximos pasos recomendados
1. **Operativo**: App Check + MFA superadmin + rotación de credenciales (mayor mitigación de abuso/DoS) — requiere consola de Firebase.
2. **H4 (bloqueado por plan Spark)**: el autoservicio de borrado social necesita Cloud Functions (plan Blaze). Sin Blaze, se mantiene el borrado admin + email.
3. **[Perf] Setup (completado en v2.95.44)**: store de selectores `useFormField`/`useFormStore`; re-render acotado por campo.
4. **[Perf] RSVP (completado en v2.95.44)**: `rsvpForm` aislado en `RsvpFormContext`.
5. **[Legal] Consentimiento (completado en v2.95.44)**: registro servidor `consentLog` + IndexedDB `memoryLocalCache` bajo rechazo.
6. **Exports solo-usados-por-tests** (9): eliminar o acotar (higiene menor).
7. **`functions`**: revisar aislamiento de errores y paginación en `cleanupExpiredData` (mejora de robustez).
