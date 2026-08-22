# ARCHITECTURE — Wedingo

App de invitaciones de boda (React 19 + TypeScript + Vite + Firebase: Firestore/Auth/Hosting). i18n es/en (i18next, carga diferida por locale).

## Capas

```
src/
├── i18n/               # instancia i18next + locales JSON (carga lazy)
├── lib/                # núcleo sin React
│   ├── firebase.ts     # init + refs tipadas (invitationDocRef, rsvpResponseRef…)
│   ├── safe-error.ts   # safeLogError/toSafeErrorMessage (redacta token SIEMPRE)
│   ├── redact.ts       # redactSecretsFromUrl — módulo hoja, rompe ciclo storage↔sentry
│   ├── sentry.ts       # Sentry gated por consentimiento; re-exporta redact
│   ├── crypto-utils.ts # AES-GCM (PBKDF2), clave derivada del token público (decisión C1)
│   ├── image-store / music-store / voice-store   # subcolecciones cifradas
│   ├── storage.ts      # localStorage seguro + registro de consentimiento GDPR
│   ├── invite-config-codec.ts  # encode/decode config en hash; INTERNAL_FIELDS excluidos
│   └── constants.ts    # APP_VERSION y constantes
├── contexts/           # Config, Auth, SuperAdmin, Confirm, Animations
├── hooks/              # useRsvp (+ rsvp-payloads builders puros testados),
│                       # useSetupAuth (sesión admin/setup con renovación 60s)
├── pages/
│   ├── PublicInvitation.tsx      # ruta /:token (overlays condicionales)
│   ├── sections/                 # secciones de la invitación y del setup
│   ├── admin/                    # pestañas admin (asistencia, datos, herramientas)
│   ├── superadmin/               # consola /_/console (stats, auditoría, soporte)
│   └── PrintPage.tsx             # vista imprimible/PDF
└── styles/             # CSS (print.css separado)
```

## Flujo de datos clave

1. **Config**: `invitations/{token}` → decodificada/hidratada en `ConfigContext`; guardado incremental solo de campos cambiados.
2. **RSVP**: `useRsvp` valida → `buildMainGuestData/buildCompanionData` (puros) → batch atómico + contador `increment(1)`; tope anti-spam aplicado por reglas.
3. **Sesión admin**: token verificado contra `setupTokenHash` (nunca el token plano); sesión en sessionStorage + Firestore con expiración.

## Seguridad (invariantes)

- El token de URL es la credencial de acceso: **jamás** en logs/analytics/Sentry → todo log pasa por `safeLogError`; URLs redactadas por `redactSecretsFromUrl`.
- Cifrado en reposo con clave derivada del token (ofuscación intencional, no confidencialidad frente a portador).
- Reglas Firestore: campos internos (`adminUsername`, hashes) no legibles por clientes; `ownerKey` permite autoservicio de borrado; `voiceConsent` obligatorio para notas de voz; `consentLog.lang` registra idioma de la política.
- Consentimientos GDPR: analytics/Sentry solo con consentimiento explícito; retirada detiene replay.

## Comandos

```bash
npx vitest run          # suite completa (2251 tests)
npm run lint:ci         # oxlint --deny-warnings
npm run typecheck && npm run build
npx firebase-tools deploy --only hosting[,firestore:rules]
```
