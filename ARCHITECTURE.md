# Wedingo — Architecture Overview

## Tech Stack
- **Frontend:** React 19 + TypeScript 7 + Vite 8 (rolldown bundler)
- **Backend:** Firebase (Firestore, Auth, Hosting, Storage)
- **CSS:** Tailwind 4 + CSS custom properties (40+ design tokens)
- **i18n:** i18next + react-i18next (100 languages, lazy-loaded)
- **Map:** Google Maps Embed (iframe, sin API key)
- **Monitoring:** Sentry (errors + perf), Firebase Analytics, web-vitals
- **Testing:** Vitest + Testing Library + axe-core (a11y)
- **CI/CD:** GitHub Actions (lint → typecheck → test → coverage → audit → build → bundle check → deploy)

## Project Structure
```
src/
├── assets/           # Static images and fonts
├── components/       # Reusable React components
│   └── setup-forms/  # Setup wizard form sections (8 forms)
├── contexts/         # React context providers + separate hook files
├── content/          # External content (privacy policy)
├── hooks/            # Custom React hooks (11 hooks)
├── i18n/locales/     # Translation files (100 languages, code-split)
├── lib/              # Utilities, services, store, crypto (30+ modules)
├── pages/            # Route pages
│   ├── admin/        # Admin panel tabs (6 tabs)
│   ├── sections/     # Public invitation sections (9 sections)
│   └── superadmin/   # Super admin panel tabs (6 tabs)
├── styles/           # CSS stylesheets (12 files)
└── types/            # TypeScript type definitions
functions/
└── index.ts          # Cloud Functions (cleanup cron)
```

## Context Architecture
Each context has been split for Fast Refresh compatibility:
```
AppContext.tsx        → AppProvider (component)
useApp.ts             → useApp() hook
ConfigContext.tsx     → ConfigProvider
useConfig.ts          → useConfig() hook
AuthContext.tsx       → AuthProvider
useAuth.ts            → useAuth() hook
UIContext.tsx         → UIProvider
useAppUI.ts           → useAppUI() hook
RsvpContext.tsx       → RsvpProvider
useRsvpContext.ts     → useRsvpContext() hook
ToastContext.tsx      → ToastProvider
useToast.ts           → useToast() hook
```

## Data Flow
1. **ConfigContext** loads invitation data from Firestore on mount, caches in localStorage (2-min TTL, bankInfo viajando cifrado)
2. **AuthContext** manages setup token verification (SHA-256 hash proof-of-knowledge) + admin session (renews every 60s, expires at 60 min)
3. **RsvpContext** manages RSVP submissions per invitation (`rsvpResponses/{token}/responses`, deterministic doc IDs, anti-spam counter)
4. **UIContext** manages UI state (modals, messages, map loading)
5. All contexts merge into a single `useApp()` hook via AppMerger (los consumidores pueden optar por hooks granulares `useConfig/useAuth/useRsvpContext/useAppUI`)

## Firestore Model
```
invitations/{token}                            # Public config doc (get:true, list: superadmin)
  ├── gallery/{imageId}                        # Encrypted images (+description, position)
  ├── audio/{chunkId}                          # Encrypted audio chunks (chunkIndex, totalChunks)
  ├── configImages/{imageId}                   # Encrypted config images (couplePhoto, background, seal, corner)
  ├── reactions/{emoji}                        # { count } emoji votes
  ├── notes/{noteId}                           # Guest dedications
  ├── songs/{songId}                           # Music poll votes
  ├── rides/{rideId}                           # Ride-share offers
  ├── gifts/{giftId}                           # Gift-list reservations
  └── rsvps/{responseId}                       # RSVP responses (per invitation)
setupTokens/{sha256(token)}                    # Setup-token registry { inviteToken, createdAt }
rsvpResponses/{inviteToken}                    # { count } anti-spam counter (cap 500)
  └── responses/{responseId}                   # RSVP entries (main_<hash> / comp_<hash>_<i>)
auditLog/{docId}                               # Superadmin-only audit log
```

## Cloud Functions
```
functions/index.ts   cleanupExpiredData → cron mensual (1º de cada mes):
                     borra invitaciones con boda >12 meses atrás en cascada
                     (RSVPs, subcolecciones, setupTokens, doc, Storage)
```

## Key Design Decisions
- Images and audio encrypted with AES-256-GCM before storage (PBKDF2-SHA-256 600k, key derivada del invite token: defensa en profundidad at-rest, ver SECURITY.md threat model)
- Audio compressed to 22kHz mono WAV, chunked into 200KB fragments (≤40 writes/batch, bajo el límite de 10 MiB por request)
- Images compressed to ~300KB (target) / 450KB (alta calidad), dimensión máx 1600px (1920px alta calidad), límite cifrado 1MB
- Gallery: max 10 images, duplicate detection (name + size), lazy thumbnails, decrypt on-demand con LRU cache
- All invitation pages are token-based (no public indexation)
- 100 languages via i18next with dynamic import() code-splitting
- CSS: 40+ custom properties for theming, spacing, shadows, border-radius
- Bundle: vendor chunks (firebase, react, sentry, i18n, other) + code-split pages y analytics lazy
- Forms: auto-save at 1.5s debounce, encrypt sensitive fields (bankInfo, dietaryInfo)
- Security: CSP headers, HSTS, X-Frame-Options, no raw `any` types
- Guest contributions (reactions/notes/songs/rides/gifts): anti-abuso por device (sessionStorage), increment-only, caps en reglas

## Testing Strategy
```
src/
├── components/__tests__/     # 23 test files (all components covered)
├── components/setup-forms/__tests__/  # 8 test files (all forms covered)
├── contexts/__tests__/       # 14 test files (providers + hooks covered)
├── hooks/__tests__/          # 11 test files (all hooks covered)
├── lib/__tests__/            # 52 test files (core logic covered)
├── pages/__tests__/          # 7 test files (page integration)
├── pages/sections/__tests__/ # 9 test files (public sections covered)
├── pages/admin/__tests__/    # 7 test files (admin tabs covered)
├── pages/superadmin/__tests__/ # 6 test files (superadmin tabs covered)
└── __tests__/                # 2 test files (App shell)
```
- **140 test files, 1578 tests, 0 failures**
- Coverage thresholds: statements 85%, branches 81%, functions 86%, lines 87%
- Accessibility: axe-core WCAG 2.1 AA checks in CI
- Bundle size check: vendor-firebase <650KB, vendor-react <250KB, vendor-sentry <150KB gzip
