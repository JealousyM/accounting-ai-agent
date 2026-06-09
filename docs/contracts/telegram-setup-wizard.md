# Module Contract: Telegram Setup Wizard

## TelegramSetupWizard component

**File:** `packages/web/src/components/telegram/TelegramSetupWizard.tsx`

### Props
```ts
interface TelegramSetupWizardProps {
  translations: TelegramSetupTranslations;
}
```

### States
- `unlinked` — shows 3-step wizard starting at step 1
- `linking` — step 2 active, polls `getTelegramStatus` every 2 s
- `linked` — shows settings panel with username + unlink button

### Step flow
1. **FindBot** — shows bot username `@eKsiegowyAIBot`, deep-link CTA (`https://t.me/eKsiegowyAIBot`), "Next" button
2. **LinkAccount** — code input (6 digits), "Link" button, auto-advances on successful poll
3. **Done** — success banner, feature list, "Go to chat" link

### API dependencies
- `getTelegramStatus()` — GET `/api/telegram/status` — checked on mount and polled in step 2
- `linkTelegram(code)` — POST `/api/telegram/link`
- `unlinkTelegram()` — DELETE `/api/telegram/link`

---

## /settings/telegram page

**File:** `packages/web/src/app/settings/telegram/page.tsx`

Mounts `TelegramSetupWizard` inside `GuidePageLayout`.  
No server-side data fetching — all state managed by React Query in the component.

---

## /guide/telegram page

**File:** `packages/web/src/app/guide/telegram/page.tsx`

Static prose article following the wFirma guide pattern.  
Three sections mapped from `guide.topics.telegram.articles.setup.steps[]`.  
Links to `/settings/telegram` for the interactive wizard.
