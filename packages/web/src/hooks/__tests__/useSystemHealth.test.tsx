import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSystemHealth } from '../useSystemHealth';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('useSystemHealth', () => {
  it('returns ok when fetch resolves with status=ok', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok' }),
    });
    const { result } = renderHook(() => useSystemHealth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ok'));
  });

  it('returns degraded when API responds with degraded', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 'degraded', integrations: { openai: { ok: false } } }),
    });
    const { result } = renderHook(() => useSystemHealth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('degraded'));
  });

  it('returns down on fetch rejection', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockRejectedValue(new Error('netfail'));
    const { result } = renderHook(() => useSystemHealth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('down'), { timeout: 5000 });
  });

  it('returns unreachable when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const { result } = renderHook(() => useSystemHealth(), { wrapper });
    expect(result.current.status).toBe('unreachable');
  });
});
