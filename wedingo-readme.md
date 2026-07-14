# Wedingo

Plataforma web para crear y gestionar invitaciones de boda personalizadas. 100 idiomas, 21 temas, RSVP con acompañantes, galería, música y mapa interactivo.

## Stack

**Frontend:** React 19, TypeScript 7, Vite 8, Tailwind CSS 4  
**Backend:** Firebase (Firestore, Auth, Hosting)  
**Tests:** Vitest, Testing Library, Playwright, axe-core  
**CI/CD:** GitHub Actions (lint → typecheck → test → coverage → audit → build → bundle check → deploy)  
**Monitorización:** Sentry (errores + rendimiento), Firebase Analytics, Web Vitals  

## Rutas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | LandingPage | Crear invitación o acceder con código |
| `/:token` | PublicInvitation | Invitación pública (8 secciones) |
| `/:token/setup` | SetupPage | Configuración inicial |
| `/:token/admin` | AdminPage | Panel de administración (6 pestañas) |
| `/:token/print` | PrintPage | Tarjeta imprimible |
| `/superadmin` | SuperAdminLogin | Login de superadmin |
| `/superadmin/dashboard` | SuperAdminPanel | Gestión de plataforma |

## Invitación pública (8 secciones)

| Sección | Contenido |
|---|---|
| Hero | Foto, nombres, countdown, mensaje, padrinos |
| Details | Fecha, hora, lugar, mapa (Google Maps Embed), transporte |
| Info | Horario, código de vestimenta, política infantil |
| Story | Historia de amor (texto libre) |
| Gallery | Galería de fotos con lightbox |
| Gifts | Información de regalos, IBAN |
| Accommodation | Alojamiento |
| RSVP | Confirmación de asistencia con acompañantes, menú, alergias |

## Administración (6 pestañas)

| Pestaña | Funcionalidad |
|---|---|
| Panel | Estadísticas, últimas confirmaciones, backup/restore |
| Invitación | Editor completo de la invitación |
| Asistencia | CRUD de respuestas, filtros, PDF, selección múltiple |
| Compartir | Enlace público, WhatsApp/Telegram/SMS, mensaje |
| Acceso | Gestión de token de acceso, cerrar sesión, eliminar |
| Soporte | Ayuda, derechos de datos, contacto |

## RSVP

- Modelo individual: cada persona elige su asistencia (solo/a, con acompañantes, no asiste)
- Cada acompañante tiene su propio documento en Firestore
- Campos por persona: nombre, fecha nacimiento, menú, alergias, consentimientos
- Prefill al escribir el nombre (restaura datos existentes)
- Banner "Acompañas a X" para acompañantes

## Temas (21)

7 claros, 7 oscuros, 7 LGTBIQ+ — cada uno con `--invite-core-color` único.

| Claros | Oscuros | LGTBIQ+ |
|---|---|---|
| Golden, Forest, Rose | Amber-night, Onyx-gold, Midnight-royal | Rainbow, Trans, Nonbinary |
| Linen-soft, Blush-pearl | Burgundy-velvet, Sapphire-night | Lesbian, Bi, Pan, Ace |
| Lavender-mist, Champagne-bubble | Emerald-grove, Plum-twilight | |

## Idiomas

100 idiomas soportados via `react-i18next` + `i18next-browser-languagedetector`.  
Selector de idioma en el pie de página y barra de admin.

## Seguridad

- **Cifrado:** AES-256-GCM + PBKDF2 (600K iteraciones) para imágenes, audio y bankInfo
- **Tokens:** Token de acceso único por invitación, renovación cada 60s, expiración 24h
- **Firestore:** Reglas con validación de sesión activa, XSS protection, límites de tamaño
- **CSP:** Política estricta en cabeceras HTTP + meta tag
- **Autenticación:** SuperAdmin con Firebase Auth
- **Sesión:** localStorage con TTL 24h, reparación automática si falta en Firestore

## Almacenamiento de imágenes

Las imágenes de configuración (foto, sello, fondo, esquinas) se almacenan en subcolecciones de Firestore:

```
/invitations/{token}/configImages/{imageId}  → datos cifrados AES-256
/invitations/{token}/gallery/{imageId}       → galería cifrada
/invitations/{token}/audio/{docId}           → audio fragmentado (200KB chunks)
```

El documento principal solo contiene referencias (`__cfgimg:couplePhoto`), evitando el límite de 1MB por documento.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:coverage` | Tests con cobertura |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Oxlint |
| `npm run e2e` | Tests E2E (Playwright) |
| `npm run deploy` | Build + deploy a Firebase Hosting |

## Variables de entorno

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_SUPERADMIN_ROUTE
VITE_ADMIN_EMAILS
VITE_SENTRY_DSN
SENTRY_AUTH_TOKEN
FIREBASE_TOKEN
```

## Licencia

MIT © 2026 Adrián Carrasco López
