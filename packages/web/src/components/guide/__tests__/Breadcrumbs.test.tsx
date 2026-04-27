import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from '../Breadcrumbs';

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
