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
        }),
      ];
  if (!isDraft && post.faq && post.faq.length > 0) jsonLd.push(faqPageJsonLd(post.faq));

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

      <article className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </article>
    </main>
  );
}
