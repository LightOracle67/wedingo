# AUDITORÍA — Wedingo

**Fecha:** 28/08/2026 · **Versión:** v2.166.0 · **Suite:** 2411 tests ✓ · Lint ✓ · tsc ✓

## Ronda 0→100% (24/08/2026) — multi-dimensional

| Dimensión | Resultado | Detalle |
|---|---|---|
| Secretos (repo+historial) | ✅ Limpio | Solo `apiKey` web pública en scripts/e2e (diseño Firebase); sin tokens OAuth/PAT en historial |
| Dependencias (`npm audit --omit=dev`) | ✅ 0 CVEs | 131 deps prod, 0 vulnerabilidades |
| Cabeceras HTTP (`firebase.json`) | ✅ Completas | CSP, HSTS, XFO, X-Content-Type-Options, COOP/CORP, Referrer/Permissions-Policy |
| Firestore rules (ronda 4) | ✅ Endurecidas | setupTokens no falsificable (alta solo si invitación inexistente/sesión activa); sesión acotada 30min–48h; RSVP whitelist (contador cap 500 y contador de asistentes en `count`/`attendingCount`); `_visits` con incremento máx +10 |
| XSS (sinks) | ✅ Limpio | Único `document.write` (DistribucionTab) con todo interpolado vía `esc()`; sin `dangerouslySetInnerHTML` |
| Usabilidad E2E prod (invitado) | ✅ | Token inválido → mensaje elegante; landing/RSVP completos; 0 errores JS; sin overflow horizontal |
| Usabilidad E2E prod (superadmin) | ⚠️→✅ | Login OK, métricas OK. **BUG corregido:** pestañas Métricas/Soporte mostraban `key 'superadmin.tabs.metrics' returned an object…` (dicts usados como labels) → nuevas claves string `metricsTab`/`supportTab` + fix `TAB_KEY_MAP` |
| Resiliencia | ✅ | Firestore bloqueado → app renderiza desde caché local, sin pantalla blanca; localStorage corrupto → sin crash |
| Admin sin sesión | ℹ️ | `/TOKEN/admin` redirige a vista pública (acceso admin desde dentro); UX aceptable |

### Recomendaciones (no aplicadas — requieren decisión)
- **R1 (medio):** validar entradas de `companions` server-side (tamaño/tipo de lista) para acotar crecimiento de documento.
- **R2 (medio):** Firebase App Check en escrituras públicas RSVP/logs (mitiga inflado de contador y spam de `accessLog`).
- **R3 (bajo):** mover `apiKey` de scripts/e2e a variables de entorno.
- **R4 (info):** la invitación de pruebas `TtCgt9n8VT` ya no existe en producción (AGENTS.md desactualizado).

---

**Fecha:** 23/08/2026 · **Versión:** v2.123.6 · **Suite:** 2251 tests ✓ · Lint ✓

## Resumen de remediación (esta ronda)

| Área | Estado |
|---|---|
| SEGURIDAD (S-C1, S-C2, S-A1, S-M1–M6) | ✅ Cerrada |
| TESTS/CI (T-C2, T-A1, T-A3, T-A4, T-A5) | ✅ Cerrada |
| LEGAL (L2 TTL accessLog, L3 ownerKey autoservicio, L4 voiceConsent, L5 lang consentLog) | ✅ Cerrada (`firestore.rules`) |
| CALIDAD (Q-A1 logs→safeLogError, Q-A2 catches silenciosos, Q-A3 decrypt) | ✅ Cerrada |
| i18n (I1/I2 exports, I3 fechas localizadas, I5 mojibake=0) | ✅ Cerrada |
| A11Y (H1-H5, M1-M10) | ✅ Cerrada: imgs con `alt`, jerarquía `h1` condicional correcta, icon-buttons con `aria-label` |
| RENDIMIENTO (P-C1, P-A1–A4) | ✅ Sin regresiones (cerrados 11/07; bundle inicial 382KB gzip) |

### Detalle CALIDAD
- **Q-A1:** todos los `console.error/warn` crudos migrados a `safeLogError` (redacción de token). Excepción intencional: `logError()` en `error-utils.ts` (solo DEV, ya envía a Sentry redactado).
- **Q-A2:** catches silenciosos en rutas de seguridad/datos ahora registran vía `safeLogError` (persistencia superadminUid, refreshToken, trackEvent). Los best-effort cosméticos permanecen silenciosos por diseño.
- **Q-A3:** `decrypt()` registra el fallo final sin filtrar el token y devuelve vacío para no romper el render. El catch intermedio es fallback esperado new→legacy.

### Detalle i18n/A11Y
- Nuevo módulo `src/lib/redact.ts` (sin dependencia de `storage`) que rompe el ciclo `storage → safe-error → sentry → storage`; `sentry.ts` re-exporta `redactSecretsFromUrl` por compatibilidad.
- Fechas localizadas en `VoiceNotesSection` y `excel-builders` (invitado/lib compartida); pestañas internas superadmin mantienen locale del navegador a propósito.
- Mojibake eliminado en 7 ficheros (incluía strings visibles `"Token no válido"`, regex de username y marcador `✓`).

## Pendiente planificado (próxima iteración)

**REFACTOR estructural** — no ejecutado en esta ronda para no arriesgar producción sin suite de caracterización dedicada:
1. `RsvpSection.tsx` (~1395 líneas) → extraer subcomponentes por paso del formulario + hooks de campo.
2. `useRsvp.ts` (~915 líneas) → continuar extracción iniciada en `rsvp-payloads.ts` (validadores y builders restantes).
3. `PublicInvitation.tsx` → separar overlays (sobre/sobre-apertura/mantenimiento) del flujo principal.
4. `DataTab.tsx` (~976 líneas) → extraer tabla virtualizada y modales.

Criterio de aceptación: cada extracción con tests de regresión previos, bundle sin crecimiento y 2251+ tests en verde.
