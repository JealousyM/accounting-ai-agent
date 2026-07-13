# Blog Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a DB-backed SEO blog to eKsięgowy AI — admin-authored articles stored in PostgreSQL, rendered as server-side public `/blog` pages with correct canonical/hreflang/JSON-LD, published without a redeploy.

**Architecture:** Backend follows the existing `routes → controller → service → Prisma` pattern (mirror `admin.*` / `tax-calendar.*`). Services take an injected `PrismaClient`; `*.instance.ts` wires the real client. Public web pages are **server components** that fetch the API directly via `fetch()` (NOT the browser `ApiClient`, which needs `localStorage`). Admin pages are client components reusing `AuthContext` + `apiClient`. SEO reuses helpers in `packages/web/src/lib/seo.ts`.

**Tech Stack:** Node 18+, Express, TypeScript, Prisma, PostgreSQL, Zod, Jest (api + web), Next.js 15 App Router, React 19, Tailwind, `react-markdown` + `remark-gfm`.

## Global Constraints

- API responses use `{ success: boolean, data?, error?, message?, details? }`. `apiClient` unwraps and returns `data`.
- Services take `PrismaClient` via constructor injection; real client is `import { prisma } from '../lib/prisma'`.
- Admin (mutating) endpoints MUST be gated by `requireAdmin` (from `../middleware/auth.middleware`); public read endpoints have NO auth.
- Locale strategy: Polish (`pl`) is default and unprefixed; `en`/`ru` are prefixed. Active locale on the server comes from `getRequestLocale()` (`x-locale` header). Never advertise a hreflang variant that is not published.
- Markdown is rendered WITHOUT raw HTML: use `react-markdown` + `remark-gfm` only. Do NOT add `rehype-raw`.
- Fixed enums (verbatim): `BlogCategory = KSeF | VAT | ZUS | PIT | AI`; `BlogLocale = pl | en | ru`; `BlogStatus = DRAFT | PUBLISHED`.
- Default author string (verbatim): `"Zespół eKsięgowy AI"`.
- Commit after every task. Run `npm run build` from repo root before the final task.

---

## File Structure

**API (`packages/api/`):**
- `prisma/schema.prisma` — add `BlogPost` model + 3 enums (modify)
- `src/types/blog.types.ts` — DTOs + Zod schemas (create)
- `src/services/blog.service.ts` — business logic (create)
- `src/services/blog.instance.ts` — singleton wiring (create)
- `src/services/__tests__/blog.service.test.ts` — unit tests (create)
- `src/controllers/blog.controller.ts` — HTTP handlers (create)
- `src/routes/blog.routes.ts` — route table (create)
- `src/routes/__tests__/blog.routes.test.ts` — route/auth tests (create)
- `src/index.ts` — mount `/api/blog` (modify)

**Web (`packages/web/`):**
- `src/lib/seo.ts` — add `blogAlternatesFor()`, `blogPostingJsonLd()`, `faqPageJsonLd()` (modify)
- `src/lib/seo.blog.test.ts` — helper unit test (create)
- `src/lib/api/blog.ts` — server + client API calls (create)
- `src/types/blog.types.ts` — shared types (create)
- `src/app/blog/page.tsx` + `src/app/blog/layout.tsx` — listing + metadata (create)
- `src/app/blog/[slug]/page.tsx` — article (create)
- `src/app/sitemap.ts` — append published posts (modify)
- `src/app/api/revalidate/route.ts` — on-demand revalidation (create)
- `src/app/admin/blog/page.tsx` — admin list (create)
- `src/app/admin/blog/new/page.tsx` + `src/app/admin/blog/[id]/edit/page.tsx` + `src/components/admin/BlogEditor.tsx` — editor (create)
- `src/components/layout/Footer.tsx` (or equivalent) — add `/blog` link (modify)

---

## Task 1: Prisma model + enums + migration

**Files:**
- Modify: `packages/api/prisma/schema.prisma` (ENUMS section + new model)

**Interfaces:**
- Produces: Prisma model `BlogPost` and enums `BlogLocale`, `BlogCategory`, `BlogStatus`, available as `import { BlogPost, BlogLocale, BlogCategory, BlogStatus } from '@prisma/client'`.

- [ ] **Step 1: Add enums** to the ENUMS section of `schema.prisma`:

```prisma
enum BlogLocale {
  pl
  en
  ru
}

enum BlogCategory {
  KSeF
  VAT
  ZUS
  PIT
  AI
}

enum BlogStatus {
  DRAFT
  PUBLISHED
}
```

- [ ] **Step 2: Add the model** (place near other content models):

```prisma
model BlogPost {
  id             String       @id @default(cuid())
  translationKey String
  locale         BlogLocale
  slug           String
  title          String
  description    String
  body           String       @db.Text
  category       BlogCategory
  tags           String[]     @default([])
  faq            Json?
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

- [ ] **Step 3: Format + validate**

Run (from `packages/api`): `npx prisma format && npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 4: Create migration + generate client**

Run (from `packages/api`): `npx prisma migrate dev --name add_blog_post`
Expected: migration applied, "✔ Generated Prisma Client". A new folder appears under `prisma/migrations/`.

- [ ] **Step 5: Commit**

```bash
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations
git commit -m "feat(blog): add BlogPost model and enums"
```

---

## Task 2: Blog DTOs + Zod schemas

**Files:**
- Create: `packages/api/src/types/blog.types.ts`

**Interfaces:**
- Produces:
  - `createBlogPostSchema` / `updateBlogPostSchema` (Zod) and inferred `CreateBlogPostInput`, `UpdateBlogPostInput`.
  - `setStatusSchema` with `{ status: 'DRAFT' | 'PUBLISHED' }`.
  - `BlogPostDto` shape returned to clients.

- [ ] **Step 1: Write the schema module**

