import type { MetadataRoute } from 'next';
import { SITE_URL, PRIVATE_PATHS } from '@/lib/seo';

/**
 * AI answer-engine and training crawlers we explicitly welcome (GEO). They get
 * the same access as any other bot — the public site, minus the auth-gated
 * paths — but stating it outright makes the intent unambiguous and keeps them
 * allowed even if the wildcard policy is ever tightened.
 */
const AI_CRAWLERS = [
  'GPTBot', // OpenAI crawler (training + search index)
  'OAI-SearchBot', // ChatGPT search index
  'ChatGPT-User', // ChatGPT live browsing on user request
  'ClaudeBot', // Anthropic crawler
  'Claude-User', // Claude live browsing on user request
  'anthropic-ai', // legacy Anthropic agent
  'PerplexityBot', // Perplexity index
  'Perplexity-User', // Perplexity live fetch
  'Google-Extended', // Gemini / Vertex grounding + training
  'Applebot-Extended', // Apple Intelligence
  'CCBot', // Common Crawl (feeds many LLMs)
];

export default function robots(): MetadataRoute.Robots {
  const allowAllButPrivate = (userAgent: string | string[]) => ({
    userAgent,
    allow: '/',
    disallow: PRIVATE_PATHS,
  });

  return {
    rules: [allowAllButPrivate('*'), allowAllButPrivate(AI_CRAWLERS)],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
