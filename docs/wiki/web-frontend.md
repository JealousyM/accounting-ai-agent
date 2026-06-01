# Web Frontend

## What this is
The Next.js 15 frontend package (`packages/web`) provides the user-facing SPA: AI chat, KSeF invoice management, subscriptions, admin panel, and onboarding guides. It communicates exclusively with the API backend over HTTP.

## Entry points
- `packages/web/src/app/layout.tsx` — root layout (Auth, Locale, TTS contexts)
- `packages/web/src/app/chat/page.tsx` — main AI chat page
- `packages/web/src/app/dashboard/page.tsx` — usage dashboard
- `packages/web/src/app/ksef/page.tsx` — KSeF invoice list
- `packages/web/src/app/pricing/page.tsx` — subscription plans
- `packages/web/src/app/admin/page.tsx` — admin dashboard
- `packages/web/src/lib/api/` — Axios client wrappers per domain

## Key concepts
- **App Router** — uses Next.js 15 App Router with server and client components.
- **AuthContext** — `contexts/AuthContext.tsx` holds JWT, user object, and guards protected routes via `ProtectedRoute`.
- **Zustand** — lightweight state for chat conversation list and message streaming.
- **React Query** — used for data fetching on dashboard, KSeF, and admin pages.
- **TTS / Voice** — `TTSContext` + `useTextToSpeech` hook; speech synthesis via Web Speech API or OpenAI TTS when the user has an API key.
- **i18n** — `next-intl` with locale files in `src/i18n/` (en, pl, ru); locale detected from user profile.
- **Storybook** — key UI components have `.stories.tsx` files for isolated development.

## Cross-references
- Talks to: `api-backend` via Axios (all data fetching and mutations)
- Talks to: `auth` — consumes JWT tokens returned by `/api/auth/*` endpoints
- Talks to: `subscriptions` — renders pricing page and calls `/api/subscription/*`

## Where to look first
`packages/web/src/app/chat/page.tsx` and `packages/web/src/components/chat/ChatContainer.tsx` for the primary user flow; `packages/web/src/lib/api/` to understand how any backend endpoint is called.