```ts
import { z } from 'zod';

export const BLOG_LOCALES = ['pl', 'en', 'ru'] as const;
export const BLOG_CATEGORIES = ['KSeF', 'VAT', 'ZUS', 'PIT', 'AI'] as const;
export const BLOG_STATUSES = ['DRAFT', 'PUBLISHED'] as const;

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const faqItemSchema = z.object({
  q: z.string().min(1).max(300),
  a: z.string().min(1).max(2000),
});

export const createBlogPostSchema = z.object({
  translationKey: z.string().min(1).max(100),
  locale: z.enum(BLOG_LOCALES),
  slug: z.string().min(1).max(120).regex(slugRegex, 'slug must be kebab-case'),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(300),
  body: z.string().min(1),
  category: z.enum(BLOG_CATEGORIES),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  faq: z.array(faqItemSchema).max(30).optional(),
  coverImageUrl: z.string().url().max(500).optional().or(z.literal('')),
  ogImageUrl: z.string().url().max(500).optional().or(z.literal('')),
  status: z.enum(BLOG_STATUSES).default('DRAFT'),
  authorName: z.string().min(1).max(120).default('Zespół eKsięgowy AI'),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export const setStatusSchema = z.object({
  status: z.enum(BLOG_STATUSES),
});

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

export interface BlogPostDto {
  id: string;
  translationKey: string;
  locale: (typeof BLOG_LOCALES)[number];
  slug: string;
  title: string;
  description: string;
  body: string;
  category: (typeof BLOG_CATEGORIES)[number];
  tags: string[];
  faq: { q: string; a: string }[] | null;
  coverImageUrl: string | null;
  ogImageUrl: string | null;
  status: (typeof BLOG_STATUSES)[number];
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Minimal shape for listings and hreflang resolution. */
export interface BlogPostSummaryDto {
  id: string;
  translationKey: string;
  locale: (typeof BLOG_LOCALES)[number];
  slug: string;
  title: string;
  description: string;
  category: (typeof BLOG_CATEGORIES)[number];
  coverImageUrl: string | null;
  publishedAt: string | null;
}
```

- [ ] **Step 2: Typecheck**

Run (from `packages/api`): `npx tsc --noEmit`
Expected: no errors from `blog.types.ts`.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/types/blog.types.ts
git commit -m "feat(blog): add DTOs and Zod validation schemas"
```

---

## Task 3: BlogService + unit tests (TDD)

**Files:**
- Create: `packages/api/src/services/blog.service.ts`
- Create: `packages/api/src/services/blog.instance.ts`
- Test: `packages/api/src/services/__tests__/blog.service.test.ts`

**Interfaces:**
- Consumes: `PrismaClient`; types from `../types/blog.types`.
- Produces class `BlogService` with:
  - `listPublished(opts: { locale: string; page?: number; pageSize?: number; category?: string; tag?: string }): Promise<{ items: BlogPostSummaryDto[]; total: number }>`
  - `getPublishedBySlug(locale: string, slug: string): Promise<{ post: BlogPostDto; translations: { locale: string; slug: string }[] } | null>`
  - `adminList(opts: { page?: number; pageSize?: number; status?: string; locale?: string }): Promise<{ items: BlogPostDto[]; total: number }>`
  - `getById(id: string): Promise<BlogPostDto | null>`
  - `create(input: CreateBlogPostInput): Promise<BlogPostDto>`
  - `update(id: string, input: UpdateBlogPostInput): Promise<BlogPostDto>`
  - `remove(id: string): Promise<void>`
  - `setStatus(id: string, status: 'DRAFT' | 'PUBLISHED'): Promise<BlogPostDto>`
- Exports singleton `blogService` from `blog.instance.ts`.

- [ ] **Step 1: Write the failing tests** in `blog.service.test.ts` (mirror the mock style of `admin.service.test.ts`):

```ts
import { BlogService } from '../blog.service';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  blogPost: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

const svc = new BlogService(mockPrisma);

const ROW = {
  id: 'c1', translationKey: 'ksef', locale: 'pl', slug: 'ksef-2026',
  title: 'KSeF 2026', description: 'opis', body: '# treść',
  category: 'KSeF', tags: ['ksef'], faq: null, coverImageUrl: null,
  ogImageUrl: null, status: 'PUBLISHED', authorName: 'Zespół eKsięgowy AI',
  publishedAt: new Date('2026-07-13T00:00:00Z'),
  createdAt: new Date('2026-07-13T00:00:00Z'),
  updatedAt: new Date('2026-07-13T00:00:00Z'),
};

beforeEach(() => jest.clearAllMocks());

describe('BlogService.listPublished', () => {
  it('queries only PUBLISHED rows for the locale and maps to summary DTOs', async () => {
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([ROW]);
    (mockPrisma.blogPost.count as jest.Mock).mockResolvedValue(1);

    const res = await svc.listPublished({ locale: 'pl', page: 1, pageSize: 10 });

    expect(mockPrisma.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED', locale: 'pl' },
        orderBy: { publishedAt: 'desc' },
        skip: 0,
        take: 10,
      }),
    );
    expect(res.total).toBe(1);
    expect(res.items[0]).toMatchObject({ slug: 'ksef-2026', title: 'KSeF 2026' });
    expect((res.items[0] as any).body).toBeUndefined();
  });
});

