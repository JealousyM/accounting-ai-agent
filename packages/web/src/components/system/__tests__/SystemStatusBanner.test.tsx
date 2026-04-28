import { render, screen } from '@testing-library/react';
import { SystemStatusBanner } from '../SystemStatusBanner';
import en from '@/i18n/locales/en.json';

const mockSystemHealth = jest.fn();
jest.mock('@/hooks/useSystemHealth', () => ({
  useSystemHealth: () => mockSystemHealth(),
}));

jest.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'en', setLocale: jest.fn() }),
}));

const banner = en.system.banner;

describe('SystemStatusBanner', () => {
  it('renders nothing when status is ok', () => {
    mockSystemHealth.mockReturnValue({ status: 'ok' });
    const { container } = render(<SystemStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders unreachable copy when offline', () => {
    mockSystemHealth.mockReturnValue({ status: 'unreachable' });
    render(<SystemStatusBanner />);
    expect(screen.getByText(banner.unreachable)).toBeInTheDocument();
  });

  it('renders down copy when status=down', () => {
    mockSystemHealth.mockReturnValue({ status: 'down' });
    render(<SystemStatusBanner />);
    expect(screen.getByText(banner.down)).toBeInTheDocument();
  });

  it('prioritizes AI degradation over wFirma when both fail', () => {
    mockSystemHealth.mockReturnValue({
      status: 'degraded',
      snapshot: {
        integrations: { openai: { ok: false }, anthropic: { ok: true }, wfirma: { ok: false } },
      },
    });
    render(<SystemStatusBanner />);
    expect(screen.getByText(banner.degraded.ai)).toBeInTheDocument();
    expect(screen.queryByText(banner.degraded.wfirma)).not.toBeInTheDocument();
  });

  it('shows wFirma copy when only wFirma is down', () => {
    mockSystemHealth.mockReturnValue({
      status: 'degraded',
      snapshot: {
        integrations: { openai: { ok: true }, anthropic: { ok: true }, wfirma: { ok: false } },
      },
    });
    render(<SystemStatusBanner />);
    expect(screen.getByText(banner.degraded.wfirma)).toBeInTheDocument();
  });

  it('uses role=status and aria-live=polite', () => {
    mockSystemHealth.mockReturnValue({ status: 'down' });
    render(<SystemStatusBanner />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });
});
