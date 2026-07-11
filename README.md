# Wedingo — Invitaciones de boda digitales

**Versión:** 2.1.21

Plataforma web para crear y gestionar invitaciones de boda personalizadas con RSVP online, galería de fotos, mapas, y más.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Backend:** Firebase (Firestore, Hosting, Authentication)
- **i18n:** react-i18next con 85+ idiomas
- **Calidad:** Vitest (168 tests), ESLint

## Despliegue

```bash
rm -rf dist .firebase && npm run build
npx firebase-tools deploy
```

## Estado Auditoría (2026-07-11)

| Eje | % |
|-----|--:|
| Seguridad | 74% |
| Rendimiento | 55% |
| Accesibilidad | 68% |
| i18n | 70% |
| **Global** | **67%** |

Informe completo: `AUDITORIA.md`
