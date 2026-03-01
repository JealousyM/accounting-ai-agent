'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { MKTAI_SCRIPT_URL, MKTAI_TRACKING_ID, mktaiEvent } from '@/lib/mktai';

export function MarketingAITracking() {
  const { state } = useCookieConsent();
  const pathname = usePathname();

  const marketingConsented = state.hasConsented && state.preferences.marketing;

  useEffect(() => {
    if (!marketingConsented || !MKTAI_TRACKING_ID) return;
    mktaiEvent('event', 'pageview', { path: pathname });
  }, [pathname, marketingConsented]);

  if (!MKTAI_SCRIPT_URL || !MKTAI_TRACKING_ID || !marketingConsented) {
    return null;
  }

  return (
    <Script
      src={`${MKTAI_SCRIPT_URL}/api/t/snippet/${MKTAI_TRACKING_ID}`}
      strategy="afterInteractive"
    />
  );
}
