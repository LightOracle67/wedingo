# Security Policy

## Supported Versions

Security updates are applied to the latest production version only.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Wedingo, please report it responsibly.

**Do NOT open a public issue.** Instead, send an email to:

📧 **adriancl2001@gmail.com**

Include as much detail as possible:
- Steps to reproduce the vulnerability
- Affected component or route
- Impact assessment
- Any suggested fixes

We aim to:
- Acknowledge receipt within **48 hours**
- Provide an initial assessment within **5 business days**
- Release a fix within **30 days**, depending on severity

We follow responsible disclosure. Once a fix is deployed, we will publicly acknowledge your contribution (with your consent).

## Security Measures

### Data Encryption
- **AES-256-GCM**: Images, couple photos, and bank data are encrypted client-side before storage
- **PBKDF2**: Encryption keys are derived from per-invitation tokens with a unique salt
- **HTTPS/TLS 1.3**: All communications are encrypted in transit
- **Firestore at rest**: Google Cloud encrypts stored data at rest by default

### Authentication & Access Control
- **Token-based authentication**: Unique per-invitation setup tokens
- **Session management**: Sessions stored in Firestore with timestamp validation
- **Superadmin panel**: Protected by Firebase Authentication + hidden route
- **Firestore security rules**: Granular read/write/delete rules per collection
  - Guests can only submit RSVPs for their invitation
  - Admins can only manage their own invitation
  - Only superadmin can access cross-invitation data

### Input Validation
- All user inputs are sanitized against XSS (restricted characters: `<>&"'\\`)
- String length limits enforced both client-side and server-side (Firestore rules)
- File uploads validated: type (JPEG/PNG/WebP) and size (20 MB max)

### Privacy
- **Client-side image encryption**: Original images never leave the user's device unencrypted
- **Health data consent**: Explicit GDPR Art. 9 consent required before storing dietary/allergy data
- **Data minimization**: Only collects data necessary for invitation management
- **Retention policy**: 12 months post-event for guest data; active-while-in-use for creators
- **Right to erasure**: Self-service deletion via support panel + email-based requests

### Compliance
- **GDPR** (EU/EEA): Full compliance with Art. 5-9, 12-23, 25, 28, 30, 32-34, 44-49
- **UK GDPR**: UK-specific provisions + ICO contact information
- **CCPA/CPRA** (California): Right to know, delete, opt-out (no data sold)
- **LGPD** (Brazil): Art. 7 legal bases, Art. 18 rights, encarregado contact
- **PIPEDA** (Canada): 10 fair information principles documented
- **POPIA** (South Africa): Section 72 cross-border transfer conditions

## Security Headers

All responses include:
- `Content-Security-Policy` with strict source restrictions
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Breach Response

In the event of a data breach:
1. Affected users will be notified via email within **72 hours** (GDPR Art. 33-34)
2. The relevant supervisory authority will be notified
3. A post-incident review will be conducted and published

## Third-Party Services

Wedingo uses Firebase / Google Cloud Platform (GCP) for:
- Hosting (eur3 region, Frankfurt)
- Database (Firestore)
- Authentication

Google LLC acts as a data processor under a Data Processing Agreement (DPA) per GDPR Art. 28. International transfers are covered by:
- Standard Contractual Clauses (SCC) — EU Decision 2021/914
- EU-US Data Privacy Framework (DPF) certification
