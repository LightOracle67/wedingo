# Operaciones y Monitorización

Guía de operaciones para el entorno de producción de Wedingo.

## Entornos

| Entorno | URL | Propósito |
|---|---|---|
| Producción | https://wedingo-6c26a.web.app | Tráfico real |
| Preview (PR) | `https://pr-{N}-wedingo-6c26a.web.app` | Staging por PR, expira en 7 días |

## Pipeline CI/CD

```
PR → build-and-test (lint, typecheck, 1564 tests, coverage, audit, bundle) → preview deploy + comentario URL
push a main → build-and-test → e2e (Playwright) → deploy producción → Sentry sourcemaps
```

### Estados del pipeline
- **Green**: deploy automático a producción.
- **Red**: los logs del job indican qué falló. El deploy NO se ejecuta.
- **Preview**: cada PR tiene su propia URL de staging con el build exacto.

## Versionado

Releases semánticas `MAJOR.MINOR.PATCH`.

### Crear una versión
```bash
npm run bump minor     # o: patch / major / 2.40.0
# Editar el entry "TODO" del changelog con los cambios reales
git push && git push origin vX.Y.Z
npx gh release create vX.Y.Z --notes-file /tmp/wedingo-release-X.Y.Z.md --title "vX.Y.Z"
```

`npm run bump` actualiza: `package.json`, `constants.ts` (APP_VERSION), `changelog.ts`, crea commit + tag.

## Monitorización

### Sentry (errores y rendimiento)
- **Org**: `solo-developer-p9`
- **Proyecto**: `wedingo-6c26a`
- **DSN**: definido en `VITE_SENTRY_DSN` (hay fallback hardcodeado en `src/lib/sentry.ts`)
- **Entorno**: `production` / `development`
- **Traces**: 10% en producción, 0% en desarrollo
- **Replays**: 10% sesiones, 100% en error
- **Releases**: el CI sube sourcemaps con `wedingo@X.Y.Z` — los stack traces apuntan al código fuente real
- **Alertas recomendadas**:
  1. `wedingo@*` error count > 5/hora → notificar
  2. `wedingo@*` p95 TTFB > 2s → notificar
  3. Cualquier error en `setup` o `admin` (flujos críticos)

### Firebase Analytics
- Evento de página vista automático por ruta.
- Revisar conversión de RSVP (evento `rsvp_submitted` si se añade).

### Web Vitals
- `web-vitals` reportado a Analytics (`/vitals` endpoint).
- Objetivos: LCP < 2.5s, CLS < 0.1, INP < 200ms.

## Respuesta a incidentes

1. **Fallo en CI** → revisar logs del job, corregir en PR, mergear.
2. **Error en producción (Sentry)** → crear issue de GitHub con el stack trace, asignar prioridad.
3. **Degradación de rendimiento** → revisar Web Vitals en Analytics, Lighthouse CI.
4. **Rollback**: el hosting de Firebase mantiene versiones previas. Redeploy de un commit anterior:
   ```bash
   git checkout vX.Y.Z
   npm ci && npm run build
   firebase deploy --only hosting
   ```

## Load testing

```bash
k6 run scripts/load-test.js                     # local
BASE_URL=https://wedingo-6c26a.web.app k6 run scripts/load-test.js
```

Escenario actual: 20→50 usuarios en 2 minutos, umbrales p95 < 2s y < 5% errores.

## Secrets de GitHub

| Secret | Uso |
|---|---|
| `VITE_FIREBASE_*` (6) | Config Firebase para el build |
| `VITE_ADMIN_EMAILS` | Emails de superadmin |
| `VITE_SUPERADMIN_ROUTE` | Ruta del login superadmin |
| `FIREBASE_TOKEN` | Deploy a Firebase Hosting |
| `SENTRY_AUTH_TOKEN` | Upload de sourcemaps a Sentry (opcional) |
| `SENTRY_ORG` | Slug de org Sentry: `solo-developer-p9` |
| `SENTRY_PROJECT` | Slug de proyecto Sentry: `wedingo-6c26a` |

## Comandos útiles

```bash
npm run bump minor            # versionado automático
npm run loadtest              # load test local
npm run analyze               # bundle visualizer
npm run audit:prod            # vulnerabilidades de dependencias
npm run deploy                # build + deploy hosting + rules
```
