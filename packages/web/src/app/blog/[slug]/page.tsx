import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getRequestLocale } from '@/lib/locale.server';
import {
  SITE_NAME,
  LOCALE_BCP47,
  blogAlternatesFor,
  blogPostingJsonLd,
  faqPageJsonLd,
  type Locale,
} from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  getPostBySlug,
  getAnyPostBySlug,
  getTranslations,
  type Post,
} from '@/lib/blog/content';

/** In dev/non-production, drafts are viewable (for review); in production only
 *  published articles resolve. */
const PREVIEW = process.env.NODE_ENV !== 'production';

const DRAFT_BANNER: Record<string, string> = {
  pl: 'SZKIC — ten artykuł nie jest jeszcze opublikowany (widoczny tylko w podglądzie).',
  en: 'DRAFT — this article is not published yet (visible in preview only).',
  ru: 'ЧЕРНОВИК — статья ещё не опубликована (видна только в предпросмотре).',
};

function loadPost(locale: Locale, slug: string): Post | null {
  return PREVIEW ? getAnyPostBySlug(locale, slug) : getPostBySlug(locale, slug);
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const post = loadPost(locale, slug);
  if (!post) return { title: 'Blog' };

  const translations = getTranslations(post.translationKey);
  return {
    title: post.title,
    description: post.description,
    // Only published articles have real hreflang alternates; drafts must never be indexed.
    ...(post.status === 'published'
      ? { alternates: blogAlternatesFor(translations, locale) }
      : { robots: { index: false, follow: false } }),
    openGraph: {
      title: `${post.title} | ${SITE_NAME}`,
      description: post.description,
      type: 'article',
      images: post.ogImage ? [post.ogImage] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: Params) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const post = loadPost(locale, slug);
  if (!post) notFound();

  const isDraft = post.status === 'draft';

  const wordCount = post.body.split(/\s+/).filter(Boolean).length;
  const jsonLd: Record<string, unknown>[] = isDraft
    ? []
    : [
        blogPostingJsonLd({
          title: post.title,
          description: post.description,
          slug: post.slug,
          locale,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          author: post.author,
          coverImage: post.coverImage,
          keywords: post.tags,
          section: post.category,
          wordCount,
        }),
      ];
  if (!isDraft && post.faq && post.faq.length > 0) jsonLd.push(faqPageJsonLd(post.faq));

  // The title + byline are rendered from frontmatter, so strip the leading H1
  // from the Markdown body to avoid showing the title twice.
  const body = post.body.replace(/^#[^\n]*\r?\n+/, '');
  const dateLabel = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(LOCALE_BCP47[locale], {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {jsonLd.map((obj, i) => (
        <JsonLd key={i} data={obj} />
      ))}

      {PREVIEW && isDraft && (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-300">
          {DRAFT_BANNER[locale]}
        </p>
      )}

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {post.author}
          {dateLabel && (
            <>
              {' · '}
              <time dateTime={post.publishedAt ?? undefined}>{dateLabel}</time>
            </>
          )}
        </p>
      </header>

      <article className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </article>
    </main>
  );
}
