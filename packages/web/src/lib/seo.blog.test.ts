import { blogAlternatesFor, blogPostingJsonLd, faqPageJsonLd } from './seo';

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
    const jsonld = faqPageJsonLd([{ q: 'Pytanie?', a: 'Odpowiedź.' }]) as Record<string, any>;
    expect(jsonld['@type']).toBe('FAQPage');
    expect(jsonld.mainEntity[0]['@type']).toBe('Question');
    expect(jsonld.mainEntity[0].acceptedAnswer.text).toBe('Odpowiedź.');
  });
});