describe('BlogService.getPublishedBySlug', () => {
  it('returns null when no published post matches', async () => {
    (mockPrisma.blogPost.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await svc.getPublishedBySlug('pl', 'missing');
    expect(res).toBeNull();
  });

  it('returns the post plus published sibling translations', async () => {
    (mockPrisma.blogPost.findUnique as jest.Mock).mockResolvedValue(ROW);
    (mockPrisma.blogPost.findMany as jest.Mock).mockResolvedValue([
      { locale: 'pl', slug: 'ksef-2026' },
      { locale: 'en', slug: 'ksef-2026-en' },
    ]);
    const res = await svc.getPublishedBySlug('pl', 'ksef-2026');
    expect(res?.post.slug).toBe('ksef-2026');
    expect(res?.translations).toEqual([
      { locale: 'pl', slug: 'ksef-2026' },
      { locale: 'en', slug: 'ksef-2026-en' },
    ]);
  });

  it('does not return a DRAFT post', async () => {
    (mockPrisma.blogPost.findUnique as jest.Mock).mockResolvedValue({ ...ROW, status: 'DRAFT' });
    const res = await svc.getPublishedBySlug('pl', 'ksef-2026');
    expect(res).toBeNull();
  });
});

describe('BlogService.setStatus', () => {
  it('sets publishedAt when publishing a not-yet-published post', async () => {
    (mockPrisma.blogPost.findUnique as jest.Mock).mockResolvedValue({ ...ROW, status: 'DRAFT', publishedAt: null });
    (mockPrisma.blogPost.update as jest.Mock).mockResolvedValue({ ...ROW });
    await svc.setStatus('c1', 'PUBLISHED');
    expect(mockPrisma.blogPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ status: 'PUBLISHED', publishedAt: expect.any(Date) }),
      }),
    );
  });

  it('keeps existing publishedAt when re-publishing', async () => {
    const existing = new Date('2026-01-01T00:00:00Z');
    (mockPrisma.blogPost.findUnique as jest.Mock).mockResolvedValue({ ...ROW, status: 'DRAFT', publishedAt: existing });
    (mockPrisma.blogPost.update as jest.Mock).mockResolvedValue({ ...ROW });
    await svc.setStatus('c1', 'PUBLISHED');
    const call = (mockPrisma.blogPost.update as jest.Mock).mock.calls[0][0];
    expect(call.data.publishedAt).toEqual(existing);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `packages/api`): `npx jest blog.service --runInBand`
Expected: FAIL — "Cannot find module '../blog.service'".

- [ ] **Step 3: Implement `blog.service.ts`**

```ts
import { PrismaClient, BlogPost } from '@prisma/client';
import {
  BlogPostDto,
  BlogPostSummaryDto,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from '../types/blog.types';

function toDto(row: BlogPost): BlogPostDto {
  return {
    id: row.id,
    translationKey: row.translationKey,
    locale: row.locale,
    slug: row.slug,
    title: row.title,
    description: row.description,
    body: row.body,
    category: row.category,
    tags: row.tags,
    faq: (row.faq as { q: string; a: string }[] | null) ?? null,
    coverImageUrl: row.coverImageUrl,
    ogImageUrl: row.ogImageUrl,
    status: row.status,
    authorName: row.authorName,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSummary(row: BlogPost): BlogPostSummaryDto {
  return {
    id: row.id,
    translationKey: row.translationKey,
    locale: row.locale,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    coverImageUrl: row.coverImageUrl,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

/** Strip empty-string image URLs (Zod allows '' to clear) to null. */
function normalizeImages<T extends { coverImageUrl?: string; ogImageUrl?: string }>(input: T) {
  return {
    ...input,
    coverImageUrl: input.coverImageUrl ? input.coverImageUrl : null,
    ogImageUrl: input.ogImageUrl ? input.ogImageUrl : null,
  };
}

export class BlogService {
  constructor(private prisma: PrismaClient) {}

  async listPublished(opts: {
    locale: string;
    page?: number;
    pageSize?: number;
    category?: string;
    tag?: string;
  }): Promise<{ items: BlogPostSummaryDto[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 12));
    const where: any = { status: 'PUBLISHED', locale: opts.locale };
    if (opts.category) where.category = opts.category;
    if (opts.tag) where.tags = { has: opts.tag };

    const [rows, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return { items: rows.map(toSummary), total };
  }

  async getPublishedBySlug(
    locale: string,
    slug: string,
  ): Promise<{ post: BlogPostDto; translations: { locale: string; slug: string }[] } | null> {
    const row = await this.prisma.blogPost.findUnique({
      where: { locale_slug: { locale: locale as any, slug } },
    });
    if (!row || row.status !== 'PUBLISHED') return null;

    const siblings = await this.prisma.blogPost.findMany({
      where: { translationKey: row.translationKey, status: 'PUBLISHED' },
      select: { locale: true, slug: true },
    });
    return { post: toDto(row), translations: siblings.map((s) => ({ locale: s.locale, slug: s.slug })) };
  }

  async adminList(opts: {
    page?: number;
    pageSize?: number;
    status?: string;
    locale?: string;
  }): Promise<{ items: BlogPostDto[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 50));
    const where: any = {};
    if (opts.status) where.status = opts.status;
    if (opts.locale) where.locale = opts.locale;

    const [rows, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return { items: rows.map(toDto), total };
  }

  async getById(id: string): Promise<BlogPostDto | null> {
    const row = await this.prisma.blogPost.findUnique({ where: { id } });
    return row ? toDto(row) : null;
  }

  async create(input: CreateBlogPostInput): Promise<BlogPostDto> {
    const data = normalizeImages(input);
    const row = await this.prisma.blogPost.create({
      data: {
        ...data,
        faq: input.faq ?? undefined,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      } as any,
    });
    return toDto(row);
  }

  async update(id: string, input: UpdateBlogPostInput): Promise<BlogPostDto> {
    const row = await this.prisma.blogPost.update({
      where: { id },
      data: { ...normalizeImages(input as any), faq: input.faq ?? undefined } as any,
    });
    return toDto(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.blogPost.delete({ where: { id } });
  }

  async setStatus(id: string, status: 'DRAFT' | 'PUBLISHED'): Promise<BlogPostDto> {
    const current = await this.prisma.blogPost.findUnique({ where: { id } });
    const publishedAt =
      status === 'PUBLISHED' ? current?.publishedAt ?? new Date() : current?.publishedAt ?? null;
    const row = await this.prisma.blogPost.update({
      where: { id },
      data: { status, publishedAt },
    });
    return toDto(row);
  }
}
```

- [ ] **Step 4: Implement `blog.instance.ts`**

```ts
import { prisma } from '../lib/prisma';
import { BlogService } from './blog.service';

export const blogService = new BlogService(prisma);
```

- [ ] **Step 5: Run tests to verify they pass**

Run (from `packages/api`): `npx jest blog.service --runInBand`
Expected: PASS (all describe blocks green).

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/services/blog.service.ts packages/api/src/services/blog.instance.ts packages/api/src/services/__tests__/blog.service.test.ts
git commit -m "feat(blog): BlogService with CRUD, publish transitions, translation resolution"
```

---

## Task 4: Controller + routes + mount + route tests (TDD)

**Files:**
- Create: `packages/api/src/controllers/blog.controller.ts`
- Create: `packages/api/src/routes/blog.routes.ts`
- Test: `packages/api/src/routes/__tests__/blog.routes.test.ts`
- Modify: `packages/api/src/index.ts` (mount `/api/blog`)

**Interfaces:**
- Consumes: `blogService` (Task 3), Zod schemas (Task 2), `requireAdmin` + `authenticate` from `../middleware/auth.middleware`.
- Produces: Express router mounted at `/api/blog`. Public: `GET /`, `GET /:locale/:slug`. Admin: `GET /admin`, `POST /admin`, `PUT /admin/:id`, `DELETE /admin/:id`, `PATCH /admin/:id/status`.

- [ ] **Step 1: Write failing route tests** using `supertest` (mirror `admin.routes.test.ts`). Mock `blog.instance` and the auth middleware:

```ts
jest.mock('../../services/blog.instance', () => ({
  blogService: {
    listPublished: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getPublishedBySlug: jest.fn().mockResolvedValue(null),
    adminList: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    create: jest.fn().mockResolvedValue({ id: 'c1' }),
  },
}));

let isAdmin = true;
jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireAdmin: (_req: any, res: any, next: any) =>
    isAdmin ? next() : res.status(403).json({ success: false, error: 'FORBIDDEN' }),
}));

import express from 'express';
import request from 'supertest';
import blogRoutes from '../blog.routes';
import { blogService } from '../../services/blog.instance';

const app = express();
app.use(express.json());
app.use('/api/blog', blogRoutes);

