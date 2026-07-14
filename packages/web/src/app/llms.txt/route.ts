import { buildLlmsTxt, type LlmsArticle } from '@/lib/seo';
import { getAllPublished } from '@/lib/blog/content';

/**
 * `/llms.txt` — an AI/LLM crawler guide (llmstxt.org convention). Serves a
 * link-first Markdown overview of the product and its published articles so
 * generative engines can discover and cite the most useful pages.
 *
 * Articles come from the canonical Polish content, newest-first. A read error
 * degrades to an article-less document rather than a 500.
 */
export function GET(): Response {
  let articles: LlmsArticle[] = [];
  try {
    articles = getAllPublished('pl').map((p) => ({
      title: p.title,
      slug: p.slug,
      description: p.description,
    }));
  } catch {
    articles = [];
  }

  return new Response(buildLlmsTxt(articles), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
