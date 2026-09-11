import sitemap from './sitemap';
import { SITE_URL } from '@/lib/seo';

describe('sitemap', () => {
  const entries = sitemap();

  it('lists the products page with the full hreflang trio and x-default', () => {
    const products = entries.find((e) => e.url === `${SITE_URL}/products`);
    expect(products).toBeDefined();
    expect(products!.alternates?.languages).toEqual({
      'pl-PL': `${SITE_URL}/products`,
      'en-US': `${SITE_URL}/en/products`,
      'ru-RU': `${SITE_URL}/ru/products`,
      'x-default': `${SITE_URL}/products`,
    });
  });
});
