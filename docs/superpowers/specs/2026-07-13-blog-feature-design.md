# Blog feature — design spec (revised: files-in-repo)

**Date:** 2026-07-13
**Branch:** `feature/blog`
**Status:** approved (design)
**Product:** eKsięgowy AI (`eksiegowyai.pl`)

## 0. Revision note

The original design was DB-backed (Prisma `BlogPost` + admin editor + API CRUD),
chosen under the assumption a **human** publishes via a browser without redeploying.
The publisher is instead the **AI agent**, which writes content directly, and articles
reach the live site via **commit → CI deploy**. That removes the entire reason for a
DB and admin UI. Revised design: **Markdown files in the repo**, rendered as static
pages. Simpler, fully static (best SEO), versioned in git, and the 12 existing drafts
become the content near-verbatim.

Dropped vs. the original: Prisma model + migration, API service/controller/routes,
admin editor, on-demand revalidation. Kept: public `/blog` pages, Markdown rendering,
and the SEO helpers (hreflang / JSON-LD / sitemap) — now fed by files, not a DB.

## 1. Overview

Articles are Markdown files with YAML frontmatter under
`packages/web/content/blog/<locale>/<slug>.md`. A server-only content loader reads and
parses them; Next.js App Router renders a `/blog` listing and `/blog/[slug]` article
pages. Publishing = add/edit a file, set `status: published`, commit, deploy.

## 2. Content model (frontmatter)

```yaml
---
slug: ksef-od-kiedy-obowiazkowy-2026
locale: pl
translationKey: ksef-od-kiedy-obowiazkowy   # groups pl/en/ru variants for hreflang
title: "…"
description: "…"          # meta description ≤160 chars
category: KSeF            # KSeF | VAT | ZUS | PIT | AI
tags: [ksef, e-faktura]
status: published        # draft | published  (draft = never rendered/listed)
publishedAt: 2026-07-13
updatedAt: 2026-07-13
author: "Zespół eKsięgowy AI"
coverImage: ""           # optional URL
ogImage: ""              # optional URL
faq:                     # optional; when present -> FAQPage JSON-LD
  - q: "…?"
    a: "…"
---
# Markdown body…
```

The 12 existing drafts already carry most of these fields and `status: draft`; they move
into the content dir unchanged (add `translationKey`), staying `draft` until their
`[DO SPRAWDZENIA 2026]` figures are verified and someone flips them to `published`.

## 3. Content loader (`packages/web/src/lib/blog/content.ts`, server-only)

Uses `fs` + `gray-matter`. Functions:
- `getAllPublished(locale): PostMeta[]` — published posts for a locale, newest first.
- `getPostBySlug(locale, slug): Post | null` — full post (meta + body); null if missing or `draft`.
- `getTranslations(translationKey): { locale, slug }[]` — published variants across locales (for hreflang).
- `getAllPublishedAllLocales(): {...}` — for the sitemap.

`draft` posts are excluded everywhere on the public site.

## 4. Rendering (Next.js App Router)

- `app/blog/page.tsx` (+ `layout.tsx` for metadata) — listing; server component; locale via
  `getRequestLocale()`; card grid.
- `app/blog/[slug]/page.tsx` — article; `react-markdown` + `remark-gfm`; `notFound()` when
  missing/draft; `generateMetadata()` with per-post hreflang (only existing translations) +
  `BlogPosting` + optional `FAQPage` JSON-LD.
- Follows the existing header-based i18n (as-needed prefixing; `/blog`, `/en/blog`, `/ru/blog`).

## 5. SEO helpers (`packages/web/src/lib/seo.ts`)

Add (same as originally planned, unit-tested):
- `blogAlternatesFor(translations, activeLocale)` — canonical + hreflang from existing translations only.
- `blogPostingJsonLd(...)`, `faqPageJsonLd(faq)`.
`sitemap.ts` gains published-post entries with hreflang alternates, read from the loader at build.

## 6. Non-goals

No DB, no admin UI, no API, no comments, no image upload, no scheduling. Editing = edit the
Markdown file. Rich formatting = Markdown (no WYSIWYG). Raw HTML in Markdown is NOT enabled
(`react-markdown` default escapes it; no `rehype-raw`).

## 7. Deployment

Content files live in the repo and are read at build. Confirm `next.config` output mode:
if `output: 'standalone'`, add the content dir to `outputFileTracingIncludes` (or generate
statically) so files ship. Otherwise request-time reads resolve against `process.cwd()`
(= `packages/web`).

## 8. Implementation task list

1. Add `gray-matter`; create content dir; move 12 drafts → `content/blog/pl/` (add
   `translationKey`, keep `status: draft`).
2. Content loader + `PostMeta`/`Post` types + unit test (fixture md).
3. SEO helpers in `seo.ts` + unit test.
4. `/blog` listing page + layout metadata.
5. `/blog/[slug]` article page + metadata + JSON-LD.
6. `sitemap.ts` posts + footer `/blog` link (+ i18n label).
7. Build + test gate; verify `/blog` renders a published sample.

## 9. Verification / rollout

- Build the machinery with all 12 as `draft` → public `/blog` is empty (safe for YMYL).
- To go live: verify `[DO SPRAWDZENIA 2026]` figures (priority: ryczałt składka zdrowotna),
  set `status: published`, commit, deploy.
