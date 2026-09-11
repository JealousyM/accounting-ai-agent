import { render, screen } from '@testing-library/react';
import ProductsPage from '../page';
import { MICODE_LINKS } from '@/lib/external-links';
import { PRODUCTS_ITEMLIST_JSONLD } from '@/lib/seo';

jest.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'pl', setLocale: jest.fn() }),
}));

describe('ProductsPage', () => {
  it('gives every MICODE destination a followed outbound link', () => {
    const { container } = render(<ProductsPage />);
    for (const link of MICODE_LINKS) {
      const anchor = container.querySelector(`a[href="${link.url}"]`);
      expect(anchor).not.toBeNull();
      expect(anchor).toHaveAttribute('target', '_blank');
      expect(anchor!.getAttribute('rel')).toContain('noopener');
      expect(anchor!.getAttribute('rel')).not.toContain('nofollow');
    }
  });

  it('heads each product with its own subheading', () => {
    render(<ProductsPage />);
    const names = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(names).toEqual(['eKsięgowy AI', 'MICODE', 'AI Budget']);
  });

  it('embeds the ItemList structured data', () => {
    const { container } = render(<ProductsPage />);
    const scripts = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    ).map((s) => JSON.parse(s.innerHTML.replace(/\u003c/g, '<')));
    expect(scripts).toContainEqual(PRODUCTS_ITEMLIST_JSONLD);
  });
});
