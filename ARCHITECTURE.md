# Wedingo — Architecture Overview

## Tech Stack
- **Frontend:** React 19 + TypeScript 6 + Vite 8
- **Backend:** Firebase (Firestore, Auth, Hosting)
- **CSS:** Tailwind 4 + CSS custom properties
- **i18n:** i18next + react-i18next (100 languages)
- **Map:** Leaflet + OpenFreeMap
- **Testing:** Vitest + Testing Library

## Project Structure
```
src/
├── assets/         # Static images and fonts
├── components/     # Reusable React components
│   └── setup-forms/  # Setup wizard form sections
├── contexts/       # React context providers
├── content/        # External content (privacy policy)
├── hooks/          # Custom React hooks
├── i18n/locales/   # Translation files (100 languages)
├── lib/            # Utilities, services, store logic
├── pages/          # Route pages
│   ├── admin/      # Admin panel tabs
│   ├── sections/   # Public invitation sections
│   └── superadmin/ # Super admin panel tabs
├── styles/         # CSS stylesheets
└── types/          # TypeScript type definitions
```

## Data Flow
1. **ConfigContext** manages invitation data via Firestore
2. **AuthContext** handles setup token authentication
3. **RsvpContext** manages RSVP submissions
4. **UIProvider** manages UI state (modals, messages)

## Firestore Model
```
invitations/{token}
  ├── gallery/{imageId}    # Encrypted images
  └── audio/{chunkId}      # Encrypted audio chunks
rsvpResponses/{id}         # RSVP submissions
auditLog/{id}              # Super admin audit log
```

## Key Design Decisions
- Images and audio are encrypted with AES-256-GCM before storage
- Audio is chunked into 500KB fragments for Firestore compliance
- All invitation pages are token-based (no public indexation)
- 100 languages supported via i18next with English fallback
