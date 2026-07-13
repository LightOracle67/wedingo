# Auditoría técnica — Wedingo

**Fecha:** 2026-07-13
**Versión auditada:** 2.1.24
**Método:** Revisión manual guiada, contrastando hallazgos previos contra el código real archivo por archivo (no análisis estático automatizado).

> Este informe sustituye a la versión anterior, que había quedado desactualizada respecto al desarrollo del proyecto: de 18 hallazgos heredados revisados hoy, 15 ya estaban resueltos en el código y solo 3 requirieron cambios reales.

---

## 1. 🔒 Seguridad y Legalidad

### Revisado hoy — sin acción requerida
Los siguientes hallazgos de una auditoría anterior fueron verificados contra `firestore.rules`, `storage.rules`, `src/lib/firebase.js` y `src/hooks/useSetupAuth.js`, y ya estaban correctamente resueltos:

| Hallazgo | Verificación |
|---|---|
| `hasActiveSession` vs logout que escribe `null` | `null is timestamp` → `false`; comportamiento correcto tras logout |
| `privacyConsent` no exigido en `update` de `rsvpResponses` | Sí exigido (`firestore.rules:111`) |
| `setupTokens` autoGen sin auth | Protegido server-side: solo con `hasActiveSession` real sobre la invitación |
| `experimentalForceLongPolling` | No existe en `src/lib/firebase.js` |
| Sesión restaurada antes de verificar Firestore | Ya verifica contra Firestore antes de `setIsTokenVerified(true)` (`useSetupAuth.js:64-79`) |
| Storage rules referencian colección `sessions` inexistente | `storage.rules` ya usa el modelo `activeSession` sobre `invitations` |
| Validación de URL de música permite `http://`/`javascript:` | Ya exige `^https:\/\/` estricto (`AppContext.jsx:552`) |
| `isSafeText` no bloquea event handlers | Ya bloquea `javascript:` y `on\w+=` (`firestore.rules:25-31`) |
| Salt fijo en PBKDF2 | Ya es dinámico, derivado del secreto por invitación (`crypto-utils.js:13`) |

### Pendiente de revisar
No se auditaron hoy (fuera del alcance de la sesión, no estaban en la lista de hallazgos trabajada):
- Expiración de `activeSession` en Firestore (posible sesión perpetua sin timeout de inactividad más allá del `sessionExpiresAt` — confirmar TTL real)
- Resto de hallazgos "Medios" no listados en la sesión anterior (M1, M2, M3, M7, M9, M10 — no se dispone de su descripción original)

---

## 2. ⚡ Rendimiento

### Arreglado (v2.1.22)
- **i18n cargaba las 85 traducciones de golpe** en el bundle principal. Migrado a `i18next-resources-to-backend` con `import()` dinámico por idioma.
  - Chunk principal: **3.5 MB → 465 KB (-87%)**
  - Cada idioma es ahora su propio chunk (28-69 KB según idioma), cargado solo cuando se necesita

### Pendiente
- `index.esm-*.js` (Firebase SDK): 487 KB — candidato a revisar imports modulares (`firebase/firestore` completo vs funciones sueltas)
- `leaflet-src-*.js`: 149 KB — evaluar carga diferida (solo se usa en mapa de ubicación)
- Warning de Vite persiste para chunks >500 KB (el `index.esm` de Firebase)

---

## 3. ♿ Accesibilidad, UX y Responsive

### Arreglado (v2.1.23)
| Hallazgo | Fix |
|---|---|
| Contraste insuficiente en 4 temas claros (`linen-soft`, `blush-pearl`, `lavender-mist`, `champagne-bubble`) | `--invite-title-color` oscurecido en cada tema, manteniendo el matiz de paleta |
| Galería sin navegación por teclado | `onKeyDown` con flechas ←/→ + `tabIndex`, `role="group"`, `aria-label` en `.gallery-main-container` |
| Sin `aria-live` en estados de error/vacío/no-encontrado de `PublicInvitation` | Añadido `aria-live="assertive"` en los 3 estados finales |

### Revisado hoy — ya resuelto (sin acción)
Focus trap en `LegalModal`/`AccessibilityPanel`/`LanguageSwitcher` (`useFocusTrap` correctamente enganchado con `ref`), `outline:none` sin alternativa (todos los selectores relevantes ya tienen `:focus-visible` con outline visible), `aria-labelledby`/`id` en tabs de `AdminPage` (coinciden), `alt` de imagen decorativa en `HeroSection` (ya `alt=""` + `aria-hidden`).

### Pendiente
- Ninguno de los hallazgos originales queda abierto. Recomendable pasar una herramienta automatizada (axe, Lighthouse) para detectar hallazgos nuevos no cubiertos por la lista anterior.

---

## 4. 🌐 Internacionalización

### Arreglado (v2.1.24)
- **61 keys muertas eliminadas** de `es.json`/`en.json` y propagada la limpieza a los 84 locales restantes (2254 eliminaciones en total). Incluye 24 keys `messages.msg0`-`msg23`, residuo de una implementación anterior migrada a `src/lib/invite-messages.js` (array hardcodeado).

### Revisado hoy — ya resuelto (sin acción)
- Soporte RTL: `document.documentElement.dir` ya se gestiona dinámicamente en `App.jsx` para `ar, he, ur, fa, ps, ku`
- `toLocale*(undefined)`: 0 ocurrencias en el código, ya se pasa `i18n.language` correctamente

### Pendiente
- 64 keys de traducción aún faltantes en algunos de los 85 locales (no verificado cuáles tras la limpieza de hoy — recontar)
- Plurales `_one`/`_other` implementados solo en 1 key (`csv.companion`)
- `src/lib/invite-messages.js`: los mensajes largos de invitación solo existen en `es`/`en` hardcodeados; el resto de idiomas cae a español por defecto

---

## Resumen de hallazgos por sesión (2026-07-13)

| Categoría | Hallazgos revisados | Requerían fix | Ya resueltos |
|---|:--:|:--:|:--:|
| Seguridad | 9 | 0 | 9 |
| Rendimiento | 1 | 1 | 0 |
| Accesibilidad | 8 | 3 | 5 |
| i18n | 3 | 1 | 2 |
| **Total** | **21** | **5** | **16** |

**Versiones desplegadas en esta sesión:** 2.1.22 (rendimiento) → 2.1.23 (accesibilidad) → 2.1.24 (i18n)
