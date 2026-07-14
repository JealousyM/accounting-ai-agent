import robots from './robots';
import { SITE_URL, PRIVATE_PATHS } from '@/lib/seo';

describe('robots', () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
  const agents = rules.flatMap((r) => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]));

  it('keeps the wildcard rule and the sitemap + host', () => {
    expect(agents).toContain('*');
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(result.host).toBe(SITE_URL);
  });

  it('explicitly allows the major AI answer-engine / training crawlers', () => {
    for (const bot of [
      'GPTBot',
      'OAI-SearchBot',
      'ChatGPT-User',
      'ClaudeBot',
      'PerplexityBot',
      'Google-Extended',
      'CCBot',
    ]) {
      expect(agents).toContain(bot);
    }
  });

  it('disallows the private paths and allows the root for every rule', () => {
    for (const r of rules) {
      expect(r.allow).toBe('/');
      expect(r.disallow).toEqual(PRIVATE_PATHS);
    }
  });
});
