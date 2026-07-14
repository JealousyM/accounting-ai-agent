import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getAllPublished,
  getPostBySlug,
  getTranslations,
  getAllPosts,
  getAnyPostBySlug,
  parseFaqFromBody,
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

// Mirrors the real article shape: a FAQ heading containing "FAQ", bolded
// questions, answer paragraphs (with inline bold + a link), terminated by a
// `---` thematic break before the disclaimer. Placed under `en` so it doesn't
// disturb the getAllPublished('pl') / getTranslations('grp') assertions above.
const PUB_WITH_FAQ = `---
slug: withfaq
locale: en
translationKey: grpfaq
title: With FAQ
description: d
category: VAT
status: published
publishedAt: 2026-07-12
---
# With FAQ

Intro paragraph.

## Section one

Some text.

## Frequently Asked Questions (FAQ)

**First question?**
First **answer** with emphasis.

**Second question?**
Second answer with a [link](/blog/other-article) inside.

---

*Disclaimer.*`;

// Explicit frontmatter FAQ must win over whatever the body parser would find.
const PUB_FAQ_FRONTMATTER = `---
slug: fmfaq
locale: en
translationKey: grpfm
title: FM FAQ
description: d
category: VAT
status: published
publishedAt: 2026-07-12
faq:
  - q: Frontmatter Q?
    a: Frontmatter A.
---
# FM FAQ

## FAQ

**Body Q?**
Body A.`;

beforeAll(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'blogtest-'));
  fs.mkdirSync(path.join(base, 'pl'), { recursive: true });
  fs.mkdirSync(path.join(base, 'en'), { recursive: true });
  fs.writeFileSync(path.join(base, 'pl', 'sample.md'), PUB_PL);
  fs.writeFileSync(path.join(base, 'pl', 'older.md'), OLDER_PUB_PL);
  fs.writeFileSync(path.join(base, 'pl', 'secret.md'), DRAFT_PL);
  fs.writeFileSync(path.join(base, 'en', 'sample-en.md'), PUB_EN);
  fs.writeFileSync(path.join(base, 'en', 'withfaq.md'), PUB_WITH_FAQ);
  fs.writeFileSync(path.join(base, 'en', 'fmfaq.md'), PUB_FAQ_FRONTMATTER);
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

describe('parseFaqFromBody', () => {
  it('extracts question/answer pairs from a body FAQ section', () => {
    const faq = parseFaqFromBody('## Najczęstsze pytania (FAQ)\n\n**Q1?**\nA1.\n\n**Q2?**\nA2.\n');
    expect(faq).toEqual([
      { q: 'Q1?', a: 'A1.' },
      { q: 'Q2?', a: 'A2.' },
    ]);
  });

  it('strips markdown emphasis and links from answers', () => {
    const faq = parseFaqFromBody('## FAQ\n\n**Q?**\nA with **bold** and a [link](/x) inside.\n');
    expect(faq[0].a).toBe('A with bold and a link inside.');
  });

  it('joins a multi-line answer into one string', () => {
    const faq = parseFaqFromBody('## FAQ\n\n**Q?**\nLine one.\nLine two.\n');
    expect(faq[0].a).toBe('Line one. Line two.');
  });

  it('stops at the section terminator (---) and ignores the disclaimer', () => {
    const faq = parseFaqFromBody('## FAQ\n\n**Q?**\nA.\n\n---\n\n*Disclaimer.*');
    expect(faq).toEqual([{ q: 'Q?', a: 'A.' }]);
  });

  it('stops at the next heading after the FAQ', () => {
    const faq = parseFaqFromBody('## FAQ\n\n**Q?**\nA.\n\n## Next section\n\n**Not?**\nA question.');
    expect(faq).toEqual([{ q: 'Q?', a: 'A.' }]);
  });

  it('returns [] when there is no FAQ section', () => {
    expect(parseFaqFromBody('# Title\n\nNo faq here.\n\n## Spis treści\n\n1. Coś')).toEqual([]);
  });
});

describe('FAQ extraction on load', () => {
  it('populates post.faq from the body FAQ section', () => {
    const p = getPostBySlug('en', 'withfaq', base);
    expect(p?.faq).toEqual([
      { q: 'First question?', a: 'First answer with emphasis.' },
      { q: 'Second question?', a: 'Second answer with a link inside.' },
    ]);
  });

  it('prefers explicit frontmatter faq over the body FAQ', () => {
    const p = getPostBySlug('en', 'fmfaq', base);
    expect(p?.faq).toEqual([{ q: 'Frontmatter Q?', a: 'Frontmatter A.' }]);
  });

  it('leaves faq undefined when the article has no FAQ section', () => {
    expect(getPostBySlug('pl', 'sample', base)?.faq).toBeUndefined();
  });
});

// Reads the real content/blog tree (no baseDir override). Guards the GEO
// requirement that every published article emits FAQPage structured data:
// if a new article ships without a `## …FAQ…` section, this fails loudly.
describe('real published articles all emit FAQ data (GEO guard)', () => {
  it.each(['pl', 'en', 'ru'] as const)(
    'every published %s article yields a non-empty FAQ',
    (locale) => {
      const posts = getAllPublished(locale);
      expect(posts.length).toBeGreaterThan(0);
      const withoutFaq = posts.filter((p) => !p.faq || p.faq.length === 0).map((p) => p.slug);
      expect(withoutFaq).toEqual([]);
    },
  );
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
