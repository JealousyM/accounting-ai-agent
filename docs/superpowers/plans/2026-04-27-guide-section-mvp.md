# `/guide` Section MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public (unauthenticated) `/guide` section with the first article: *How to get KSeF tokens* — three locales (en/pl/ru), screenshot placeholders, OG image.

**Architecture:** Static Next.js App-Router pages under `app/guide/` (no dynamic routes). Content lives in `i18n/locales/*.json` under a new `guide` namespace. Reusable presentation components in `components/guide/`. Mirrors the existing `app/privacy-policy/` + `LegalPageLayout` pattern.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind, `LocaleContext` (en/pl/ru), Jest + Testing Library for unit tests, Playwright for E2E.

**Tracks GitHub issue:** [#99](https://github.com/micode-ai/accounting-ai-agent/issues/99)

---

## File Structure

### New files
| Path | Responsibility |
|---|---|
| `packages/web/src/components/guide/GuidePageLayout.tsx` | Shared layout: header (back-link + locale switcher), breadcrumbs, max-w container, footer. |
| `packages/web/src/components/guide/Breadcrumbs.tsx` | Breadcrumb trail (`Guide / KSeF / Get tokens`). |
| `packages/web/src/components/guide/GuideStep.tsx` | Numbered step with title + body. |
| `packages/web/src/components/guide/GuideScreenshot.tsx` | `<figure>` with caption; renders styled placeholder when image file is missing. |
| `packages/web/src/components/guide/GuideCallout.tsx` | Info/warning/tip block with icon. |
| `packages/web/src/components/guide/GuideExternalLink.tsx` | External link with icon, `target="_blank" rel="noopener noreferrer"`. |
| `packages/web/src/components/guide/index.ts` | Barrel export. |
| `packages/web/src/components/guide/__tests__/GuideScreenshot.test.tsx` | Tests fallback-to-placeholder behavior. |
| `packages/web/src/components/guide/__tests__/GuideCallout.test.tsx` | Tests variant rendering. |
| `packages/web/src/components/guide/__tests__/Breadcrumbs.test.tsx` | Tests trail rendering and last-item-not-link. |
| `packages/web/src/app/guide/page.tsx` | Landing: list of topics. |
| `packages/web/src/app/guide/ksef/page.tsx` | Topic page: list of KSeF articles. |
| `packages/web/src/app/guide/ksef/get-tokens/page.tsx` | The article itself. |
| `packages/web/src/app/guide/ksef/get-tokens/opengraph-image.tsx` | OG image generator. |
| `packages/web/tests/e2e/guide/guide-public.spec.ts` | E2E: pages reachable without auth, locale switch works. |

### Modified files
| Path | Change |
|---|---|
| `packages/web/src/i18n/locales/en.json` | Add `guide` namespace. |
| `packages/web/src/i18n/locales/pl.json` | Add `guide` namespace. |
| `packages/web/src/i18n/locales/ru.json` | Add `guide` namespace. |
| `packages/web/src/components/landing/LandingFooter.tsx` | Add link to `/guide`. |
| `packages/web/src/components/legal/LegalFooter.tsx` | Add link to `/guide`. |

### Static assets (placeholders only — real PNGs added later via #99 checklist)
- `packages/web/public/guide/ksef/get-tokens/.gitkeep`

---

## Conventions

- **TDD** for components with non-trivial logic (`GuideScreenshot` placeholder fallback, `GuideCallout` variants, `Breadcrumbs` trail). Pages themselves are tested via Playwright E2E.
- One commit per task. Use Conventional Commits prefixes (`feat`, `test`, `chore`).
- Run `npm run lint --filter=@accounting-ai-agent/web` and `npm run build --filter=@accounting-ai-agent/web` after the last component task and again at the end.
- All user-visible text comes from `i18n/locales/*.json`; never hardcode strings in pages or components.

---

## Task 1: Add `guide` i18n namespace (skeleton in all 3 locales)

**Files:**
- Modify: `packages/web/src/i18n/locales/en.json`
- Modify: `packages/web/src/i18n/locales/pl.json`
- Modify: `packages/web/src/i18n/locales/ru.json`

The full content goes in now (article body, callouts, links). This unblocks every later task that reads from `t.guide.*`.

- [ ] **Step 1: Add `guide` block to `en.json`**

Insert as a new top-level key (alongside `auth`, `legal`, etc.):

```jsonc
"guide": {
  "title": "Guide",
  "description": "Step-by-step guides to set up and use eKsięgowy AI.",
  "breadcrumbHome": "Guide",
  "topics": {
    "ksef": {
      "title": "KSeF",
      "description": "Working with Poland's National e-Invoicing System.",
      "articles": {
        "getTokens": {
          "title": "How to get KSeF tokens",
          "summary": "Generate an authentication token in the KSeF portal and connect it to eKsięgowy AI.",
          "intro": "To send and receive invoices through KSeF, eKsięgowy AI needs an authentication token issued by the KSeF portal. This guide walks you through generating one and pasting it into the app. You will need a Qualified Electronic Signature (KEP) or a Trusted Profile (Profil Zaufany).",
          "steps": [
            {
              "title": "Open the KSeF portal",
              "body": "Open the KSeF portal in a new tab. Use the test environment first to verify your setup; switch to production once you are confident.",
              "screenshot": {
                "src": "/guide/ksef/get-tokens/01-login.png",
                "alt": "KSeF portal login page",
                "caption": "KSeF portal login page — click 'Zaloguj' in the top-right corner.",
                "placeholderHint": "Screenshot of ksef.mf.gov.pl landing page with the 'Zaloguj' button highlighted in the top-right."
              }
            },
            {
              "title": "Authenticate",
              "body": "Sign in with your Qualified Electronic Signature (KEP) or Trusted Profile (Profil Zaufany). Anonymous access cannot generate tokens.",
              "screenshot": {
                "src": "/guide/ksef/get-tokens/02-auth.png",
                "alt": "Authentication method selection",
                "caption": "Choose your authentication method: KEP (signature) or Profil Zaufany.",
                "placeholderHint": "Screenshot of the auth-method picker showing two large buttons: 'Podpis kwalifikowany' and 'Profil Zaufany'."
              }
            },
            {
              "title": "Open the Tokens section",
              "body": "After signing in, go to Uprawnienia → Tokeny in the side menu.",
              "screenshot": {
                "src": "/guide/ksef/get-tokens/03-uprawnienia.png",
                "alt": "Navigation: Uprawnienia → Tokeny",
                "caption": "Side-menu navigation to the Tokens screen.",
                "placeholderHint": "Screenshot of the left-hand side menu, with 'Uprawnienia' expanded and 'Tokeny' highlighted."
              }
            },
            {
              "title": "Generate a token",
              "body": "Click 'Generuj token'. Give it a recognizable name (for example, 'eKsiegowyAI') so you can later identify it.",
              "screenshot": {
                "src": "/guide/ksef/get-tokens/04-create-token.png",
                "alt": "Generate-token form",
                "caption": "Form for generating a new KSeF token.",
                "placeholderHint": "Screenshot of the new-token form with a name input and 'Generuj' button."
              }
            },
            {
              "title": "Assign permissions",
              "body": "Grant the minimum permissions eKsięgowy AI needs: 'Wystawianie faktur' (issue invoices) and 'Odczyt faktur' (read invoices). Do not grant administrative rights.",
              "screenshot": {
                "src": "/guide/ksef/get-tokens/05-scope.png",
                "alt": "Permission selection",
                "caption": "Tick only the two permissions required by the integration.",
                "placeholderHint": "Screenshot of permission checkboxes with 'Wystawianie faktur' and 'Odczyt faktur' checked."
              }
            },
            {
              "title": "Save the token",
              "body": "The token will be displayed once. Copy it immediately to a secure place — there is no way to view it again later.",
              "screenshot": {
                "src": "/guide/ksef/get-tokens/06-save-token.png",
                "alt": "Generated token display",
                "caption": "The token is shown only once. Copy it now.",
                "placeholderHint": "Screenshot of the success screen with the token string visible and a 'Copy' button."
              }
            },
            {
              "title": "Paste the token into eKsięgowy AI",
              "body": "Open the KSeF settings in our app and paste the token into the 'Token' field. Save — the connection is now active.",
              "screenshot": {
                "src": "/guide/ksef/get-tokens/07-paste-in-app.png",
                "alt": "KSeF settings in eKsięgowy AI",
                "caption": "Paste the token into the 'Token' field and click Save.",
                "placeholderHint": "Screenshot of our /ksef/settings page with the Token input filled and the Save button highlighted."
              }
            }
          ],
          "callouts": {
            "tokenOnce": {
              "variant": "warning",
              "title": "The token is shown only once",
              "body": "If you lose it, you must generate a new one. Store it in a password manager or your team's secret vault."
            },
            "testFirst": {
              "variant": "tip",
              "title": "Use the test environment first",
              "body": "Generate a token in the KSeF test environment, verify it works in eKsięgowy AI, then repeat the process for production."
            }
          },
          "links": {
            "title": "Useful links",
            "officialPortal": { "label": "Official KSeF portal (production)", "href": "https://ksef.mf.gov.pl" },
            "testPortal": { "label": "KSeF test environment", "href": "https://ksef-test.mf.gov.pl" },
            "officialDocs": { "label": "Official KSeF documentation (Ministry of Finance)", "href": "https://www.podatki.gov.pl/ksef/" },
            "appSettings": { "label": "Open KSeF settings in eKsięgowy AI", "href": "/ksef/settings" }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Translate the same block into `pl.json`**

Same shape, Polish text. Keep `screenshot.src`, `screenshot.alt` filename references, and external `href` URLs identical across locales.

- [ ] **Step 3: Translate the same block into `ru.json`**

Same shape, Russian text. Same constraint on identical structural fields.

- [ ] **Step 4: Verify JSON parses**

Run: `node -e "['en','pl','ru'].forEach(l => JSON.parse(require('fs').readFileSync('packages/web/src/i18n/locales/'+l+'.json')))"`
Expected: no output (silent success).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/i18n/locales/en.json packages/web/src/i18n/locales/pl.json packages/web/src/i18n/locales/ru.json
git commit -m "feat(guide): add i18n namespace for /guide section and KSeF tokens article"
```

---

## Task 2: `Breadcrumbs` component (TDD)

**Files:**
- Create: `packages/web/src/components/guide/Breadcrumbs.tsx`
- Create: `packages/web/src/components/guide/__tests__/Breadcrumbs.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/Breadcrumbs.test.tsx
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from '../Breadcrumbs';

describe('Breadcrumbs', () => {
  it('renders all items with separators', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide' },
          { label: 'KSeF', href: '/guide/ksef' },
          { label: 'Get tokens' },
        ]}
      />,
    );
    expect(screen.getByText('Guide').closest('a')).toHaveAttribute('href', '/guide');
    expect(screen.getByText('KSeF').closest('a')).toHaveAttribute('href', '/guide/ksef');
    // Last item is plain text, not a link
    expect(screen.getByText('Get tokens').tagName).toBe('SPAN');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `cd packages/web && npx jest src/components/guide/__tests__/Breadcrumbs.test.tsx`
Expected: FAIL — `Cannot find module '../Breadcrumbs'`.

- [ ] **Step 3: Implement `Breadcrumbs.tsx`**

```tsx
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: Props) {
  return (
    <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center">
            {idx > 0 && <ChevronRight className="w-4 h-4 mx-1.5" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-gray-900 dark:hover:text-white transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-gray-900 dark:text-white font-medium' : ''}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `cd packages/web && npx jest src/components/guide/__tests__/Breadcrumbs.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/guide/Breadcrumbs.tsx packages/web/src/components/guide/__tests__/Breadcrumbs.test.tsx
git commit -m "feat(guide): add Breadcrumbs component"
```

---

## Task 3: `GuideCallout` component (TDD)

**Files:**
- Create: `packages/web/src/components/guide/GuideCallout.tsx`
- Create: `packages/web/src/components/guide/__tests__/GuideCallout.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { GuideCallout } from '../GuideCallout';

describe('GuideCallout', () => {
  it.each(['info', 'warning', 'tip'] as const)('renders %s variant with title and body', (variant) => {
    render(<GuideCallout variant={variant} title="Heads up" body="Some text" />);
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Some text')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveAttribute('data-variant', variant);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `GuideCallout.tsx`**

```tsx
import { Info, AlertTriangle, Lightbulb } from 'lucide-react';

type Variant = 'info' | 'warning' | 'tip';

interface Props {
  variant: Variant;
  title: string;
  body: string;
}

const STYLES: Record<Variant, { wrap: string; icon: string; Icon: typeof Info }> = {
  info: {
    wrap: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    Icon: Info,
  },
  warning: {
    wrap: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    Icon: AlertTriangle,
  },
  tip: {
    wrap: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
    Icon: Lightbulb,
  },
};

export function GuideCallout({ variant, title, body }: Props) {
  const s = STYLES[variant];
  const Icon = s.Icon;
  return (
    <div role="note" data-variant={variant} className={`flex gap-3 border-l-4 rounded-r-lg p-4 my-4 ${s.wrap}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.icon}`} aria-hidden="true" />
      <div>
        <div className="font-semibold text-gray-900 dark:text-white mb-1">{title}</div>
        <div className="text-gray-700 dark:text-gray-300 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/guide/GuideCallout.tsx packages/web/src/components/guide/__tests__/GuideCallout.test.tsx
git commit -m "feat(guide): add GuideCallout component"
```

---

## Task 4: `GuideScreenshot` component (TDD — placeholder fallback)

**Files:**
- Create: `packages/web/src/components/guide/GuideScreenshot.tsx`
- Create: `packages/web/src/components/guide/__tests__/GuideScreenshot.test.tsx`

The component renders a real `<img>` if the screenshot file exists. Until then (file missing), it renders a styled placeholder built from `placeholderHint`. Detection happens client-side via `onError` — if the image fails to load, swap to placeholder.

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { GuideScreenshot } from '../GuideScreenshot';

describe('GuideScreenshot', () => {
  it('renders <img> initially with caption', () => {
    render(
      <GuideScreenshot
        src="/guide/ksef/get-tokens/01-login.png"
        alt="login"
        caption="The login page"
        placeholderHint="Screenshot of login page"
      />,
    );
    expect(screen.getByAltText('login')).toBeInTheDocument();
    expect(screen.getByText('The login page')).toBeInTheDocument();
  });

  it('falls back to placeholder when image fails to load', () => {
    render(
      <GuideScreenshot
        src="/missing.png"
        alt="login"
        caption="The login page"
        placeholderHint="Screenshot of login page"
      />,
    );
    fireEvent.error(screen.getByAltText('login'));
    expect(screen.getByText('Screenshot of login page')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `GuideScreenshot.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface Props {
  src: string;
  alt: string;
  caption: string;
  placeholderHint: string;
}

export function GuideScreenshot({ src, alt, caption, placeholderHint }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="my-6">
      {failed ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-8 flex flex-col items-center justify-center gap-3 min-h-[200px]">
          <ImageIcon className="w-10 h-10 text-gray-400" aria-hidden="true" />
          <div className="text-sm text-gray-600 dark:text-gray-400 italic text-center max-w-md">
            {placeholderHint}
          </div>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 w-full"
        />
      )}
      <figcaption className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
        {caption}
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/guide/GuideScreenshot.tsx packages/web/src/components/guide/__tests__/GuideScreenshot.test.tsx
git commit -m "feat(guide): add GuideScreenshot with placeholder fallback"
```

---

## Task 5: `GuideStep` and `GuideExternalLink` (no separate tests — trivial)

**Files:**
- Create: `packages/web/src/components/guide/GuideStep.tsx`
- Create: `packages/web/src/components/guide/GuideExternalLink.tsx`
- Create: `packages/web/src/components/guide/index.ts`

- [ ] **Step 1: Write `GuideStep.tsx`**

```tsx
import React from 'react';

interface Props {
  number: number;
  title: string;
  children: React.ReactNode;
}

export function GuideStep({ number, title, children }: Props) {
  return (
    <section className="border-l-2 border-blue-200 dark:border-blue-800 pl-6 pb-2">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-sm">
          {number}
        </span>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Write `GuideExternalLink.tsx`**

```tsx
import { ExternalLink } from 'lucide-react';

interface Props {
  href: string;
  label: string;
}

export function GuideExternalLink({ href, label }: Props) {
  const isExternal = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
    >
      {label}
      {isExternal && <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />}
    </a>
  );
}
```

- [ ] **Step 3: Write `index.ts` barrel**

```ts
export { Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbItem } from './Breadcrumbs';
export { GuideCallout } from './GuideCallout';
export { GuideExternalLink } from './GuideExternalLink';
export { GuidePageLayout } from './GuidePageLayout';
export { GuideScreenshot } from './GuideScreenshot';
export { GuideStep } from './GuideStep';
```

(`GuidePageLayout` doesn't exist yet — barrel import will fail. That's fine; we add it in Task 6, then commit the bundle.)

- [ ] **Step 4: Commit (deferred to Task 6 to keep `index.ts` consistent)**

No commit yet. Move on to Task 6.

---

## Task 6: `GuidePageLayout` component

**Files:**
- Create: `packages/web/src/components/guide/GuidePageLayout.tsx`

Modeled on `LegalPageLayout`, but accepts breadcrumb items and an optional summary line.

- [ ] **Step 1: Write `GuidePageLayout.tsx`**

```tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLocale, type Locale } from '@/contexts/LocaleContext';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

interface Props {
  title: string;
  summary?: string;
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
}

export function GuidePageLayout({ title, summary, breadcrumbs, children }: Props) {
  const { locale, setLocale } = useLocale();
  const locales: Locale[] = ['en', 'pl', 'ru'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">eKsięgowy AI</span>
          </div>
          <div className="flex items-center gap-1">
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-2 py-1 text-xs rounded uppercase font-medium transition-colors ${
                  locale === l
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <Breadcrumbs items={breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{title}</h1>
        {summary && <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">{summary}</p>}
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify barrel still resolves and tests pass**

Run: `cd packages/web && npx jest src/components/guide`
Expected: 3 test files pass (Breadcrumbs, GuideCallout, GuideScreenshot).

- [ ] **Step 3: Commit Tasks 5 + 6 together**

```bash
git add packages/web/src/components/guide/GuideStep.tsx packages/web/src/components/guide/GuideExternalLink.tsx packages/web/src/components/guide/GuidePageLayout.tsx packages/web/src/components/guide/index.ts
git commit -m "feat(guide): add GuideStep, GuideExternalLink, GuidePageLayout, barrel export"
```

---

## Task 7: `/guide` landing page (list of topics)

**Files:**
- Create: `packages/web/src/app/guide/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { GuidePageLayout } from '@/components/guide';
import en from '@/i18n/locales/en.json';
import pl from '@/i18n/locales/pl.json';
import ru from '@/i18n/locales/ru.json';

const translations = { en, pl, ru };

export default function GuideIndexPage() {
  const { locale } = useLocale();
  const t = translations[locale].guide;

  return (
    <GuidePageLayout
      title={t.title}
      summary={t.description}
      breadcrumbs={[{ label: t.breadcrumbHome }]}
    >
      <div className="grid gap-4">
        <Link
          href="/guide/ksef"
          className="group flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {t.topics.ksef.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t.topics.ksef.description}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" />
        </Link>
      </div>
    </GuidePageLayout>
  );
}
```

- [ ] **Step 2: Smoke-test in dev**

Run dev server in another terminal (`npm run dev --filter=@accounting-ai-agent/web`), open `http://localhost:3000/guide` (no login). Verify:
- Page renders without auth redirect
- Locale switcher cycles en/pl/ru and content changes
- Click "KSeF" → navigates to `/guide/ksef` (404 expected until next task)

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/guide/page.tsx
git commit -m "feat(guide): add /guide landing page"
```

---

## Task 8: `/guide/ksef` topic page (article list)

**Files:**
- Create: `packages/web/src/app/guide/ksef/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';
import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { GuidePageLayout } from '@/components/guide';
import en from '@/i18n/locales/en.json';
import pl from '@/i18n/locales/pl.json';
import ru from '@/i18n/locales/ru.json';

const translations = { en, pl, ru };

const ARTICLES = [
  { slug: 'get-tokens', i18nKey: 'getTokens' as const },
];

export default function KsefTopicPage() {
  const { locale } = useLocale();
  const guide = translations[locale].guide;
  const topic = guide.topics.ksef;

  return (
    <GuidePageLayout
      title={topic.title}
      summary={topic.description}
      breadcrumbs={[
        { label: guide.breadcrumbHome, href: '/guide' },
        { label: topic.title },
      ]}
    >
      <div className="grid gap-3">
        {ARTICLES.map((a) => {
          const article = topic.articles[a.i18nKey];
          return (
            <Link
              key={a.slug}
              href={`/guide/ksef/${a.slug}`}
              className="group flex items-start gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {article.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{article.summary}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0 mt-1" />
            </Link>
          );
        })}
      </div>
    </GuidePageLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/guide/ksef/page.tsx
git commit -m "feat(guide): add /guide/ksef topic page"
```

---

## Task 9: `/guide/ksef/get-tokens` article page

**Files:**
- Create: `packages/web/src/app/guide/ksef/get-tokens/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';
import { useLocale } from '@/contexts/LocaleContext';
import {
  GuidePageLayout,
  GuideStep,
  GuideScreenshot,
  GuideCallout,
  GuideExternalLink,
} from '@/components/guide';
import en from '@/i18n/locales/en.json';
import pl from '@/i18n/locales/pl.json';
import ru from '@/i18n/locales/ru.json';

const translations = { en, pl, ru };

export default function GetTokensPage() {
  const { locale } = useLocale();
  const guide = translations[locale].guide;
  const topic = guide.topics.ksef;
  const article = topic.articles.getTokens;

  return (
    <GuidePageLayout
      title={article.title}
      summary={article.summary}
      breadcrumbs={[
        { label: guide.breadcrumbHome, href: '/guide' },
        { label: topic.title, href: '/guide/ksef' },
        { label: article.title },
      ]}
    >
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{article.intro}</p>

      <GuideCallout
        variant={article.callouts.testFirst.variant as 'info' | 'warning' | 'tip'}
        title={article.callouts.testFirst.title}
        body={article.callouts.testFirst.body}
      />

      {article.steps.map((step, i) => (
        <GuideStep key={i} number={i + 1} title={step.title}>
          <p>{step.body}</p>
          <GuideScreenshot
            src={step.screenshot.src}
            alt={step.screenshot.alt}
            caption={step.screenshot.caption}
            placeholderHint={step.screenshot.placeholderHint}
          />
          {/* Show the "token-only-once" warning right after step 6 (index 5) */}
          {i === 5 && (
            <GuideCallout
              variant={article.callouts.tokenOnce.variant as 'info' | 'warning' | 'tip'}
              title={article.callouts.tokenOnce.title}
              body={article.callouts.tokenOnce.body}
            />
          )}
        </GuideStep>
      ))}

      <section className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{article.links.title}</h2>
        <ul className="space-y-2">
          {(['officialPortal', 'testPortal', 'officialDocs', 'appSettings'] as const).map((key) => {
            const link = article.links[key];
            return (
              <li key={key}>
                <GuideExternalLink href={link.href} label={link.label} />
              </li>
            );
          })}
        </ul>
      </section>
    </GuidePageLayout>
  );
}
```

- [ ] **Step 2: Smoke-test in dev**

Open `http://localhost:3000/guide/ksef/get-tokens` without logging in. Verify:
- All 7 steps render with placeholder boxes (no real images yet)
- Two callouts visible (test-first at top, token-once after step 6)
- All four "Useful links" present
- Locale switcher cycles content for all three locales

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/guide/ksef/get-tokens/page.tsx
git commit -m "feat(guide): add KSeF get-tokens article page"
```

---

## Task 10: OpenGraph image for the article

**Files:**
- Create: `packages/web/src/app/guide/ksef/get-tokens/opengraph-image.tsx`

- [ ] **Step 1: Write OG image**

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'How to get KSeF tokens — eKsięgowy AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        <div style={{ fontSize: '36px', color: 'rgba(255,255,255,0.85)', marginBottom: '16px' }}>
          eKsięgowy AI · Guide
        </div>
        <div
          style={{
            fontSize: '64px',
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.15,
            letterSpacing: '-1.5px',
          }}
        >
          How to get KSeF tokens
        </div>
        <div
          style={{
            marginTop: '40px',
            fontSize: '26px',
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          Step-by-step guide to generate an authentication token in the KSeF portal.
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/guide/ksef/get-tokens/opengraph-image.tsx
git commit -m "feat(guide): add OpenGraph image for KSeF tokens article"
```

---

## Task 11: Add `public/guide/ksef/get-tokens/.gitkeep` and link from footers

**Files:**
- Create: `packages/web/public/guide/ksef/get-tokens/.gitkeep`
- Modify: `packages/web/src/components/landing/LandingFooter.tsx`
- Modify: `packages/web/src/components/legal/LegalFooter.tsx`

- [ ] **Step 1: Create the directory placeholder**

```bash
mkdir -p packages/web/public/guide/ksef/get-tokens
touch packages/web/public/guide/ksef/get-tokens/.gitkeep
```

- [ ] **Step 2: Read each footer file**

Use Read to inspect both footer files; locate where existing "Privacy Policy" / "Terms" links live.

- [ ] **Step 3: Add a "Guide" / "Pomoc" / "Руководство" link to each footer**

Use the same translations key (`t.guide.title` if accessible, otherwise add a `footer.guide` translation key inside the `guide` namespace and reuse). Place the link next to existing legal links.

- [ ] **Step 4: Smoke-test**

Open `http://localhost:3000/` and any legal page; confirm the new Guide link is visible and navigates to `/guide`.

- [ ] **Step 5: Commit**

```bash
git add packages/web/public/guide packages/web/src/components/landing/LandingFooter.tsx packages/web/src/components/legal/LegalFooter.tsx
git commit -m "feat(guide): link /guide section from landing and legal footers"
```

---

## Task 12: E2E smoke test

**Files:**
- Create: `packages/web/tests/e2e/guide/guide-public.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test';

test.describe('/guide section', () => {
  test('all guide pages reachable without authentication', async ({ page }) => {
    // Landing
    await page.goto('/guide');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);

    // Topic page
    await page.goto('/guide/ksef');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);

    // Article page
    await page.goto('/guide/ksef/get-tokens');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);

    // Useful links section visible
    await expect(page.getByRole('link', { name: /KSeF/i }).first()).toBeVisible();
  });

  test('locale switcher changes article content', async ({ page }) => {
    await page.goto('/guide/ksef/get-tokens');
    const h1 = page.locator('h1');
    const initial = await h1.textContent();

    await page.getByRole('button', { name: /^pl$/i }).click();
    await expect(h1).not.toHaveText(initial ?? '');
  });
});
```

- [ ] **Step 2: Update Playwright project list**

If the existing `test:e2e` script in `package.json` enumerates folders explicitly, add `tests/e2e/guide` to the list. Verify by reading the script.

- [ ] **Step 3: Run E2E**

Run: `cd packages/web && npx playwright test tests/e2e/guide`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/web/tests/e2e/guide/guide-public.spec.ts packages/web/package.json
git commit -m "test(guide): e2e — public access and locale switching"
```

---

## Task 13: Final verification and reference back to issue

- [ ] **Step 1: Lint + build**

Run: `cd packages/web && npm run lint && npm run build`
Expected: clean (no errors).

- [ ] **Step 2: Run all unit tests for the package**

Run: `cd packages/web && npm run test`
Expected: PASS (no regressions in unrelated tests).

- [ ] **Step 3: Manual smoke-test final pass**

In a browser, click through all three pages in all three locales. Verify:
- No console errors
- Placeholder boxes render with the descriptive hint text
- All external links open in new tabs
- "Open KSeF settings" link routes to `/ksef/settings` (will redirect to login if logged out — that's correct, target page is auth-gated)

- [ ] **Step 4: Comment on GitHub issue**

```bash
gh issue comment 99 --body "MVP implementation merged on \`development\`. Screenshots still pending — file slots ready in \`packages/web/public/guide/ksef/get-tokens/\`. Placeholders render with description text until real PNGs are added."
```

(Skip this step if not yet merged; do it when ready.)

---

## Risk notes

- **No `middleware.ts` exists** in `packages/web/`, so adding public routes requires no auth-bypass changes. If middleware is added later, the new routes must be whitelisted.
- **i18n JSON file size:** adding the `guide` namespace grows each locale file. If files cross ~50KB, consider splitting (tracked in #100 — MDX migration).
- **Screenshots are external content** from the Polish Ministry of Finance portal. When real screenshots are captured, blur any personally identifiable information (NIP/PESEL) and verify the MF allows reuse for educational purposes (or annotate as illustrative).
