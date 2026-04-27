import { render, screen } from '@testing-library/react';
import { GuideCallout } from '../GuideCallout';

describe('GuideCallout', () => {
  it.each(['info', 'warning', 'tip'] as const)('renders %s variant with title and body', (variant) => {
    render(<GuideCallout variant={variant} title="Heads up" body="Some text" />);
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Some text')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveAttribute('data-variant', variant);
  });
});
