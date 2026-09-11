import { render } from '@testing-library/react';
import { GoogleAnalytics } from '../GoogleAnalytics';

// Mutable so a test can simulate a client-side navigation between renders.
const pathname = { current: '/' };
jest.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

// next/script would try to inject real <script> tags into jsdom; the tags
// themselves are not what this test is about.
jest.mock('next/script', () => ({ __esModule: true, default: () => null }));

// The measurement id is captured when @/lib/gtag is first evaluated, and CI has
// no .env file, so pin it from a hoisted factory that still returns the real module.
jest.mock('@/lib/gtag', () => {
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST12345';
  return jest.requireActual('@/lib/gtag');
});

// Mutable so a test can simulate the visitor accepting analytics after load.
const analyticsAllowed = { current: true };
jest.mock('@/contexts/CookieConsentContext', () => ({
  useCookieConsent: () => ({
    state: {
      hasConsented: true,
      preferences: { necessary: true, analytics: analyticsAllowed.current },
    },
  }),
}));

describe('GoogleAnalytics page views', () => {
  beforeEach(() => {
    pathname.current = '/';
    analyticsAllowed.current = true;
    window.gtag = jest.fn();
  });

  const configCalls = () =>
    (window.gtag as unknown as jest.Mock).mock.calls.filter((c) => c[0] === 'config');

  it('leaves the first page view to the gtag init snippet', () => {
    render(<GoogleAnalytics />);
    expect(configCalls()).toHaveLength(0);
  });

  it('sends one page view per client-side navigation', () => {
    const { rerender } = render(<GoogleAnalytics />);
    pathname.current = '/pricing';
    rerender(<GoogleAnalytics />);

    expect(configCalls()).toHaveLength(1);
    expect(configCalls()[0][2]).toEqual({ page_path: '/pricing' });
  });

  it('does not double-count the current page when consent arrives after load', () => {
    analyticsAllowed.current = false;
    const { rerender } = render(<GoogleAnalytics />);

    // Visitor accepts analytics cookies: the gtag snippet mounts now and reports
    // this page itself, so the effect must stay quiet.
    analyticsAllowed.current = true;
    rerender(<GoogleAnalytics />);

    expect(configCalls()).toHaveLength(0);
  });
});
