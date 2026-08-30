# Security Policy

## Reporting a Vulnerability

Contact the project maintainer at the email address listed in the commit history.
Do not open public issues for security vulnerabilities.

## Security Measures

- Invitation data is encrypted in transit and at rest (Firestore) using AES-256-GCM for sensitive fields (e.g. bank info, RSVP dietary info, images, audio)
- The setup token is never stored in the public invitation document: only its SHA-256 hash is registered in the private `setupTokens` collection, and session activation requires proof of token knowledge
- Firebase Security Rules enforce collection-level access: the `invitations` collection is not enumerable (get-only) and writes require an active admin session
- CSP headers prevent XSS and data injection
- All communications are over HTTPS
- Sessions are kept in `sessionStorage` and expire after 60 minutes (auto-renewed every 60s while the admin tab is open)

## Threat Model

### Encryption key derivation

All at-rest encryption (bank info, RSVP dietary info, images, audio, config images) uses
**AES-256-GCM with a key derived from the invite token** (PBKDF2-SHA-256, 600,000 iterations).
The invite token is embedded in the public invitation URL.

**What this protects and what it does not:**

- ✅ **Protects at rest**: anyone who accesses Firestore data directly (DB leak, compromised
  backend, admin console browsing) cannot read the plaintext without knowing the invite token.
- ✅ **Protects against casual scraping**: a crawler that enumerates Firestore documents gets
  only ciphertext.
- ❌ **Does NOT protect against a bearer of the invitation link**: anyone with the full invite
  URL can derive the key locally and decrypt every field for that invitation (bank info, dietary
  info, images).

**This is intentional and documented.** The invitation link is shared with guests, so the model
is *defense-in-depth against data exposure at rest*, not *confidentiality against the invitees*.
If a future requirement needs to hide sensitive fields even from guests who hold the link, a
separate server-held secret or a per-invite secret stored outside the public document would be
required.

### Access control summary

| Asset | Protection |
|---|---|
| Invitation admin (setup/panel) | Proof-of-knowledge setup token (SHA-256 hash), session TTL 60 min, Firestore rules gate writes |
| Superadmin | Firebase Auth email/password, email whitelisted in rules |
| Guest contributions (RSVP, notes, reactions, songs, rides, gifts) | Public create with strict field whitelists + `isSafeText` (XSS), admin-only delete |
| Sensitive fields at rest | AES-256-GCM keyed on invite token (see above) |
| Telemetry (analytics, Sentry) | Consent-gated; never loaded before explicit consent |

### Nota de auditoría de dependencias (2026-08-30, rondas de optimización v2.185–v2.188)

`npm audit` reporta 4 vulnerabilidades, TODAS en dependencias de DESARROLLO
(no empaquetadas en el bundle de producción):

- **xlsx (high)** — Prototype pollution (GHSA-4r6h-8v6p-xvw6) y ReDoS
  (GHSA-5pgg-2g8v-p4x9). Sin fix en el registry de npm. Solo se usa en
  `src/lib/__tests__/excel-export.test.ts` para REABRIR los .xlsx generados
  por el escritor propio (`excel-utils`, ~2 KB gz) y validar celdas; el input
  es siempre un documento generado por la propia app (trusted), nunca
  contenido externo. No viaja al cliente.
- **uuid (moderate, ×3)** — vía `gaxios` → `firebase-tools` (CLI de deploy).
  El fix "automático" sugiere bajar a firebase-tools@13.13.3 (breaking);
  se mantiene la versión actual y se monitoriza.

Verificación de que xlsx no entra al bundle: no aparece en `dist/assets`
(búsqueda por contenido); el export de cliente usa el escritor OOXML propio.
