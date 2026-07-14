# Wedingo — Invitaciones de boda digitales

**Versión:** 2.1.26

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

## Estado Auditoría (2026-07-15)

| Eje | % |
|-----|--:|
| Seguridad | 78% |
| Rendimiento | 65% |
| Accesibilidad | 68% |
| i18n | 82% |
| **Global** | **73%** |

Informe completo: `AUDITORIA.md`
