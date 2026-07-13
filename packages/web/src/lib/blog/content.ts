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

function parseFile(localeDir: string, locale: BlogLocale, file: string): Post {
  const raw = fs.readFileSync(path.join(localeDir, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = (data.slug as string) ?? file.replace(/\.md$/, '');
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
    faq: Array.isArray(data.faq) ? (data.faq as BlogFaqItem[]) : undefined,
    body: content.trim(),
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
  const { body: _body, ...meta } = post;
  return meta;
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
