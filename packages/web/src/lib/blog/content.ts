import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type BlogLocale = 'pl' | 'en' | 'ru';
export type BlogCategory = 'KSeF' | 'VAT' | 'ZUS' | 'PIT' | 'AI';
export type BlogStatus = 'draft' | 'published';

export interface BlogFaqItem {
  q: string;
  a: string;
}

/** Article metadata (frontmatter) without the Markdown body. */
export interface PostMeta {
  slug: string;
  locale: BlogLocale;
  translationKey: string;
  title: string;
  description: string;
  category: BlogCategory;
  tags: string[];
  status: BlogStatus;
  publishedAt: string | null;
  updatedAt: string | null;
  author: string;
  coverImage?: string;
  ogImage?: string;
  faq?: BlogFaqItem[];
}

/** Full article: metadata plus the Markdown body. */
export interface Post extends PostMeta {
  body: string;
}

const LOCALES: BlogLocale[] = ['pl', 'en', 'ru'];

/** Root of the Markdown content tree; overridable in tests. */
function contentRoot(baseDir?: string): string {
  return baseDir ?? path.join(process.cwd(), 'content', 'blog');
}

/** YAML parses bare dates into Date objects; normalise everything to `YYYY-MM-DD`. */
function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

/** Markdown → plain text for a FAQ answer: unwrap links to their text and
 *  drop bold markers, then collapse whitespace. Keeps the answer clean enough
 *  for schema.org `acceptedAnswer.text` and AI extraction. */
function faqPlainText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold** -> bold
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract FAQ question/answer pairs from an article body.
 *
 * Finds the first `## …FAQ…` heading and reads the `**Question?**` /
 * answer-paragraph pairs beneath it, stopping at the next heading or a thematic
 * break (`---`, `***`, `___`) — which in our articles precedes the disclaimer.
 * Returns [] when the article has no FAQ section. Lets us feed FAQPage
 * structured data straight from the visible prose, with no frontmatter
 * duplication and no risk of body/schema drift.
 */
export function parseFaqFromBody(body: string): BlogFaqItem[] {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => /^#{2,6}\s.*FAQ/i.test(l));
  if (start === -1) return [];

  const items: BlogFaqItem[] = [];
  let q: string | null = null;
  let answer: string[] = [];
  const flush = () => {
    if (q !== null) {
      const a = faqPlainText(answer.join(' '));
      if (a) items.push({ q, a });
    }
    q = null;
    answer = [];
  };

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,6}\s/.test(line) || /^(---|\*\*\*|___)\s*$/.test(line)) break;
    const question = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (question) {
      flush();
      q = question[1].trim();
    } else if (line.trim()) {
      answer.push(line.trim());
    }
  }
  flush();
  return items;
}

function parseFile(localeDir: string, locale: BlogLocale, file: string): Post {
  const raw = fs.readFileSync(path.join(localeDir, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = (data.slug as string) ?? file.replace(/\.md$/, '');
  const body = content.trim();
  // Explicit frontmatter FAQ wins; otherwise derive it from the body prose so
  // FAQPage structured data is emitted without duplicating the FAQ by hand.
  const bodyFaq = parseFaqFromBody(body);
  const faq = Array.isArray(data.faq)
    ? (data.faq as BlogFaqItem[])
    : bodyFaq.length > 0
      ? bodyFaq
      : undefined;
  return {
    slug,
    locale,
    translationKey: (data.translationKey as string) ?? slug,
    title: (data.title as string) ?? slug,
    description: (data.description as string) ?? '',
    category: (data.category as BlogCategory) ?? 'AI',
    tags: Array.isArray(data.tags) ? (data.tags as unknown[]).map(String) : [],
    status: (data.status as string) === 'published' ? 'published' : 'draft',
    publishedAt: toIsoDate(data.publishedAt),
    updatedAt: toIsoDate(data.updatedAt),
    author: (data.author as string) ?? 'Zespół eKsięgowy AI',
    coverImage: (data.coverImage as string) || undefined,
    ogImage: (data.ogImage as string) || undefined,
    faq,
    body,
  };
}

/** Parse every `.md` file for a locale; missing dir or bad file → skipped. */
function readLocale(locale: BlogLocale, baseDir?: string): Post[] {
  const dir = path.join(contentRoot(baseDir), locale);
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
  const posts: Post[] = [];
  for (const file of files) {
    try {
      posts.push(parseFile(dir, locale, file));
    } catch {
      // skip unreadable / malformed file rather than break the whole listing
    }
  }
  return posts;
}

function stripBody(post: Post): PostMeta {
  const meta = { ...post } as Partial<Post>;
  delete meta.body;
  return meta as PostMeta;
}

function byPublishedDesc(a: PostMeta, b: PostMeta): number {
  return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
}

/** Published posts for a locale, newest first. Drafts are excluded. */
export function getAllPublished(locale: BlogLocale, baseDir?: string): PostMeta[] {
  return readLocale(locale, baseDir)
    .filter((p) => p.status === 'published')
    .map(stripBody)
    .sort(byPublishedDesc);
}

/** A single published post (with body), or null if missing or still a draft. */
export function getPostBySlug(locale: BlogLocale, slug: string, baseDir?: string): Post | null {
  const dir = path.join(contentRoot(baseDir), locale);
  let post: Post;
  try {
    post = parseFile(dir, locale, `${slug}.md`);
  } catch {
    return null;
  }
  return post.status === 'published' ? post : null;
}

/** All posts for a locale INCLUDING drafts, newest first. Local-preview only —
 *  never call from code paths that feed the public site or the sitemap. */
export function getAllPosts(locale: BlogLocale, baseDir?: string): PostMeta[] {
  return readLocale(locale, baseDir).map(stripBody).sort(byPublishedDesc);
}

/** A single post by slug regardless of status (incl. drafts). Local-preview only. */
export function getAnyPostBySlug(locale: BlogLocale, slug: string, baseDir?: string): Post | null {
  const dir = path.join(contentRoot(baseDir), locale);
  try {
    return parseFile(dir, locale, `${slug}.md`);
  } catch {
    return null;
  }
}

/** Published variants of one article across locales — for hreflang alternates. */
export function getTranslations(
  translationKey: string,
  baseDir?: string,
): { locale: BlogLocale; slug: string }[] {
  const out: { locale: BlogLocale; slug: string }[] = [];
  for (const locale of LOCALES) {
    for (const post of readLocale(locale, baseDir)) {
      if (post.status === 'published' && post.translationKey === translationKey) {
        out.push({ locale, slug: post.slug });
      }
    }
  }
  return out;
}

/** Every published post across all locales — for the sitemap. */
export function getAllPublishedAllLocales(baseDir?: string): PostMeta[] {
  return LOCALES.flatMap((locale) => getAllPublished(locale, baseDir));
}
