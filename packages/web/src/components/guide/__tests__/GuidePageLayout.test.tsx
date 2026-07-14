import { render } from '@testing-library/react';
import { GuidePageLayout } from '../GuidePageLayout';

// GuidePageLayout reads the active locale (LocaleLink + switcher). Pin them so
// the component renders without the full provider tree.
jest.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'pl', setLocale: jest.fn() }),
}));
jest.mock('@/hooks/useLocalizedHref', () => ({
  useLocaleSwitcher: () => jest.fn(),
  useLocalizedHref: () => (href: string) => href,
}));

function ldScripts(): string[] {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
    (s) => s.innerHTML,
  );
}

describe('GuidePageLayout HowTo structured data', () => {
  it('emits HowTo JSON-LD with the steps when howToSteps is provided', () => {
    render(
      <GuidePageLayout
        title="Get KSeF tokens"
        summary="How to get tokens."
        breadcrumbs={[{ label: 'Guide', href: '/guide' }, { label: 'KSeF' }]}
        howToSteps={[
          { name: 'Log in', text: 'Sign in.' },
          { name: 'Generate', text: 'Create token.' },
        ]}
      >
        <p>content</p>
      </GuidePageLayout>,
    );
    const howTo = ldScripts().find((s) => s.includes('"HowTo"'));
    expect(howTo).toBeDefined();
    expect(howTo).toContain('Get KSeF tokens');
    expect(howTo).toContain('HowToStep');
    expect(howTo).toContain('Log in');
  });

  it('emits no HowTo JSON-LD when howToSteps is omitted', () => {
    render(
      <GuidePageLayout
        title="Overview"
        breadcrumbs={[{ label: 'Guide', href: '/guide' }, { label: 'KSeF' }]}
      >
        <p>content</p>
      </GuidePageLayout>,
    );
    expect(ldScripts().some((s) => s.includes('"HowTo"'))).toBe(false);
  });
});
