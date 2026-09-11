import {
  ORGANIZATION_JSONLD,
  PRODUCTS_ITEMLIST_JSONLD,
  PUBLIC_PATHS,
  SITE_URL,
} from './seo';
import { MICODE_SAME_AS } from './external-links';

describe('Organization JSON-LD', () => {
  it('links the MICODE entity to its other web properties via sameAs', () => {
    expect(ORGANIZATION_JSONLD.sameAs).toEqual([...MICODE_SAME_AS]);
  });
});

describe('PUBLIC_PATHS', () => {
  it('includes the products page so it is indexed and sitemapped', () => {
    expect(PUBLIC_PATHS).toContain('/products');
  });
});

describe('PRODUCTS_ITEMLIST_JSONLD', () => {
  it('is an ItemList of our products, this site first, then the other properties', () => {
    expect(PRODUCTS_ITEMLIST_JSONLD['@type']).toBe('ItemList');
    expect(PRODUCTS_ITEMLIST_JSONLD.itemListElement.map((i) => i.url)).toEqual([
      SITE_URL,
      'https://mi-code.pl',
      'https://ai-budget.pl',
    ]);
  });

  it('numbers the positions from 1 and names every entry', () => {
    PRODUCTS_ITEMLIST_JSONLD.itemListElement.forEach((item, index) => {
      expect(item['@type']).toBe('ListItem');
      expect(item.position).toBe(index + 1);
      expect(item.name).not.toHaveLength(0);
    });
  });
});
