# Informe de candidatos a eliminación (2026-08-24)

Auditoría multidimensión de funcionalidades existentes en busca de cosas a quitar.
Método: escaneo estático del repo + medición de uso real en producción Firestore (3 invitaciones).

## A. Ya ejecutado (aprobado por el usuario)

| Elemento | Evidencia | Estado |
|---|---|---|
| `functions/` completa | Solo contenía `cleanupExpiredData`; `onSchedule` requiere plan Blaze y el usuario confirmó que no pasará a Blaze. Código 100% muerto. | ✅ Eliminada (+ limpieza en `firebase.json`, `package.json` scripts, CI) |

Verificación: 2255 tests ✓ · lint 0 · tsc 0 · build ✓.

## B. Candidatos técnicos seguros (código muerto real)

| # | Elemento | Evidencia | Riesgo | Esfuerzo |
|---|---|---|---|---|
| B1 | ~100 claves i18n huérfanas (de 1721) | Script comparó claves usadas vs definidas; tras excluir plurales dinámicos (`_one/_other`) y prefijos construidos en runtime quedan p. ej.: `rsvp.validation.ageUnder14`, `rsvp.validation.healthConsentRequired`, `rsvp.childrenAllergiesHint`, `rsvp.childrenNotAllowed`, `rsvp.allergies.*` (3), `setup.menuOrderSegundo/Tercero/Otro`, `admin.tabs.herramientas`, `superadmin.tableActions`, `superadmin.deleteConfirmInvitation`, `superadmin.statusAvailable`, `superadmin.revokeButton`, etc. | Mínimo (solo locales es/en) | Bajo |
| B2 | Export `SongRank` en `src/lib/dj-ranking.ts` | Tipo exportado sin ningún consumidor | Cero | Trivial |
| B3 | Campo `legacyToken` en documentos invitación | Vacío en las 3 invitaciones; artefacto de migración antigua. Requiere tocar escrituras/rules si se elimina del esquema. | Bajo-medio | Medio |
| B4 | Ruta de descifrado legacy (`crypto-utils.ts`, LEGACY_KEY_CACHE) | Necesaria solo si existen datos cifrados con el formato anterior a P1 (p.ej. parte del `consentLog`). Verificar antes de borrar: intentar descifrar todos los docs cifrados sin la ruta legacy. | Medio (pérdida de acceso a datos viejos si se equivoca) | Medio |

Falsos positivos verificados (NO eliminar): `tailwindcss` (activo vía `@tailwindcss/vite` + `@import "tailwindcss"`), `qrcode` (PrintPage lazy), `web-vitals` (vitals.ts), `invite-config-codec` (ConfigContext hash), ningún fichero de `src/` está huérfano.

## C. Features activas SIN uso real en producción (decisión de producto)

Datos: 3 invitaciones. "0 docs" = cero documentos en la subcolección correspondiente; flag OFF en todas.

| Feature | Flag(s) | Datos prod |
|---|---|---|
| Notas de invitados | notesEnabled false×3 | 0 docs |
| Buzón (cartas) | mailboxEnabled false×3 | 0 docs |
| Brindis/toasts | toastsEnabled false×3 | 0 docs |
| Notas de voz | voiceNotesEnabled false×3 | 0 docs |
| Fotos del día | dayPhotosEnabled false×3 | 0 docs |
| Encuesta musical + audio | musicPollEnabled/musicFileEnabled false×3 | songs 0, audio 0 |
| Trivia | triviaEnabled false×3 (trivia=[]) | 0 |
| Menú | menuEnabled false×3 | 0 |
| Firma en RSVP | rsvpSignatureEnabled false×3 | — |
| Regalos (lista+info+banco) | giftsListEnabled/giftsInfoEnabled/bankInfoEnabled false×3 | giftList=[], rides 0 |
| Padrinos | godparentsEnabled false×3 ('') | — |
| Redes sociales | facebookEnabled/instagramEnabled false×3 | URLs vacías |
| Vídeo bienvenida | welcomeVideoEnabled false×3 | '' |
| Fecha límite RSVP | rsvpDeadlineEnabled false×3 | '' |
| Historia (texto) | storyTextEnabled false×3 | '' (oculta además en 1 via hiddenSections) |
| Live confirmados | liveConfirmedEnabled false×2 (campo ausente ×1) | — |
| Modo sorpresa | surpriseMode false×2 | '' |

**En uso real (NO tocar):** transporte (bus×1, departures JSON×2), mesas (true×1), kidsPolicy (true×1), venueMap (true×1), horario eventos (1 con datos), dress code (true×1), mensaje invitación (true×1), imágenes config (5 docs), reacciones (3), visitLog/consentLog, sections (2).

### Opciones para el grupo C
1. **Mantener**: son diferenciadores del producto; las bodas reales aún no los han usado (muestra=3).
2. **Lazy-load por feature**: cargar cada sección social solo si su flag está ON → baja el bundle inicial (~382KB gzip) sin quitar producto.
3. **Poda agresiva**: eliminar secciones sin uso (ahorra código/i18n/tests) — irreversible salvo git.

## D. Recomendación
- Ejecutar ya: B1 + B2 (seguros, bajo esfuerzo).
- Decidir producto sobre C (opción 2 recomendada como siguiente gran mejora).
- B3/B4 solo tras verificación adicional.
