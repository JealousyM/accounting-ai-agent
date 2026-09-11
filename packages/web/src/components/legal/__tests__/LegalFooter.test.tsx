import { render } from '@testing-library/react';
import { LegalFooter } from '../LegalFooter';
import { MICODE_LINKS } from '@/lib/external-links';

jest.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'pl', setLocale: jest.fn() }),
}));

describe('LegalFooter backlinks', () => {
  it('carries the same followed MICODE backlinks as the landing footer', () => {
    const { container } = render(<LegalFooter />);
    for (const link of MICODE_LINKS) {
      const anchor = container.querySelector(`a[href="${link.url}"]`);
      expect(anchor).not.toBeNull();
      expect(anchor).toHaveAttribute('target', '_blank');
      expect(anchor!.getAttribute('rel')).toContain('noopener');
      expect(anchor!.getAttribute('rel')).not.toContain('nofollow');
    }
  });

  it('links to the internal products page', () => {
    const { container } = render(<LegalFooter />);
    expect(container.querySelector('a[href="/products"]')).not.toBeNull();
  });
});
