# GitHub Secrets Configuration

The CI/CD pipeline requires these secrets in GitHub:

## Required for Build
| Secret | Description | Example |
|--------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | `1:123:web:abc` |
| `VITE_ADMIN_EMAILS` | Admin email(s) | `admin@example.com` |
| `VITE_SUPERADMIN_ROUTE` | Superadmin hidden path | `/_/s53k` |

## Required for Deploy
| Secret | Description | How to get |
|--------|-------------|------------|
| `FIREBASE_TOKEN` | Firebase CI token | Run `npx firebase-tools login:ci` locally |

## Optional
| Secret | Description |
|--------|-------------|
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |
| `VITE_FIREBASE_MEASUREMENT_ID` | Google Analytics measurement ID |

## Setup
1. Go to GitHub → Settings → Secrets and variables → Actions
2. Add each secret from the `.env` file values
3. For `FIREBASE_TOKEN`, run `npx firebase login:ci` and copy the token
