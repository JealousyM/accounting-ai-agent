# Blog feature — design spec

**Date:** 2026-07-13
**Branch:** `feature/blog`
**Status:** approved (design), pending implementation plan
**Product:** eKsięgowy AI (`eksiegowyai.pl`)

## 1. Overview

Add an SEO content blog to the eKsięgowy AI web app. Articles are authored through
an admin editor, stored in PostgreSQL (Prisma), and rendered as server-side public
pages under `/blog`. The goal is to capture long-tail informational search traffic
around Polish tax/accounting topics (KSeF, VAT, ZUS, PIT) and funnel it to signup.

The blog builds on the SEO/i18n backbone already present on `feature/aia-153-seo-i18n`
(as-needed locale prefixing, `getRequestLocale()`, `buildPageMetadata()`, hreflang
helpers, sitemap, JSON-LD builders in `packages/web/src/lib/seo.ts`).

12 Polish draft articles already exist in `docs/blog-drafts/pl/` and will be the
initial content, imported through the admin editor after figure verification.

## 2. Goals / non-goals

**Goals (MVP):**
- Publish/edit articles from a browser admin UI without a redeploy.
- Server-rendered, indexable public pages with correct canonical + hreflang + JSON-LD.
- Polish-first; optional en/ru translations per article; hreflang advertises only
  translations that actually exist.
- Blog entries included in the sitemap.

**Non-goals (explicitly deferred):**
- Rich WYSIWYG editor (use Markdown + live preview — `react-markdown` already in deps).
- File/image uploads (store cover/OG image as URL fields for now).
- Comments, reactions, scheduled publishing, multi-author management.
- Free-text categories (use a fixed enum).

## 3. Data model (Prisma — `packages/api/prisma/schema.prisma`)

```prisma
enum BlogLocale { pl en ru }
enum BlogCategory { KSeF VAT ZUS PIT AI }
enum BlogStatus { DRAFT PUBLISHED }

model BlogPost {
  id             String       @id @default(cuid())
  translationKey String                        // groups pl/en/ru variants of one article
  locale         BlogLocale
  slug           String
  title          String
  description    String                        // meta description
  body           String       @db.Text         // Markdown
  category       BlogCategory
  tags           String[]     @default([])
  faq            Json?                          // [{q,a}] -> FAQPage JSON-LD
  coverImageUrl  String?
  ogImageUrl     String?
  status         BlogStatus   @default(DRAFT)
  authorName     String       @default("Zespół eKsięgowy AI")
  publishedAt    DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([locale, slug])
  @@index([status, locale, publishedAt])
  @@index([translationKey])
}
```

`translationKey` lets the public page and sitemap resolve sibling-locale variants to
build honest hreflang alternates (only for translations that exist and are published).

## 4. Backend (Express — `packages/api/src`, follows the `admin.*` pattern)

- `services/blog.service.ts` (+ `blog.instance.ts` singleton):
  - `listPublished({ locale, page, pageSize, category?, tag? })`
  - `getPublishedBySlug(locale, slug)` → post + published sibling translations
  - `adminList({ page, status?, locale? })`
  - `create(input)`, `update(id, input)`, `remove(id)`, `setStatus(id, status)`
    (sets/clears `publishedAt`)
- `controllers/blog.controller.ts` — thin HTTP handlers, `.bind(controller)`.
- `routes/blog.routes.ts` — mounted in `index.ts`:
  - Public: `GET /api/blog`, `GET /api/blog/:locale/:slug`
  - Admin (`requireAdmin`): `GET /api/admin/blog`, `POST /api/admin/blog`,
    `PUT /api/admin/blog/:id`, `DELETE /api/admin/blog/:id`,
    `PATCH /api/admin/blog/:id/status`
- Zod validation on all write inputs (slug format, locale/category enums, required fields).
- Rate limiters consistent with existing admin routes.
- On publish/unpublish/update of a published post, trigger Next.js on-demand
  revalidation (see §7).

## 5. Frontend — public (`packages/web/src/app`)

- `blog/page.tsx` — listing (localized via as-needed prefix: `/blog`, `/en/blog`,
  `/ru/blog`). Server component; fetches `GET /api/blog?locale=…`. Cards: title,
  description, category, date. Optional category filter.
- `blog/[slug]/page.tsx` — article page. Server component; fetches
  `GET /api/blog/:locale/:slug`. Renders `body` with `react-markdown` + `remark-gfm`
  (same as `/guide`). 404 via `notFound()` when missing/not published.
- `generateMetadata()` per page using `buildPageMetadata()`, but hreflang alternates
  are computed from the post's **existing published translations** (new helper in
  `seo.ts`, e.g. `blogAlternates(translations, activeLocale)`), not the static trio.
- JSON-LD injected per article: `BlogPosting`, `BreadcrumbList`, and `FAQPage`
  (from `faq` field). Reuse/extend builders in `seo.ts`.
- API client `lib/api/blog.ts`.

## 6. Frontend — admin (`packages/web/src/app/admin`, reuses `admin/layout.tsx` + auth)

- `admin/blog/page.tsx` — table of posts (status, locale, category, updatedAt), actions.
- `admin/blog/new/page.tsx` and `admin/blog/[id]/edit/page.tsx` — editor form:
  title, slug (auto-suggested from title), locale, translationKey, category, tags,
  description, cover/OG image URL, Markdown `body` with live preview, faq editor,
  status (draft/published). Client components using `lib/api/blog.ts` with auth token.

## 7. Rendering / freshness (publish without deploy)

- Public blog pages use ISR: `export const revalidate = 60` (short window).
- On admin publish/unpublish/update-of-published, the API calls a Next.js on-demand
  revalidation endpoint (`/api/revalidate` route handler in web, shared secret) to
  `revalidatePath('/blog')` and the affected article path immediately.
- MVP acceptable fallback: rely on the 60s ISR window if the webhook is deferred.

## 8. SEO integration

- Extend `sitemap.ts` to append published posts (fetch from API at build/runtime),
  each with per-post hreflang alternates for existing translations.
- Add `/blog` to footer/nav. `robots.ts` already permits it (not in PRIVATE_PATHS).
- Canonical + hreflang honesty: never advertise a locale variant that isn't published.

## 9. i18n

- Article content is per-locale rows (not runtime-translated).
- UI chrome (listing labels, "czytaj więcej", breadcrumbs) via existing i18n (`next-intl`
  message catalogs in `packages/web/src/i18n`).

## 10. Security

- All mutating endpoints behind `requireAdmin` (role `admin`).
- Zod-validate every write; enforce slug charset and `@@unique([locale, slug])`.
- Markdown rendered without raw HTML injection (react-markdown default escapes HTML;
  do NOT enable `rehype-raw`). Sanitize/validate image URLs.
- Revalidation endpoint protected by a shared secret.

## 11. Testing

- API: unit tests for `blog.service` (CRUD, publish transitions, translation resolution)
  and `blog.routes` (auth gating, validation) — follow `admin.*.test.ts` patterns.
- Web: component test for article rendering + a metadata/hreflang unit test for the new
  `seo.ts` helper.

## 12. Rollout / open items

- Import the 12 existing drafts via the admin editor after verifying `[DO SPRAWDZENIA
  2026]` figures (priority: ryczałt składka zdrowotna set; KSeF dates; wFirma UI paths).
- Prisma migration for the new model + enums.
- Decide runtime for sitemap post fetch (route handler vs. direct DB) — resolve in plan.
