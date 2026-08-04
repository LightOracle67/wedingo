# Security Policy

## Reporting a Vulnerability

Contact the project maintainer at the email address listed in the commit history.
Do not open public issues for security vulnerabilities.

## Security Measures

- Invitation data is encrypted in transit and at rest (Firestore) using AES-256-GCM for sensitive fields (e.g. bank info)
- The setup token is never stored in the public invitation document: only its SHA-256 hash is registered in the private `setupTokens` collection, and session activation requires proof of token knowledge
- Firebase Security Rules enforce collection-level access: the `invitations` collection is not enumerable (get-only) and writes require an active admin session
- CSP headers prevent XSS and data injection
- All communications are over HTTPS
- Sessions are kept in `sessionStorage` and expire after 60 minutes (auto-renewed every 60s while the admin tab is open)
