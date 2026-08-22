# AUDITORÍA — Wedingo

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
