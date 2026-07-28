# Browser Compatibility

## ✅ Supported

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 120+ | ✅ Full | Primary development target |
| Firefox 120+ | ✅ Full | Standard web API support |
| Safari 17+ | ✅ Full | See notes below |
| Edge 120+ | ✅ Full | Chromium-based |

## Safari-Specific Notes

1. **Firestore CORS** — Fixed via `experimentalForceLongPolling: true` in Firestore config. Safari has issues with Firestore's default WebChannel transport.

2. **Sentry console noise** — Safari console shows `Blocked a frame with origin...` errors from Sentry's Replay integration trying to access cross-origin Firebase Auth frames. This is cosmetic only — no functionality impact.

3. **Audio playback** — Native `<audio>` controls were replaced with custom play/pause buttons to work around Safari's AirPlay restrictions.

## Firefox-Specific Notes

- No known issues. Full support expected.

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests (requires .env with Firebase credentials)
npm run e2e
```
