import {
  blogAlternatesFor,
  blogPostingJsonLd,
  faqPageJsonLd,
  findLinkedIn,
  splitLocale,
  localizedPath,
  type Locale,
} from './seo';

describe('findLinkedIn', () => {
  it('returns the LinkedIn URL from a sameAs list', () => {
    expect(findLinkedIn(['http://mi-code.pl', 'https://www.linkedin.com/in/x/'])).toBe(
      'https://www.linkedin.com/in/x/',
    );
  });

  it('matches linkedin.com case-insensitively', () => {
    expect(findLinkedIn(['https://LinkedIn.com/in/y'])).toBe('https://LinkedIn.com/in/y');
  });

  it('returns undefined when there is no LinkedIn profile, or the list is empty/undefined', () => {
    expect(findLinkedIn(['http://mi-code.pl'])).toBeUndefined();
    expect(findLinkedIn([])).toBeUndefined();
    expect(findLinkedIn(undefined)).toBeUndefined();
  });
});

describe('locale switch target (regression: prefixes must not stack)', () => {
  // Mirrors what useLocaleSwitcher computes: strip any existing locale prefix,
  // then re-localize. Guards against /ru/blog -> /en/ru/blog.
  const cases: [string, Locale, string][] = [
    ['/ru/blog', 'en', '/en/blog'],
    ['/en/blog', 'ru', '/ru/blog'],
    ['/blog', 'en', '/en/blog'],
    ['/en/blog', 'pl', '/blog'],
    ['/ru/blog/ksef-od-kiedy-obowiazkowy-2026', 'en', '/en/blog/ksef-od-kiedy-obowiazkowy-2026'],
    ['/en/pricing', 'ru', '/ru/pricing'],
  ];
  it.each(cases)('switch %s to %s -> %s', (path, loc, expected) => {
    expect(localizedPath(splitLocale(path).path, loc)).toBe(expected);
  });
});

describe('blogAlternatesFor', () => {
  it('only advertises locales that have a published translation', () => {
    const res = blogAlternatesFor(
      [
        { locale: 'pl', slug: 'a' },
        { locale: 'en', slug: 'a-en' },
      ],
      'pl',
    );
    expect(res.canonical).toBe('/blog/a');
    expect(res.languages['pl-PL']).toBe('/blog/a');
    expect(res.languages['en-US']).toBe('/en/blog/a-en');
    expect(res.languages['ru-RU']).toBeUndefined();
    expect(res.languages['x-default']).toBe('/blog/a');
  });

  it('uses the active (prefixed) locale for the canonical', () => {
    const res = blogAlternatesFor(
      [
        { locale: 'pl', slug: 'a' },
        { locale: 'en', slug: 'a-en' },
      ],
      'en',
    );
    expect(res.canonical).toBe('/en/blog/a-en');
    expect(res.languages['x-default']).toBe('/blog/a');
  });
});

describe('blogPostingJsonLd', () => {
  it('builds BlogPosting with language and absolute mainEntityOfPage', () => {
    const jsonld = blogPostingJsonLd({
      title: 'T',
      description: 'D',
      slug: 'a',
      locale: 'pl',
      publishedAt: '2026-07-10',
      updatedAt: '2026-07-11',
      author: 'Zespół eKsięgowy AI',
    }) as Record<string, unknown>;
    expect(jsonld['@type']).toBe('BlogPosting');
    expect(jsonld.inLanguage).toBe('pl-PL');
    expect(jsonld.datePublished).toBe('2026-07-10');
    expect(String(jsonld.mainEntityOfPage)).toContain('/blog/a');
  });

  it('emits a Person author with url, a sameAs list and jobTitle when provided', () => {
    const jsonld = blogPostingJsonLd({
      title: 'T',
      description: 'D',
      slug: 'a',
      locale: 'pl',
      publishedAt: '2026-07-10',
      updatedAt: null,
      author: 'Mikhail Peraviortkin',
      authorUrl: 'https://example.com',
      authorSameAs: ['https://example.com', 'https://linkedin.com/in/x'],
      authorJobTitle: 'Founder',
    }) as { author: Record<string, unknown> };
    expect(jsonld.author['@type']).toBe('Person');
    expect(jsonld.author.name).toBe('Mikhail Peraviortkin');
    expect(jsonld.author.url).toBe('https://example.com');
    expect(jsonld.author.sameAs).toEqual(['https://example.com', 'https://linkedin.com/in/x']);
    expect(jsonld.author.jobTitle).toBe('Founder');
  });

  it('emits a Person author without url/sameAs when no author URL is given', () => {
    const jsonld = blogPostingJsonLd({
      title: 'T',
      description: 'D',
      slug: 'a',
      locale: 'pl',
      publishedAt: null,
      updatedAt: null,
      author: 'Mikhail Peraviortkin',
    }) as { author: Record<string, unknown> };
    expect(jsonld.author['@type']).toBe('Person');
    expect('url' in jsonld.author).toBe(false);
    expect('sameAs' in jsonld.author).toBe(false);
  });

  it('adds keywords, articleSection and wordCount when provided', () => {
    const jsonld = blogPostingJsonLd({
      title: 'T',
      description: 'D',
      slug: 'a',
      locale: 'pl',
      publishedAt: '2026-07-10',
      updatedAt: '2026-07-11',
      author: 'Zespół eKsięgowy AI',
      keywords: ['vat', 'ksef'],
      section: 'VAT',
      wordCount: 1200,
    }) as Record<string, unknown>;
    expect(jsonld.keywords).toBe('vat, ksef');
    expect(jsonld.articleSection).toBe('VAT');
    expect(jsonld.wordCount).toBe(1200);
  });

  it('omits keywords/articleSection/wordCount when absent or empty', () => {
    const jsonld = blogPostingJsonLd({
      title: 'T',
      description: 'D',
      slug: 'a',
      locale: 'pl',
      publishedAt: null,
      updatedAt: null,
      author: 'Zespół eKsięgowy AI',
      keywords: [],
    }) as Record<string, unknown>;
    expect('keywords' in jsonld).toBe(false);
    expect('articleSection' in jsonld).toBe(false);
    expect('wordCount' in jsonld).toBe(false);
  });
});

describe('faqPageJsonLd', () => {
  it('builds a FAQPage with mainEntity questions', () => {
    const jsonld = faqPageJsonLd([{ q: 'Pytanie?', a: 'Odpowiedź.' }]) as {
      '@type': string;
      mainEntity: { '@type': string; acceptedAnswer: { text: string } }[];
    };
    expect(jsonld['@type']).toBe('FAQPage');
    expect(jsonld.mainEntity[0]['@type']).toBe('Question');
    expect(jsonld.mainEntity[0].acceptedAnswer.text).toBe('Odpowiedź.');
  });
});
