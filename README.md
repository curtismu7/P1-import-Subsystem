# PingOne Import Tool

A modern web application to manage PingOne users at scale. It provides import, export, modify, and population operations with real-time progress, robust logging, and a secure authentication subsystem.

## What It Does
- **User Import**: Upload CSVs to create users with validation and error handling
- **User Export**: Export users from a selected PingOne population to CSV
- **User Modify**: Update user attributes in bulk from CSV
- **Population Management**: List/select default population for operations
- **Token Management**: Obtain/refresh API tokens with clear UI status
- **Real-Time Progress**: Live operation progress and status updates
- **Comprehensive Logging**: Structured, persistent logs for debugging and audits
- **API Documentation**: Built-in Swagger UI for API testing

## How It Works (High Level)
- **Frontend (Vanilla JS + Import Maps)**: UI, pages, and components under `public/`
- **Backend (Express)**: Routes in `routes/` for import/export/modify/settings/token/status/version
- **Auth Subsystem**: Isolated client/server components for secure credential handling in `auth-subsystem/`
- **Services/Utilities**: Reusable modules in `server/` and `src/`
- **Logs**: Rotating logs under `logs/`
- **Data**: Exports and config under `data/`

## Token & Version Indicators
- **Token Status** shows three states:
  - Valid: green indicator; shows time-left
  - Refreshing: animated indicator; spinner icon
  - Invalid: red indicator
- **Version Display**:
  - Fetched from `/api/version`
  - Shown in header `#version-info` and footer `#footer-version` as `vX.Y.Z`

## Key Endpoints
- GET `/api/version` → app version and build info
- GET `/api/token/status` → token presence/validity/time-left
- POST `/api/token/refresh` → refresh token
- GET `/api/settings` and POST `/api/settings` → app settings
- Export/Import/Modify routes under `/api/export`, `/api/import`, `/api/modify`

## Project Structure (Short)
- `public/` — UI, pages, styles, client JS
- `routes/` — Express route handlers
- `server/` — server services, middleware, utils
- `auth-subsystem/` — secure auth client/server
- `data/` — exports and settings
- `logs/` — application logs
- `tests/` — unit, integration, e2e, UI tests
- `docs/` — documentation

## Getting Started
1) Install dependencies
   - `npm install`
2) Configure environment
   - `cp .env.example .env`
   - Set PingOne credentials (client id/secret, environment id, region)
3) Run in development
   - `npm run dev`
4) Open the app UI and enter credentials to obtain a token

## Running
- Start: `npm start`
- Development (auto-reload): `npm run dev`
- Build client bundle: `npm run build:bundle`

## Testing
- All tests: `npm test`
- Unit/Integration/API/Frontend: `npm run test:unit` | `npm run test:integration` | `npm run test:api` | `npm run test:frontend`
- Coverage: `npm run test:coverage`

## Security
- Credentials handled by an isolated auth subsystem
- Sensitive values are never logged
- CSRF protection enabled for client API calls

## Workflows
- __/restart__: Rebuild bundle and restart server (see `.windsurf/workflows/restart.md`).
- __/testit__: Rebuild bundle and restart server with import maps (see `.windsurf/workflows/testit.md`).
- __/commit-to-github__: Commit changes with version update (see `.windsurf/workflows/commit-to-github.md`).
- __/import-maps-migration__: Manage Import Maps migration (see `.windsurf/workflows/import-maps-migration.md`).

These workflows streamline routine tasks directly from the IDE.

## Deployment
- __Platform__: Render (configured via `render.yaml`).
- __Server start__: `npm start`
- __Environment variables__: See `.env.example` for required `PINGONE_*` settings and standard `PORT`, `NODE_ENV`.
- __Build step__: Client bundle built via `npm run build:bundle` if needed; app serves `public/` and API routes under `routes/`.

Deployment checklist (high level):
- __Set secrets__: `PINGONE_CLIENT_ID`, `PINGONE_CLIENT_SECRET`, `PINGONE_ENVIRONMENT_ID`, `PINGONE_REGION`.
- __Verify version endpoint__: `/api/version` returns expected version/build fields.
- __Logs__: Ensure persistent volume or external logging if required; app writes to `logs/`.

For detailed steps, see:
- `docs/deployment/DEPLOYMENT.md`
- `docs/deployment/DEPLOYMENT_CHECKLIST.md`

## Logs
- `logs/access.log`, `logs/error.log`, `logs/application.log`, `logs/combined.log`, `logs/performance.log`

## License
ISC