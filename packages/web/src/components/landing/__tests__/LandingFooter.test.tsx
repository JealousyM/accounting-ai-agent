import { render, screen } from '@testing-library/react';
import { LandingFooter } from '../LandingFooter';
import { MICODE_LINKS } from '@/lib/external-links';

// LandingFooter renders LocaleLink, which reads the active locale via useLocale.
// Pin it to the default (Polish, unprefixed) so internal hrefs stay canonical.
jest.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'pl', setLocale: jest.fn() }),
}));

describe('LandingFooter backlinks', () => {
  it('links out to every MICODE property', () => {
    const { container } = render(<LandingFooter />);
    for (const link of MICODE_LINKS) {
      expect(container.querySelector(`a[href="${link.url}"]`)).not.toBeNull();
    }
  });

  it('opens them in a new tab without leaking the opener, and lets them be followed', () => {
    const { container } = render(<LandingFooter />);
    for (const link of MICODE_LINKS) {
      const anchor = container.querySelector(`a[href="${link.url}"]`)!;
      expect(anchor).toHaveAttribute('target', '_blank');
      expect(anchor.getAttribute('rel')).toContain('noopener');
      // These are our own sites — link equity must flow, so never nofollow them.
      expect(anchor.getAttribute('rel')).not.toContain('nofollow');
    }
  });

  it('points at the internal products page too', () => {
    render(<LandingFooter />);
    const internal = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href') === '/products');
    expect(internal).toBeDefined();
  });
});
