'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth, HealthSnapshot } from '@/lib/api/health';
import { useOnlineStatus } from './useOnlineStatus';

export type SystemStatus = HealthSnapshot['status'] | 'unreachable';

const POLL_MS = Number(process.env.NEXT_PUBLIC_HEALTH_POLL_MS) || 30_000;

export function useSystemHealth(): {
  status: SystemStatus;
  snapshot: HealthSnapshot | undefined;
  browserOnline: boolean;
} {
  const browserOnline = useOnlineStatus();

  const result = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: Math.floor(POLL_MS * 0.83),
    enabled: browserOnline,
  });

  const status: SystemStatus = !browserOnline
    ? 'unreachable'
    : result.isError
    ? 'down'
    : (result.data?.status ?? 'ok');

  return { status, snapshot: result.data, browserOnline };
}
