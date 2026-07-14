/**
 * @jest-environment node
 */
// Node env: route handlers construct a web `Response`, a Node global that the
// default jsdom environment does not expose. buildLlmsTxt is DOM-agnostic, so
// running the whole file under node is fine.
import { buildLlmsTxt, SITE_URL, SITE_NAME } from './seo';
import { GET } from '@/app/llms.txt/route';

const ARTICLES = [
  { title: 'Biała lista VAT', slug: 'biala-lista-vat', description: 'Jak sprawdzić kontrahenta.' },
  { title: 'Składki ZUS 2026', slug: 'skladki-zus-2026', description: 'Ile zapłacisz.' },
];

describe('buildLlmsTxt', () => {
  it('starts with the product name as an H1 followed by a summary blockquote', () => {
    const txt = buildLlmsTxt(ARTICLES);
    expect(txt.startsWith(`# ${SITE_NAME}`)).toBe(true);
    expect(txt).toMatch(/\n> .+/);
  });

  it('links the core product pages with absolute canonical URLs', () => {
    const txt = buildLlmsTxt(ARTICLES);
    expect(txt).toContain(`${SITE_URL}/pricing`);
    expect(txt).toContain(`${SITE_URL}/blog`);
  });

  it('lists each article as a markdown link (absolute /blog URL) with its description', () => {
    const txt = buildLlmsTxt(ARTICLES);
    expect(txt).toContain(
      `[Biała lista VAT](${SITE_URL}/blog/biala-lista-vat): Jak sprawdzić kontrahenta.`,
    );
    expect(txt).toContain(
      `[Składki ZUS 2026](${SITE_URL}/blog/skladki-zus-2026): Ile zapłacisz.`,
    );
  });

  it('does not crash on an empty article list', () => {
    expect(() => buildLlmsTxt([])).not.toThrow();
    expect(buildLlmsTxt([]).startsWith(`# ${SITE_NAME}`)).toBe(true);
  });
});

describe('GET /llms.txt', () => {
  it('serves the document as UTF-8 plain text', () => {
    const res = GET();
    expect(res.headers.get('Content-Type')).toMatch(/text\/plain/);
    expect(res.headers.get('Content-Type')).toMatch(/utf-8/i);
  });

  it('renders the product heading and links real published articles', async () => {
    const txt = await GET().text();
    expect(txt.startsWith(`# ${SITE_NAME}`)).toBe(true);
    expect(txt).toContain(`${SITE_URL}/blog/`);
  });
});
