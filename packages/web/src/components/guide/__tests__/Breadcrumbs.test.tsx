import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from '../Breadcrumbs';

// Breadcrumbs renders LocaleLink, which reads the active locale via useLocale.
// Pin it to the default (Polish, unprefixed) so internal hrefs stay canonical.
jest.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'pl', setLocale: jest.fn() }),
}));

describe('Breadcrumbs', () => {
  it('renders all items with separators', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Guide', href: '/guide' },
          { label: 'KSeF', href: '/guide/ksef' },
          { label: 'Get tokens' },
        ]}
      />,
    );
    expect(screen.getByText('Guide').closest('a')).toHaveAttribute('href', '/guide');
    expect(screen.getByText('KSeF').closest('a')).toHaveAttribute('href', '/guide/ksef');
    expect(screen.getByText('Get tokens').tagName).toBe('SPAN');
  });
});
