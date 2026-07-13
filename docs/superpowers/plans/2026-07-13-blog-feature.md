# Blog Feature Implementation Plan (revised: files-in-repo)

> Supersedes the earlier DB-backed plan. The publisher is the AI agent; articles ship
> via commit → deploy, so content is Markdown files in the repo (no DB, no API, no admin).
> See `docs/superpowers/specs/2026-07-13-blog-feature-design.md`.

**Goal:** Render Markdown article files as static, indexable `/blog` pages with correct
hreflang + JSON-LD + sitemap. Publishing = add/edit a file, set `status: published`, commit.

**Tech:** Next.js 15 App Router, React 19, `react-markdown` + `remark-gfm`, `gray-matter`
(frontmatter), `fs`. Jest for tests.

## Global Constraints

- Content at `packages/web/content/blog/<locale>/<slug>.md` with YAML frontmatter
  (schema in the spec §2). `status: draft` posts are NEVER listed or rendered publicly.
- Categories (verbatim): `KSeF | VAT | ZUS | PIT | AI`. Locales: `pl | en | ru` (pl default/unprefixed).
- Markdown rendered WITHOUT raw HTML (no `rehype-raw`).
- Never advertise a hreflang variant that is not a published translation.
- Loader is server-only (`import 'server-only'`).

## Tasks

### Task 1 — Content dir + drafts + gray-matter
- Add `gray-matter` to `packages/web` deps.
- Create `packages/web/content/blog/pl/`; `git mv` the 12 files from `docs/blog-drafts/pl/`
  into it. Add `translationKey` to each frontmatter (kebab base of the slug). Keep `status: draft`.
- Keep `docs/blog-drafts/README.md` (or move to content as an authoring note). Commit.

### Task 2 — Content loader + types + test (TDD)
- Create `packages/web/src/lib/blog/content.ts` (server-only):
  - Types `PostMeta` (frontmatter fields + slug/locale) and `Post` (`PostMeta & { body: string }`).
  - `getAllPublished(locale)`, `getPostBySlug(locale, slug)`, `getTranslations(translationKey)`,
    `getAllPublishedAllLocales()`. Read dir via `fs.readdirSync(path.join(process.cwd(),'content/blog',locale))`,
    parse with `gray-matter`, filter `status === 'published'`, sort by `publishedAt` desc.
- Test `content.test.ts` against a temp fixture dir (published + draft files): asserts drafts
  excluded, sort order, translation grouping, null on missing.
- Commit.

### Task 3 — SEO helpers + test (TDD)
- Append to `packages/web/src/lib/seo.ts`: `blogAlternatesFor(translations, activeLocale)`,
  `blogPostingJsonLd(...)`, `faqPageJsonLd(faq)` (code as in the earlier plan's Task 5).
- `seo.blog.test.ts`: hreflang only for existing translations; FAQPage shape. Commit.

### Task 4 — `/blog` listing
- `app/blog/layout.tsx` (metadata via `buildPageMetadata`) + `app/blog/page.tsx` (server
  component; `getRequestLocale()`; `getAllPublished(locale)`; card grid; empty-state text). Commit.

### Task 5 — `/blog/[slug]` article
- `app/blog/[slug]/page.tsx`: load via `getPostBySlug`; `notFound()` if null; render body with
  `react-markdown`+`remark-gfm` in a `prose` container; `generateMetadata` with
  `blogAlternatesFor(getTranslations(...), locale)`; inject `blogPostingJsonLd` (+ `faqPageJsonLd`
  if `faq`) via `<script type="application/ld+json">` with `JSON.stringify(x).replace(/</g,'\\u003c')`. Commit.

### Task 6 — sitemap + footer link
- `app/sitemap.ts`: append `getAllPublishedAllLocales()` entries grouped by `translationKey`
  with hreflang alternates; wrap in try/catch so a content error never breaks the sitemap.
- Add `/blog` link to the footer (via `LocaleLink`) + i18n label (pl "Blog", en "Blog", ru "Блог"). Commit.

### Task 7 — Build + test gate
- `next.config` check: if `output:'standalone'`, add `content/**` to `outputFileTracingIncludes`.
- Temporarily flip ONE draft to `status: published`, run `npm run build` + `npm run test` in
  `packages/web`; confirm `/blog` lists it, `/blog/<slug>` renders with JSON-LD + canonical,
  `/sitemap.xml` includes it. Revert the sample to `draft`. Commit any fixes.

## Notes
- Public blog stays empty until real articles are flipped to `published` after figure verification
  (YMYL). That flip is a one-line frontmatter change + commit.
- Deployment reads content at build; confirm files ship (see Task 7 / spec §7).
