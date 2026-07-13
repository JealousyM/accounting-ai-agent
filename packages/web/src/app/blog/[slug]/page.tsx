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
} from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPostBySlug, getTranslations } from '@/lib/blog/content';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const post = getPostBySlug(locale, slug);
  if (!post) return { title: 'Blog' };

  const translations = getTranslations(post.translationKey);
  return {
    title: post.title,
    description: post.description,
    alternates: blogAlternatesFor(translations, locale),
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
  const post = getPostBySlug(locale, slug);
  if (!post) notFound();

  const jsonLd: Record<string, unknown>[] = [
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
  if (post.faq && post.faq.length > 0) jsonLd.push(faqPageJsonLd(post.faq));

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {jsonLd.map((obj, i) => (
        <JsonLd key={i} data={obj} />
      ))}
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </article>
    </main>
  );
}
