import {
  blogAlternatesFor,
  blogPostingJsonLd,
  faqPageJsonLd,
  splitLocale,
  localizedPath,
  type Locale,
} from './seo';

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
