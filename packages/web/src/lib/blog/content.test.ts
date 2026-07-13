import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getAllPublished,
  getPostBySlug,
  getTranslations,
  getAllPosts,
  getAnyPostBySlug,
} from './content';

let base: string;

const PUB_PL = `---
slug: sample
locale: pl
translationKey: grp
title: Sample PL
description: opis
category: VAT
tags: [a, b]
status: published
publishedAt: 2026-07-10
updatedAt: 2026-07-11
author: Zespół eKsięgowy AI
---
# Body PL
Treść artykułu.`;

const OLDER_PUB_PL = `---
slug: older
locale: pl
translationKey: grp2
title: Older PL
description: opis2
category: ZUS
status: published
publishedAt: 2026-07-01
---
# Older`;

const DRAFT_PL = `---
slug: secret
locale: pl
translationKey: grp3
title: Draft
description: d
category: PIT
status: draft
---
# Draft body`;

const PUB_EN = `---
slug: sample-en
locale: en
translationKey: grp
title: Sample EN
description: desc
category: VAT
status: published
publishedAt: 2026-07-10
---
# Body EN`;

beforeAll(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'blogtest-'));
  fs.mkdirSync(path.join(base, 'pl'), { recursive: true });
  fs.mkdirSync(path.join(base, 'en'), { recursive: true });
  fs.writeFileSync(path.join(base, 'pl', 'sample.md'), PUB_PL);
  fs.writeFileSync(path.join(base, 'pl', 'older.md'), OLDER_PUB_PL);
  fs.writeFileSync(path.join(base, 'pl', 'secret.md'), DRAFT_PL);
  fs.writeFileSync(path.join(base, 'en', 'sample-en.md'), PUB_EN);
});

afterAll(() => {
  fs.rmSync(base, { recursive: true, force: true });
});

describe('getAllPublished', () => {
  it('excludes drafts and sorts by publishedAt desc, without the body', () => {
    const posts = getAllPublished('pl', base);
    expect(posts.map((p) => p.slug)).toEqual(['sample', 'older']);
    expect(posts.find((p) => p.slug === 'secret')).toBeUndefined();
    expect((posts[0] as unknown as Record<string, unknown>).body).toBeUndefined();
  });
});

describe('getPostBySlug', () => {
  it('returns a published post with parsed frontmatter and body', () => {
    const p = getPostBySlug('pl', 'sample', base);
    expect(p?.title).toBe('Sample PL');
    expect(p?.body).toContain('Treść artykułu.');
    expect(p?.tags).toEqual(['a', 'b']);
    expect(p?.publishedAt).toBe('2026-07-10');
  });

  it('returns null for a draft', () => {
    expect(getPostBySlug('pl', 'secret', base)).toBeNull();
  });

  it('returns null for a missing file', () => {
    expect(getPostBySlug('pl', 'nope', base)).toBeNull();
  });
});

describe('getAllPosts (preview)', () => {
  it('includes drafts alongside published, newest first', () => {
    const slugs = getAllPosts('pl', base).map((p) => p.slug);
    expect(slugs).toContain('secret'); // draft
    expect(slugs).toContain('sample'); // published
  });
});

describe('getAnyPostBySlug (preview)', () => {
  it('returns a draft post (which getPostBySlug hides)', () => {
    expect(getAnyPostBySlug('pl', 'secret', base)?.status).toBe('draft');
    expect(getPostBySlug('pl', 'secret', base)).toBeNull();
  });
});

describe('getTranslations', () => {
  it('groups published variants across locales by translationKey', () => {
    expect(getTranslations('grp', base)).toEqual([
      { locale: 'pl', slug: 'sample' },
      { locale: 'en', slug: 'sample-en' },
    ]);
  });

  it('excludes a translation whose only variant is a draft', () => {
    expect(getTranslations('grp3', base)).toEqual([]);
  });
});