beforeEach(() => { jest.clearAllMocks(); isAdmin = true; });

describe('GET /api/blog', () => {
  it('returns published list', async () => {
    const res = await request(app).get('/api/blog?locale=pl');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(blogService.listPublished).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'pl' }),
    );
  });
});

describe('GET /api/blog/:locale/:slug', () => {
  it('404s when not found', async () => {
    const res = await request(app).get('/api/blog/pl/missing');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/blog/admin', () => {
  it('403s for non-admins', async () => {
    isAdmin = false;
    const res = await request(app).post('/api/blog/admin').send({});
    expect(res.status).toBe(403);
  });

  it('422/400s on invalid body', async () => {
    const res = await request(app).post('/api/blog/admin').send({ locale: 'xx' });
    expect([400, 422]).toContain(res.status);
    expect(blogService.create).not.toHaveBeenCalled();
  });

  it('creates on valid body', async () => {
    const res = await request(app).post('/api/blog/admin').send({
      translationKey: 'ksef', locale: 'pl', slug: 'ksef-2026',
      title: 'KSeF', description: 'opis', body: '# x', category: 'KSeF',
    });
    expect(res.status).toBe(201);
    expect(blogService.create).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `packages/api`): `npx jest blog.routes --runInBand`
Expected: FAIL — cannot find `../blog.routes`.

- [ ] **Step 3: Implement `blog.controller.ts`**

```ts
import { Request, Response } from 'express';
import { blogService } from '../services/blog.instance';
import {
  createBlogPostSchema,
  updateBlogPostSchema,
  setStatusSchema,
} from '../types/blog.types';
import { logger } from '../utils/logger';

function zodError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    error: 'VALIDATION_ERROR',
    details: error.errors?.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
  });
}

export class BlogController {
  async listPublic(req: Request, res: Response) {
    try {
      const locale = ['pl', 'en', 'ru'].includes(String(req.query.locale)) ? String(req.query.locale) : 'pl';
      const page = parseInt(String(req.query.page ?? '1'), 10) || 1;
      const category = req.query.category ? String(req.query.category) : undefined;
      const tag = req.query.tag ? String(req.query.tag) : undefined;
      const data = await blogService.listPublished({ locale, page, category, tag });
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('blog.listPublic failed', { error });
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }

  async getPublic(req: Request, res: Response) {
    try {
      const { locale, slug } = req.params;
      const data = await blogService.getPublishedBySlug(locale, slug);
      if (!data) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('blog.getPublic failed', { error });
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }

  async adminList(req: Request, res: Response) {
    const page = parseInt(String(req.query.page ?? '1'), 10) || 1;
    const status = req.query.status ? String(req.query.status) : undefined;
    const locale = req.query.locale ? String(req.query.locale) : undefined;
    const data = await blogService.adminList({ page, status, locale });
    return res.json({ success: true, data });
  }

  async create(req: Request, res: Response) {
    const parsed = createBlogPostSchema.safeParse(req.body);
    if (!parsed.success) return zodError(res, parsed.error);
    try {
      const data = await blogService.create(parsed.data);
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      if (error?.code === 'P2002') return res.status(409).json({ success: false, error: 'SLUG_TAKEN' });
      logger.error('blog.create failed', { error });
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }

  async update(req: Request, res: Response) {
    const parsed = updateBlogPostSchema.safeParse(req.body);
    if (!parsed.success) return zodError(res, parsed.error);
    try {
      const data = await blogService.update(req.params.id, parsed.data);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.code === 'P2025') return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      if (error?.code === 'P2002') return res.status(409).json({ success: false, error: 'SLUG_TAKEN' });
      logger.error('blog.update failed', { error });
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      await blogService.remove(req.params.id);
      return res.json({ success: true });
    } catch (error: any) {
      if (error?.code === 'P2025') return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }

  async setStatus(req: Request, res: Response) {
    const parsed = setStatusSchema.safeParse(req.body);
    if (!parsed.success) return zodError(res, parsed.error);
    try {
      const data = await blogService.setStatus(req.params.id, parsed.data.status);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.code === 'P2025') return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  }
}

export const blogController = new BlogController();
```

- [ ] **Step 4: Implement `blog.routes.ts`**

```ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { blogController } from '../controllers/blog.controller';

const router = Router();

// Public (no auth)
router.get('/', blogController.listPublic.bind(blogController));

// Admin (auth + admin role) — declared before the public :locale/:slug catch-all
router.get('/admin', authenticate, requireAdmin, blogController.adminList.bind(blogController));
router.post('/admin', authenticate, requireAdmin, blogController.create.bind(blogController));
router.put('/admin/:id', authenticate, requireAdmin, blogController.update.bind(blogController));
router.delete('/admin/:id', authenticate, requireAdmin, blogController.remove.bind(blogController));
router.patch('/admin/:id/status', authenticate, requireAdmin, blogController.setStatus.bind(blogController));

// Public single (catch-all, must come last)
router.get('/:locale/:slug', blogController.getPublic.bind(blogController));

export default router;
```

- [ ] **Step 5: Mount in `index.ts`** — add alongside the other `app.use('/api/...')` lines:

```ts
import blogRoutes from './routes/blog.routes';
// ...
app.use('/api/blog', blogRoutes);
```

- [ ] **Step 6: Run tests to verify they pass**

Run (from `packages/api`): `npx jest blog.routes --runInBand`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/controllers/blog.controller.ts packages/api/src/routes/blog.routes.ts packages/api/src/routes/__tests__/blog.routes.test.ts packages/api/src/index.ts
git commit -m "feat(blog): controller, routes, and /api/blog mount"
```

---

## Task 5: SEO helpers (hreflang + JSON-LD) + unit test (TDD)

**Files:**
- Modify: `packages/web/src/lib/seo.ts`
- Test: `packages/web/src/lib/seo.blog.test.ts`

**Interfaces:**
- Consumes: existing `localizedPath`, `LOCALE_BCP47`, `DEFAULT_LOCALE`, `SITE_URL`, `absoluteUrl`.
- Produces:
  - `blogAlternatesFor(translations: { locale: Locale; slug: string }[], activeLocale: Locale): { canonical: string; languages: Record<string,string> }`
  - `blogPostingJsonLd(input: { title: string; description: string; slug: string; locale: Locale; publishedAt: string | null; updatedAt: string; authorName: string; coverImageUrl?: string | null }): object`
  - `faqPageJsonLd(faq: { q: string; a: string }[]): object`

- [ ] **Step 1: Write failing test** `seo.blog.test.ts`:

```ts
import { blogAlternatesFor, faqPageJsonLd } from './seo';

describe('blogAlternatesFor', () => {
  it('only advertises locales that have a published translation', () => {
    const res = blogAlternatesFor(
      [{ locale: 'pl', slug: 'a' }, { locale: 'en', slug: 'a-en' }],
      'pl',
    );
    expect(res.canonical).toBe('/blog/a');
    expect(res.languages['pl-PL']).toBe('/blog/a');
    expect(res.languages['en-US']).toBe('/en/blog/a-en');
    expect(res.languages['ru-RU']).toBeUndefined();
    expect(res.languages['x-default']).toBe('/blog/a');
  });
});

describe('faqPageJsonLd', () => {
  it('builds a FAQPage with mainEntity questions', () => {
    const jsonld = faqPageJsonLd([{ q: 'Pytanie?', a: 'Odpowiedź.' }]) as any;
    expect(jsonld['@type']).toBe('FAQPage');
    expect(jsonld.mainEntity[0]['@type']).toBe('Question');
    expect(jsonld.mainEntity[0].acceptedAnswer.text).toBe('Odpowiedź.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `packages/web`): `npx jest seo.blog --runInBand`
Expected: FAIL — `blogAlternatesFor` is not a function.

- [ ] **Step 3: Implement helpers** appended to `seo.ts`:

```ts
/**
 * hreflang alternates for a blog article, built ONLY from the locales that
 * actually have a published translation. `x-default` points at the Polish
 * variant if present, otherwise the active locale.
 */
export function blogAlternatesFor(
  translations: { locale: Locale; slug: string }[],
  activeLocale: Locale,
) {
  const bySlug = (locale: Locale) => translations.find((t) => t.locale === locale)?.slug;
  const languages: Record<string, string> = {};
  for (const t of translations) {
    languages[LOCALE_BCP47[t.locale]] = localizedPath(`/blog/${t.slug}`, t.locale);
  }
  const defaultSlug = bySlug(DEFAULT_LOCALE);
  if (defaultSlug) languages['x-default'] = localizedPath(`/blog/${defaultSlug}`, DEFAULT_LOCALE);
  const activeSlug = bySlug(activeLocale)!;
  return { canonical: localizedPath(`/blog/${activeSlug}`, activeLocale), languages };
}

export function blogPostingJsonLd(input: {
  title: string;
  description: string;
  slug: string;
  locale: Locale;
  publishedAt: string | null;
  updatedAt: string;
  authorName: string;
  coverImageUrl?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    inLanguage: LOCALE_BCP47[input.locale],
    datePublished: input.publishedAt ?? undefined,
    dateModified: input.updatedAt,
    author: { '@type': 'Organization', name: input.authorName },
    publisher: { '@type': 'Organization', name: 'MICODE sp. z o.o.' },
    mainEntityOfPage: absoluteUrl(localizedPath(`/blog/${input.slug}`, input.locale)),
    image: input.coverImageUrl ?? undefined,
  };
}

export function faqPageJsonLd(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `packages/web`): `npx jest seo.blog --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/seo.ts packages/web/src/lib/seo.blog.test.ts
git commit -m "feat(blog): SEO helpers for per-post hreflang and JSON-LD"
```

---

## Task 6: Web API client + shared types

**Files:**
- Create: `packages/web/src/types/blog.types.ts`
- Create: `packages/web/src/lib/api/blog.ts`

**Interfaces:**
- Produces:
  - Types `BlogPost`, `BlogPostSummary`, `BlogListResponse`, `BlogPostWithTranslations`.
  - Server fetchers (direct `fetch`, no auth): `fetchPublishedList(locale, params)`, `fetchPublishedPost(locale, slug)`.
  - Admin client fns (via `apiClient`, auth): `adminListPosts`, `adminGetPost`, `adminCreatePost`, `adminUpdatePost`, `adminDeletePost`, `adminSetStatus`.

- [ ] **Step 1: Create `types/blog.types.ts`**

```ts
export type BlogLocale = 'pl' | 'en' | 'ru';
export type BlogCategory = 'KSeF' | 'VAT' | 'ZUS' | 'PIT' | 'AI';
export type BlogStatus = 'DRAFT' | 'PUBLISHED';

export interface BlogPostSummary {
  id: string;
  translationKey: string;
  locale: BlogLocale;
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  coverImageUrl: string | null;
  publishedAt: string | null;
}

export interface BlogPost extends BlogPostSummary {
  body: string;
  tags: string[];
  faq: { q: string; a: string }[] | null;
  ogImageUrl: string | null;
  status: BlogStatus;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListResponse {
  items: BlogPostSummary[];
  total: number;
}

export interface BlogPostWithTranslations {
  post: BlogPost;
  translations: { locale: BlogLocale; slug: string }[];
}
```

- [ ] **Step 2: Create `lib/api/blog.ts`**

```ts
import { apiClient } from './api-client';
import type {
  BlogListResponse,
  BlogPost,
  BlogPostWithTranslations,
  BlogStatus,
} from '@/types/blog.types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/** Server-side fetch (public, no auth). Returns null on 404. */
export async function fetchPublishedPost(
  locale: string,
  slug: string,
): Promise<BlogPostWithTranslations | null> {
  const res = await fetch(`${API_BASE}/api/blog/${locale}/${slug}`, {
    next: { revalidate: 60, tags: [`blog:${slug}`] },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`blog fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data as BlogPostWithTranslations;
}

export async function fetchPublishedList(
  locale: string,
  params: { page?: number; category?: string } = {},
): Promise<BlogListResponse> {
  const qs = new URLSearchParams({ locale, ...(params.page ? { page: String(params.page) } : {}), ...(params.category ? { category: params.category } : {}) });
  const res = await fetch(`${API_BASE}/api/blog?${qs.toString()}`, {
    next: { revalidate: 60, tags: ['blog:list'] },
  });
  if (!res.ok) throw new Error(`blog list failed: ${res.status}`);
  const json = await res.json();
  return json.data as BlogListResponse;
}

// --- Admin (client-side, auth via apiClient) ---
export const adminListPosts = (params: { status?: string; locale?: string; page?: number } = {}) => {
  const qs = new URLSearchParams(params as Record<string, string>);
  return apiClient.get<BlogListResponse & { items: BlogPost[] }>(`/api/blog/admin?${qs.toString()}`);
};
export const adminCreatePost = (data: Partial<BlogPost>) => apiClient.post<BlogPost>('/api/blog/admin', data);
export const adminUpdatePost = (id: string, data: Partial<BlogPost>) => apiClient.put<BlogPost>(`/api/blog/admin/${id}`, data);
export const adminDeletePost = (id: string) => apiClient.delete<void>(`/api/blog/admin/${id}`);
export const adminSetStatus = (id: string, status: BlogStatus) => apiClient.patch<BlogPost>(`/api/blog/admin/${id}/status`, { status });
```

- [ ] **Step 3: Typecheck + commit**

Run (from `packages/web`): `npx tsc --noEmit` → no new errors.

```bash
git add packages/web/src/types/blog.types.ts packages/web/src/lib/api/blog.ts
git commit -m "feat(blog): web API client and shared types"
```

---

## Task 7: Public listing page `/blog`

**Files:**
- Create: `packages/web/src/app/blog/layout.tsx`
- Create: `packages/web/src/app/blog/page.tsx`

**Interfaces:**
- Consumes: `fetchPublishedList` (Task 6), `getRequestLocale`, `buildPageMetadata`.

- [ ] **Step 1: Create `blog/layout.tsx`** (metadata for the listing; localized copy):

```tsx
import { Metadata } from 'next';
import { buildPageMetadata, type Locale, type PageMeta } from '@/lib/seo';
import { getRequestLocale } from '@/lib/locale.server';

const META: Record<Locale, PageMeta> = {
  pl: { title: 'Blog', description: 'Poradnik dla przedsiębiorców: KSeF, VAT, ZUS, PIT i automatyzacja księgowości z AI.' },
  en: { title: 'Blog', description: 'Guides for entrepreneurs: KSeF, VAT, ZUS, PIT and AI-driven accounting automation.' },
  ru: { title: 'Блог', description: 'Гид для предпринимателей: KSeF, VAT, ZUS, PIT и автоматизация бухгалтерии с ИИ.' },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata(META, '/blog', locale);
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create `blog/page.tsx`** (server component, fetches list; card grid, follows guide card styling):

```tsx
import Link from 'next/link';
import { getRequestLocale } from '@/lib/locale.server';
import { localizedPath } from '@/lib/seo';
import { fetchPublishedList } from '@/lib/api/blog';

export const revalidate = 60;

export default async function BlogIndexPage() {
  const locale = await getRequestLocale();
  const { items } = await fetchPublishedList(locale);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Blog</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((p) => (
          <Link
            key={p.id}
            href={localizedPath(`/blog/${p.slug}`, locale)}
            className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-400 transition-colors"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{p.category}</span>
            <h2 className="font-semibold text-gray-900 dark:text-white mt-1">{p.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">{p.description}</p>
          </Link>
        ))}
      </div>
      {items.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Wkrótce pojawią się tu pierwsze artykuły.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify build + manual check**

Run (from repo root): `npm run build --filter=@accounting-ai-agent/web` (or `npx next build` in `packages/web`).
Expected: `/blog` compiles. With the API running and ≥1 published post, `/blog` lists it.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/blog/layout.tsx packages/web/src/app/blog/page.tsx
git commit -m "feat(blog): public /blog listing page"
```

---

## Task 8: Public article page `/blog/[slug]`

**Files:**
- Create: `packages/web/src/app/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `fetchPublishedPost` (Task 6); `blogAlternatesFor`, `blogPostingJsonLd`, `faqPageJsonLd`, `buildPageMetadata` (Task 5); `getRequestLocale`; `react-markdown` + `remark-gfm`.

- [ ] **Step 1: Implement the page** with `generateMetadata` (per-post hreflang) and `notFound()` handling:

```tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getRequestLocale } from '@/lib/locale.server';
import {
  SITE_NAME,
  blogAlternatesFor,
  blogPostingJsonLd,
  faqPageJsonLd,
  type Locale,
} from '@/lib/seo';
import { fetchPublishedPost } from '@/lib/api/blog';

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const data = await fetchPublishedPost(locale, slug);
  if (!data) return { title: 'Blog' };
  const { post, translations } = data;
  return {
    title: post.title,
    description: post.description,
    alternates: blogAlternatesFor(translations as { locale: Locale; slug: string }[], locale),
    openGraph: {
      title: `${post.title} | ${SITE_NAME}`,
      description: post.description,
      type: 'article',
      images: post.ogImageUrl ? [post.ogImageUrl] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: Params) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const data = await fetchPublishedPost(locale, slug);
  if (!data) notFound();
  const { post } = data;

  const jsonLd = [
    blogPostingJsonLd({
      title: post.title,
      description: post.description,
      slug: post.slug,
      locale: locale as Locale,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      authorName: post.authorName,
      coverImageUrl: post.coverImageUrl,
    }),
    ...(post.faq && post.faq.length ? [faqPageJsonLd(post.faq)] : []),
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {jsonLd.map((obj, i) => (
        // JSON-LD must use dangerouslySetInnerHTML (React escapes text nodes and
        // would corrupt the JSON). Escape `<` to < so admin-authored content
        // containing `</script>` cannot break out of the script tag (XSS defense).
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, '\\u003c') }}
        />
      ))}
      <article className="prose dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </article>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run (from `packages/web`): `npx next build`
Expected: `/blog/[slug]` compiles as a dynamic route.
Manual: with a published `pl` post at slug `x`, `/blog/x` renders the markdown; view-source shows `application/ld+json` `BlogPosting` and (if faq) `FAQPage`; `<link rel="alternate" hreflang=...>` only for existing translations.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/blog/[slug]/page.tsx
git commit -m "feat(blog): public article page with markdown + JSON-LD"
```

---

## Task 9: Sitemap includes published posts

**Files:**
- Modify: `packages/web/src/app/sitemap.ts`

**Interfaces:**
- Consumes: `fetchPublishedList` per locale (Task 6), existing `absoluteUrl`, `localizedPath`, `LOCALE_BCP47`.

- [ ] **Step 1: Append blog entries** to the returned array. Fetch published posts across locales and add each with hreflang alternates from its translation group. Because listing returns summaries per-locale, gather all locales and group by `translationKey`:

```ts
// after the existing PUBLIC_PATHS.map(...) result, before return:
import { fetchPublishedList } from '@/lib/api/blog';
import { LOCALES } from '@/lib/seo';

async function blogEntries(): Promise<MetadataRoute.Sitemap> {
  const perLocale = await Promise.all(
    LOCALES.map(async (l) => ({ locale: l, items: (await fetchPublishedList(l)).items })),
  ).catch(() => []);
  const byKey = new Map<string, { locale: string; slug: string }[]>();
  for (const { locale, items } of perLocale) {
    for (const it of items) {
      const arr = byKey.get(it.translationKey) ?? [];
      arr.push({ locale, slug: it.slug });
      byKey.set(it.translationKey, arr);
    }
  }
  const entries: MetadataRoute.Sitemap = [];
  for (const variants of byKey.values()) {
    const pl = variants.find((v) => v.locale === 'pl') ?? variants[0];
    const languages: Record<string, string> = {};
    for (const v of variants) {
      languages[LOCALE_BCP47[v.locale as keyof typeof LOCALE_BCP47]] =
        absoluteUrl(localizedPath(`/blog/${v.slug}`, v.locale as any));
    }
    languages['x-default'] = absoluteUrl(localizedPath(`/blog/${pl.slug}`, pl.locale as any));
    entries.push({
      url: absoluteUrl(localizedPath(`/blog/${pl.slug}`, pl.locale as any)),
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: { languages },
    });
  }
  return entries;
}
```

Make `sitemap()` async and `return [...staticEntries, ...(await blogEntries())]`. Wrap `blogEntries()` in try/catch so a transient API failure never breaks the sitemap (return static-only).

- [ ] **Step 2: Verify build**

Run (from `packages/web`): `npx next build`
Expected: sitemap route compiles. `/sitemap.xml` includes `/blog/...` URLs when posts are published.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/sitemap.ts
git commit -m "feat(blog): include published posts in sitemap with hreflang"
```

---

## Task 10: On-demand revalidation (publish without deploy)

**Files:**
- Create: `packages/web/src/app/api/revalidate/route.ts`
- Modify: `packages/api/src/services/blog.service.ts` (fire revalidation after publish/update/status)
- Modify: `packages/api/.env` docs / `packages/web/.env` docs (shared secret) — note only.

**Interfaces:**
- Produces: `POST /api/revalidate` (web) that validates a shared secret and calls `revalidateTag('blog:list')` + `revalidateTag('blog:<slug>')` + `revalidatePath('/blog')`.
- The API calls it via `fetch` after mutations that affect published content.

- [ ] **Step 1: Web route handler** `app/api/revalidate/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { slug } = await req.json().catch(() => ({ slug: undefined }));
  revalidateTag('blog:list');
  if (slug) revalidateTag(`blog:${slug}`);
  revalidatePath('/blog');
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Trigger from the API** — add a private helper in `blog.service.ts` and call it from `create`, `update`, `setStatus`, `remove` (fire-and-forget; never block or throw):

```ts
private async revalidateWeb(slug?: string): Promise<void> {
  const url = process.env.WEB_REVALIDATE_URL;      // e.g. https://eksiegowyai.pl/api/revalidate
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ slug }),
    });
  } catch { /* best-effort */ }
}
```

Call `void this.revalidateWeb(row.slug);` at the end of `create`/`update`/`setStatus` and `void this.revalidateWeb();` in `remove`. (Node 18 has global `fetch`.)

- [ ] **Step 3: Document env vars** — add to the API `.env.example` and web `.env.local.example` if present: `REVALIDATE_SECRET`, and API-side `WEB_REVALIDATE_URL`.

- [ ] **Step 4: Verify build (web)**

Run (from `packages/web`): `npx next build`
Expected: `/api/revalidate` route compiles.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/api/revalidate/route.ts packages/api/src/services/blog.service.ts
git commit -m "feat(blog): on-demand revalidation on publish"
```

---

## Task 11: Admin — list page

**Files:**
- Create: `packages/web/src/app/admin/blog/page.tsx`

**Interfaces:**
- Consumes: `adminListPosts`, `adminSetStatus`, `adminDeletePost` (Task 6). Reuses `admin/layout.tsx` (auth guard already applied by the admin layout).

- [ ] **Step 1: Implement client component** listing posts with status badges and actions (New, Edit link, Publish/Unpublish, Delete). Follow existing admin page styling (`admin/page.tsx`). Key logic:

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminListPosts, adminSetStatus, adminDeletePost } from '@/lib/api/blog';
import type { BlogPost } from '@/types/blog.types';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await adminListPosts();
    setPosts(res.items as BlogPost[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (p: BlogPost) => {
    await adminSetStatus(p.id, p.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED');
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('Usunąć artykuł?')) return;
    await adminDeletePost(id);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Blog</h1>
        <Link href="/admin/blog/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Nowy artykuł</Link>
      </div>
      {loading ? <p>Ładowanie…</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500">
            <th className="py-2">Tytuł</th><th>Lokalizacja</th><th>Kategoria</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2">{p.title}</td>
                <td>{p.locale}</td>
                <td>{p.category}</td>
                <td>{p.status}</td>
                <td className="flex gap-2 py-2">
                  <Link href={`/admin/blog/${p.id}/edit`} className="text-blue-600">Edytuj</Link>
                  <button onClick={() => toggle(p)} className="text-amber-600">{p.status === 'PUBLISHED' ? 'Ukryj' : 'Publikuj'}</button>
                  <button onClick={() => remove(p.id)} className="text-red-600">Usuń</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

**Note:** confirm the admin layout enforces admin auth (redirect for non-admins). If it does not, gate this page the same way `admin/page.tsx` does — check before implementing.

- [ ] **Step 2: Verify build + commit**

Run (from `packages/web`): `npx next build` → compiles.

```bash
git add packages/web/src/app/admin/blog/page.tsx
git commit -m "feat(blog): admin blog list page"
```

---

## Task 12: Admin — editor (new + edit)

**Files:**
- Create: `packages/web/src/components/admin/BlogEditor.tsx`
- Create: `packages/web/src/app/admin/blog/new/page.tsx`
- Create: `packages/web/src/app/admin/blog/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `adminCreatePost`, `adminUpdatePost`, `adminGetPost` (add `adminGetPost = (id) => apiClient.get<BlogPost>(\`/api/blog/admin/${id}\`)`? — NOTE: there is no admin GET-by-id endpoint in Task 4; add `GET /admin/:id` to routes/controller OR load via `adminListPosts` and filter). **Decision:** add `GET /admin/:id` → `blogController.getById` in Task 4's router if not already present; if implementing after the fact, add it now with `blogService.getById`.

- [ ] **Step 1 (prereq): ensure admin GET-by-id exists.** In `blog.controller.ts` add:

```ts
async adminGetById(req: Request, res: Response) {
  const data = await blogService.getById(req.params.id);
  if (!data) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  return res.json({ success: true, data });
}
```

In `blog.routes.ts` add (before `/admin/:id` PUT/DELETE is fine): `router.get('/admin/:id', authenticate, requireAdmin, blogController.adminGetById.bind(blogController));`
In `lib/api/blog.ts` add: `export const adminGetPost = (id: string) => apiClient.get<BlogPost>(\`/api/blog/admin/${id}\`);`

- [ ] **Step 2: Implement `BlogEditor.tsx`** — a form with title, auto-slug, locale, translationKey, category (select of the 5 enums), tags (comma field), description, cover/OG URL, Markdown `body` textarea with a live `react-markdown` preview pane, a simple FAQ list editor, and status select. On submit calls `onSave(payload)`.

```tsx
'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BlogPost } from '@/types/blog.types';

const CATEGORIES = ['KSeF', 'VAT', 'ZUS', 'PIT', 'AI'] as const;
const LOCALES = ['pl', 'en', 'ru'] as const;

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function BlogEditor({ initial, onSave }: { initial?: Partial<BlogPost>; onSave: (data: Partial<BlogPost>) => Promise<void> }) {
  const [form, setForm] = useState<Partial<BlogPost>>({
    locale: 'pl', category: 'KSeF', status: 'DRAFT', tags: [], ...initial,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof BlogPost, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="p-6 grid gap-4 lg:grid-cols-2">
      <div className="grid gap-3">
        <input className="border p-2 rounded" placeholder="Tytuł" value={form.title ?? ''}
          onChange={(e) => { set('title', e.target.value); if (!initial) set('slug', slugify(e.target.value)); }} />
        <input className="border p-2 rounded" placeholder="slug" value={form.slug ?? ''} onChange={(e) => set('slug', e.target.value)} />
        <div className="flex gap-2">
          <select className="border p-2 rounded" value={form.locale} onChange={(e) => set('locale', e.target.value)}>
            {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="border p-2 rounded" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="border p-2 rounded" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option>
          </select>
        </div>
        <input className="border p-2 rounded" placeholder="translationKey (grupuje tłumaczenia)" value={form.translationKey ?? ''} onChange={(e) => set('translationKey', e.target.value)} />
        <input className="border p-2 rounded" placeholder="tagi (po przecinku)" value={(form.tags ?? []).join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} />
        <textarea className="border p-2 rounded" placeholder="meta description" rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        <input className="border p-2 rounded" placeholder="cover image URL" value={form.coverImageUrl ?? ''} onChange={(e) => set('coverImageUrl', e.target.value)} />
        <textarea className="border p-2 rounded font-mono text-sm" placeholder="treść (Markdown)" rows={20} value={form.body ?? ''} onChange={(e) => set('body', e.target.value)} />
        <button disabled={saving} onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{saving ? 'Zapisywanie…' : 'Zapisz'}</button>
      </div>
      <div className="prose dark:prose-invert max-w-none border-l pl-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.body ?? ''}</ReactMarkdown>
      </div>
    </div>
  );
}
```

(FAQ editor can be a follow-up; `faq` may be left undefined at MVP or pasted as JSON — keep it out of the first cut if time-boxed.)

- [ ] **Step 3: `admin/blog/new/page.tsx`**

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { BlogEditor } from '@/components/admin/BlogEditor';
import { adminCreatePost } from '@/lib/api/blog';

export default function NewBlogPage() {
  const router = useRouter();
  return <BlogEditor onSave={async (data) => { await adminCreatePost(data); router.push('/admin/blog'); }} />;
}
```

- [ ] **Step 4: `admin/blog/[id]/edit/page.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BlogEditor } from '@/components/admin/BlogEditor';
import { adminGetPost, adminUpdatePost } from '@/lib/api/blog';
import type { BlogPost } from '@/types/blog.types';

export default function EditBlogPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  useEffect(() => { adminGetPost(id).then(setPost); }, [id]);
  if (!post) return <div className="p-6">Ładowanie…</div>;
  return <BlogEditor initial={post} onSave={async (data) => { await adminUpdatePost(id, data); router.push('/admin/blog'); }} />;
}
```

- [ ] **Step 5: Verify build + commit**

Run (from `packages/web`): `npx next build` → compiles.

```bash
git add packages/web/src/components/admin/BlogEditor.tsx packages/web/src/app/admin/blog/new/page.tsx packages/web/src/app/admin/blog/[id]/edit/page.tsx packages/api/src/controllers/blog.controller.ts packages/api/src/routes/blog.routes.ts packages/web/src/lib/api/blog.ts
git commit -m "feat(blog): admin editor (new + edit) with markdown preview"
```

---

## Task 13: Footer/nav link + i18n

**Files:**
- Modify: footer component (find via `grep -rl "privacy-policy" packages/web/src/components`), add a `/blog` link.
- Modify: `packages/web/src/i18n/locales/{pl,en,ru}.json` — add a `blog` label if the footer uses i18n keys.

- [ ] **Step 1: Add the link** using `LocaleLink` so it respects locale prefixing. Label: pl "Blog", en "Blog", ru "Блог".

- [ ] **Step 2: Verify build + commit**

```bash
git add packages/web/src/components packages/web/src/i18n
git commit -m "feat(blog): add Blog link to footer"
```

---

## Task 14: Full build + test gate

- [ ] **Step 1: Run the whole test suite**

Run (from repo root): `npm run test`
Expected: all packages pass, including `blog.service`, `blog.routes`, `seo.blog`.

- [ ] **Step 2: Run the whole build**

Run (from repo root): `npm run build`
Expected: api + web build clean (no TS errors).

- [ ] **Step 3: Smoke test end-to-end (manual, with `npm run dev` + Docker up)**
  1. Log in as an admin; open `/admin/blog`; create a post from one of the drafts in `docs/blog-drafts/pl/`; set status PUBLISHED.
  2. Visit `/blog` — the post appears. Open it — markdown renders; view-source shows `BlogPosting` (+ `FAQPage` if faq) JSON-LD and correct canonical.
  3. Check `/sitemap.xml` includes the post URL.

- [ ] **Step 4: Final commit (if any fixes)**

```bash
git add -A
git commit -m "chore(blog): fixes from full build/test gate"
```

---

## Self-Review notes (author)

- **Spec coverage:** data model (T1), API CRUD+publish (T2–4), public pages (T7–8), hreflang/JSON-LD (T5,8), sitemap (T9), publish-without-deploy (T10), admin editor (T11–12), nav (T13), tests (T3,4,5,14). ✅
- **Deferred per spec (non-goals):** image upload, WYSIWYG, comments, scheduling — not tasked. FAQ editor UI is minimal/optional in T12 (flagged).
- **Type consistency:** service method names/signatures in T3 match controller calls in T4 and client fns in T6; `adminGetPost`/`GET /admin/:id` reconciled in T12 Step 1.
- **Known follow-ups:** rich FAQ editor; category filter UI on `/blog`; pagination UI; importing the 12 drafts (after `[DO SPRAWDZENIA 2026]` verification).
