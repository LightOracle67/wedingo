# Informe Consolidado de Auditoría — Wedingo

**Fecha:** 2026-07-11 | **Versión:** 2.1.19 | **Proyecto:** `/Users/adriancarrascolopez/wedingo`

---

## Resumen Global

| Eje | Cumplimiento | Hallazgos |
|-----|:---:|:---:|
| 🔒 Seguridad y Legalidad | **74%** | 19 (2 críticos, 5 altos, 8 medios, 4 bajos) |
| ⚡ Rendimiento y Calidad de Código | **55%** | 30 (4 críticos, 6 altos, 9 medios, 8 bajos) |
| ♿ Accesibilidad, UX y Responsive | **68%** | 21 (3 críticos, 5 altos, 6 medios, 4 bajos) |
| 🌐 Internacionalización (i18n) | **70%** | 7 acciones urgentes |
| **GLOBAL PONDERADO** | **67%** | **77 hallazgos totales** |

---

## 1. 🔒 Seguridad y Legalidad (74%)

### Críticos
| ID | Hallazgo | Archivo |
|:--:|----------|:-------:|
| C1 | `hasActiveSession` usa `is timestamp` pero logout escribe `null` | `firestore.rules:9-11` |
| C2 | `privacyConsent` no se exige en update de rsvpResponses | `firestore.rules:79-92` |

### Altos
| ID | Hallazgo | Archivo |
|:--:|----------|:-------:|
| A1 | `privacyConsent` requerido en create pero no en update | `firestore.rules:80,98` |
| A2 | `setupTokens` permite creación sin auth si `autoGen == true` | `firestore.rules:67-69` |
| A3 | `experimentalForceLongPolling` fuerza HTTP en vez de WebSocket | `src/lib/firebase.js:17` |
| A4 | Sesión se restaura antes de verificar Firestore (ventana acceso) | `src/hooks/useSetupAuth.js:74-82` |
| A5 | Storage rules referencian colección `sessions` que no existe | `storage.rules:6` |

### Medios (selección)
- M4: `activeSession` en Firestore nunca expira (sesión perpetua)
- M5: Validación de URL de música permite `http://` y `javascript:`
- M6: `isSafeText` no bloquea event handlers (`onerror=`, `onclick=`)
- M8: Salt fijo en PBKDF2 (`wedingo-salt-v1`)

---

## 2. ⚡ Rendimiento y Calidad de Código (55%)

### Críticos
| ID | Hallazgo | Archivo |
|:--:|----------|:-------:|
| C1 | Imágenes PNG sin optimizar (7MB total: eucalyptus 3.5MB, rings 3MB, bg 429KB) | `src/assets/*.png` |
| C2 | Bundle principal de 3.5MB (Firebase, i18next, admin, setup, superadmin todo junto) | `dist/assets/index-*.js` |
| C3 | `AppContext` monolítico con 50+ dependencias → re-renders globales | `src/contexts/AppContext.jsx:711-770` |
| C4 | Ninguna imagen usa `loading="lazy"` | `PublicInvitation.jsx`, `GallerySection.jsx`, `SetupForm.jsx` |

### Altos
| ID | Hallazgo | Archivo |
|:--:|----------|:-------:|
| H1 | Secciones de invitación no code-splitted | `PublicInvitation.jsx:37-44` |
| H2 | LandingPage y PrintPage sin ErrorBoundary | `src/App.jsx:82,87` |
| H3 | 5100 líneas CSS, 128KB bundle, 48 `!important` | `src/index.css` |
| H4 | Archivos estáticos grandes en `public/` no procesados por Vite | `public/*.png` |
| H5 | Google Fonts desde CDN externo (viola GDPR) | `index.html:30-32` |

### Medios (selección)
- M2: AdminPage tabs no code-splitted (~50KB al bundle principal)
- M3: Dead code: `admin-utils.js` (4 funciones sin usar), `geo-utils.js`, `superadmin-utils.js`
- M4-M6: Funciones inline sin `useCallback` en LegalModal, CookieConsent, AdminPage

---

## 3. ♿ Accesibilidad, UX y Responsive (68%)

### Críticos
| ID | Hallazgo | Archivo |
|:--:|----------|:-------:|
| C1 | Contraste insuficiente en temas claros (ratio ~1.3:1) | `src/index.css:1047-1053` |
| C2 | Sin focus trap en LegalModal ni AccessibilityPanel | `LegalModal.jsx:22-28`, `AccessibilityPanel.jsx:53-58` |
| C3 | `outline: none` en `.setup-input` y `.admin-bar__link:focus-visible` | `src/index.css:2687,3452` |

