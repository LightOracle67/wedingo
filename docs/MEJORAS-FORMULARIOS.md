# MEJORAS-FORMULARIOS.md — Plan de mejoras para los formularios de Wedingo

> Documento vivo. Generado el 2026-08-26 a partir de investigación de diseño (lazyweb
> screenshots de productos reales, ui-ux-db design system, tendencias web 2026) y del
> análisis propio del código. Cada mejora se implementa solo tras aprobación, salvo las
> marcadas como [urgencia] (errores reales en producción).

---

## 0. Fuentes de la investigación

| Fuente | Qué aporta |
|---|---|
| **lazyweb** (screenshots reales) | hitch (hitchd.com/guest-list) — dashboard gestión RSVP: tabla invitados con columnas name/party/contact/wedding day/tags/notes + banner de estado + nav superior. partiful.com — invitaciones de boda modernas. paperlesspost.com — invitaciones. withjoy.com registry. honeybook — SaaS de proveedores de boda. |
| **ui-ux-db design system** | Paleta "Interior warm grey + gold accent": primary `#78716C`, accent/CTA `#D97706` (dorado), background `#FAF5F2` (crema cálido), foreground `#0F172A`, border `#EEEDED`, destructive `#DC2626`, ring `#78716C`. Estilo "Exaggerated Minimalism" (tipografía oversize, alto contraste, espacio negativo, WCAG AA). |
| **Web 2026 (ivyforms, designsystems.surf, clarroxweb, uxdesign.cc, antforms)** | Top-aligned labels > floating > placeholder-only (NNGroup). Segmented controls para 2-4 opciones exclusivas. Radio para 3-6 visibles. Evitar selects nativos en móvil. Single-column en móvil. Micro-interactions 150-300ms. prefers-reduced-motion. Accesibilidad = requisito de design system. |
| **Anthropic CLAUDE.md (design system)** | Fondo cálido `#f5f4ed`, accent terracotta `#c96442`, neutros siempre cálidos, serif headings weight 500, ring shadows `0 0 0 1px`, radius 8-32px, focus ring `#3898ec`, body line-height 1.60. |

---

## 1. Bugs / errores reales (prioridad: urgencia)

### 1.1 [URGENCIA] Errores al guardar la configuración de la invitación
- **Síntoma**: algunos campos del formulario de configuración dan error al guardar.
- **Estado**: causa raíz parcialmente corregida en sesiones previas (`isValidSafeUrl('')=false`
  rechazaba documentos con URLs vacías → fix `b4210e7`, permitir `url==''`). Pendiente de
  verificación campo a campo completa contra producción (payload real del setup vs whitelist
  de `firestore.rules`).
- **Acción**: debug sin saltos del flujo `ConfigContext.handleSaveSetup` + `validateConfigForSave`
  + `isValidInvitationUpdate` (rules) reproduciendo cada campo vía REST anónimo.

### 1.2 [URGENCIA] Campos del panel admin que dan errores
- **Síntoma**: algunos campos de los paneles admin/superadmin de invitación fallan.
- **Estado**: pendiente de auditar AttendanceTab / DistribucionTab / DataTab / ManageTab y sus
  escrituras contra las rules.

---

## 2. Mejoras de UX propuestas (por implementar tras aprobación)

### 2.1 Labels y estructura de campos
- [ ] **Labels siempre visibles y top-aligned** en todos los setup forms (nunca placeholder-only).
      Los inputs con `placeholder` deben mantener un label visible arriba.
- [ ] **Helper text persistente** bajo cada campo sensible (formato esperado, límite de
      caracteres) con `aria-describedby`, en vez de solo hint al hover.
- [ ] **Indicador de obligatorio** coherente (`*` con `aria-required` + leyenda) en todos los forms.
- [ ] **Agrupar campos por secciones con fieldset/legend** donde haya bloques largos
      (transporte, menú, invitados) para mejorar la navegación por lector de pantalla.

### 2.2 Controles
- [ ] **Segmented controls** para opciones exclusivas de 2-4 valores (ya aplicado en RSVP `rv2`
      con `.rv2-seg__track`; extender a asistencia/transporte/menú del setup si aplica).
- [ ] **Sustituir selects nativos por chips/radio visibles** en móvil para listas cortas
      (menú de acompañantes, modo de transporte).
- [ ] **Estandarizar toggles**: usar el switch `.setup-toggle` (ya existe) en todos los
      booleanos; nunca checkbox gris por defecto.
- [ ] **Botones tipo chip** para opciones múltiples (alergias ya es chips en RSVP; replicar
      patrón `.rv2-chip` en setup donde haya multi-selección).

### 2.3 Feedback y validación
- [ ] **Error inline bajo el campo** con `role=alert` (no solo un toast global) en todos los
      setup forms.
- [ ] **Focus al primer campo inválido** tras un submit con errores.
- [ ] **Estado de guardado visible**: "Guardando…" → "Guardado ✓" con transición 150-300ms,
      en vez de solo el toast.
- [ ] **Autosave de borrador** del formulario de configuración en `sessionStorage`
      (patrón ya usado en RSVP: `wedin_rsvp_draft_*`).

### 2.4 Visual (paleta cálida + dorado)
- [ ] **Aplicar la paleta warm grey + gold** como acento secundario coherente con el tema:
      hover de botones, anillos de foco, chips activos, enlaces.
- [ ] **Focus rings visibles** (2px, offset 2px) en todos los inputs/selects/buttons con
      `:focus-visible`.
- [ ] **Transiciones 150-300ms** solo en `transform/opacity/filter` (nunca layout).
- [ ] **Respetar `prefers-reduced-motion`** en todas las animaciones nuevas.
- [ ] **Reemplazar emojis como iconos** por SVG (Lucide/Heroicons) — actualmente el
      `AttendanceSelector` usa 👤👥🚫.

### 2.5 Móvil y accesibilidad
- [ ] **Single-column** en móvil para todos los grids de campos.
- [ ] **Objetivos táctiles ≥44px** en chips, radios y botones.
- [ ] **Contraste ≥4.5:1** verificado en todos los labels/placeholders.

---

## 3. Estado de implementación

| Mejora | Estado |
|---|---|
| RSVP UI regenerada (segmented, chips, tarjetas) | ✅ v2.134.0 |
| Botón añadir acompañante estilo chip | ✅ v2.134.1 (cd266d3d) |
| Switch `.setup-toggle` moderno en setup forms | ✅ (CSS, pendiente revisar cobertura) |
| Bugs "errores al guardar" (URLs vacías) | ✅ v2.134.1 (b4210e7) |
| Resto de mejoras de la sección 2 | ⏳ pendiente de aprobación |

---

## 4. Criterios de aceptación (para cada mejora al implementarse)

1. Vitest coverage local en verde (gate: `npx vitest run --coverage` EXIT 0).
2. `tsc --noEmit` sin errores.
3. Sin `any` / `@ts-ignore`.
4. Comentarios exhaustivos en cada cambio (norma AGENTS.md).
5. Verificación real en producción (Playwright o REST) del flujo tocado.
6. Commit atómico en español, sin conventional commits, con bump de `APP_VERSION` antes del build.