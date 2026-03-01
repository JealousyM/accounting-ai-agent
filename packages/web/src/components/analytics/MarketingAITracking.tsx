'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { MKTAI_SCRIPT_URL, MKTAI_TRACKING_ID, mktaiEvent } from '@/lib/mktai';

const SCRIPT_ID = 'mktai-tracking-script';

export function MarketingAITracking() {
  const { state } = useCookieConsent();
  const pathname = usePathname();

  const marketingConsented = state.hasConsented && state.preferences.marketing;

  useEffect(() => {
    if (!marketingConsented || !MKTAI_SCRIPT_URL || !MKTAI_TRACKING_ID) return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `${MKTAI_SCRIPT_URL}/api/t/snippet/${MKTAI_TRACKING_ID}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(SCRIPT_ID);
      if (el) el.remove();
    };
  }, [marketingConsented]);

  useEffect(() => {
    if (!marketingConsented || !MKTAI_TRACKING_ID) return;
    mktaiEvent('event', 'pageview', { path: pathname });
  }, [pathname, marketingConsented]);

  return null;
}
