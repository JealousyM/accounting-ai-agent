# Authentication

## What this is
Handles user registration, login, password reset, Google OAuth, and per-session JWT issuance. Also manages per-user API credentials (wFirma keys, OpenAI key) stored encrypted in the database.

## Entry points
- `packages/api/src/services/auth.service.ts` — core auth logic (register, login, password reset, Google OAuth)
- `packages/api/src/middleware/auth.middleware.ts` — JWT verification middleware; attaches `req.user`
- `packages/api/src/routes/auth.routes.ts` — `/api/auth/*` endpoints
- `packages/api/src/services/credentials.service.ts` — encrypted storage of wFirma/OpenAI credentials
- `packages/api/src/services/crypto.service.ts` — AES-256 encryption for credentials at rest

## Key concepts
- **JWT** — short-lived access tokens; issued on login and Google OAuth callback.
- **Google OAuth** — passport-style redirect flow; user profile merged or created on first login.
- **Complete-profile step** — new OAuth users land on `/auth/complete-profile` to set company name, triggering org auto-join.
- **Credentials encryption** — wFirma access/secret/app keys and OpenAI key are AES-256-encrypted before persistence; `CryptoService` handles encrypt/decrypt.
- **Per-user wFirma config** — each user may supply their own wFirma credentials; `CredentialsService` resolves effective config (user override → global env).

## Cross-references
- Talks to: `database` — `User` model for account storage
- Talks to: `organizations` — `findOrCreateByName` called on profile completion
- Used by: every other service through `req.user` injected by `auth.middleware.ts`
- Used by: `web-frontend` `AuthContext` which stores the JWT in localStorage

## Where to look first
`packages/api/src/middleware/auth.middleware.ts` to see how requests are authenticated, then `packages/api/src/services/credentials.service.ts` for how per-user API keys flow through the system.