### Altos
| ID | Hallazgo | Archivo |
|:--:|----------|:-------:|
| A1 | Galería sin navegación por teclado (flechas) | `GallerySection.jsx:218-223` |
| A2 | `aria-labelledby` sin `id` correspondiente en tabs de admin | `AdminPage.jsx:228-240` |
| A3 | HeroSection imagen decorativa con `alt` textual | `HeroSection.jsx:27` |
| A4 | Sin regiones `aria-live` para estados de carga | `PublicInvitation.jsx:373-385` |
| A5 | LanguageSwitcher sin `role="dialog"` ni focus trap | `LanguageSwitcher.jsx:202-226` |

---

## 4. 🌐 Internacionalización (70%)

| Métrica | Valor |
|---------|:-----:|
| Keys en `es.json` | 697 |
| Keys usadas en código | ~596 (85.5%) |
| Keys en código NO definidas | **0** ✅ |
| Cobertura `en.json` vs `es.json` | 99.3% |
| Cobertura 85 locales restantes vs `es.json` | 90.8% (faltan 64 keys) |
| Soporte RTL | **0%** ❌ |
| `<html lang>` dinámico | Sí ✅ |
| `<html dir="rtl">` para árabe/hebreo | **No** ❌ |
| `toLocale*(undefined` en vez de `toLocale*(i18n.language)` | 5 ocurrencias |
| Plurales (`_one`/`_other`) | Solo 1 key |

### Acciones urgentes
1. Añadir `dir="auto"` al `<html>` y lógica RTL para ar/he/ur/fa/ps/ku
2. Reemplazar `toLocale*(undefined` por `toLocale*(i18n.language)` (5 sitios)
3. Traducir 64 keys faltantes en los 85 locales
4. Limpiar 101 keys muertas en `es.json`
5. Implementar plurales correctos con `_plural` / `_one` / `_other`

---

## Prioridad de Acción

### Inmediata (previo a próximo deploy)
1. 🔴 C2 Seguridad: Exigir `privacyConsent == true` en update de rsvpResponses
2. 🔴 C1 Seguridad: Corregir `hasActiveSession` para manejar `null`
3. 🔴 C1 Rendimiento: Optimizar imágenes (WebP + lazy loading + compresión)
4. 🔴 C2 Accesibilidad: Focus trap en LegalModal y AccessibilityPanel
5. 🔴 C3 Accesibilidad: Restaurar outline en focus

### Corto plazo (próximo sprint)
6. 🟠 A5 Seguridad: Arreglar storage.rules (colección sessions no existe)
7. 🟠 H3 Rendimiento: Reducir CSS (agrupar media queries, eliminar !important, borrar index.css.bak)
8. 🟠 C3 Rendimiento: Dividir AppContext en contextos más pequeños
9. 🟠 C2 Rendimiento: Code-split AdminPage tabs + SetupForm
10. 🟠 H5 Rendimiento: Self-hostear Google Fonts
11. 🟠 A2 Accesibilidad: `aria-labelledby` → `id` en tabs admin
12. 🟠 A1-RTL i18n: Soporte RTL para árabe/hebreo

### Medio plazo
13. 🟡 M4 Seguridad: TTL en `activeSession` de Firestore
14. 🟡 M8 Seguridad: Salt aleatorio en PBKDF2
15. 🟡 A4 Seguridad: Verificar sesión antes de restaurar
16. 🟡 M3 Rendimiento: Eliminar dead code (4 funciones sin usar)
17. 🟡 M2 Accesibilidad: Añadir regiones aria-live
18. 🟡 i18n: Traducir 64 keys restantes en 85 locales

---

## Notas Técnicas

- `experimentalForceLongPolling: true` penaliza rendimiento y seguridad — considerar eliminación
- Sin Service Worker / PWA — añadir `vite-plugin-pwa` mejora caché y offline
- Leaflet bien code-splitted (dinámico) ✅ pero su CSS se importa estáticamente ❌
- `vite-bundle-visualizer` no está en devDeps — añadir para futuras auditorías
- `@dataconnect/generated` en dependencias pero sin uso — verificar si eliminar
- `autoprefixer` y `postcss` como devDeps innecesarias con Tailwind v4
