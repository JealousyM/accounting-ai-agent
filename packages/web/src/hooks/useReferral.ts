'use client';

import { useState, useEffect, useCallback } from 'react';
import { getReferralInfo, getReferralStats, type ReferralInfo, type ReferralStats } from '@/lib/api/referral';

export function useReferral() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [infoData, statsData] = await Promise.all([getReferralInfo(), getReferralStats()]);
      setInfo(infoData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { info, stats, isLoading, error, refresh: fetchData };
}
