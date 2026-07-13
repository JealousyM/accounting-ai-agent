'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { localizedPath, splitLocale, type Locale } from '@/lib/seo';

/**
 * Locale-aware link/navigation helpers for the public (pre-login) site.
 *
 * Because the locale-routing middleware rewrites `/en/*` and `/ru/*` onto the
 * flat page tree, `usePathname()` always returns the UNPREFIXED canonical path
 * (e.g. `/pricing` even when the visible URL is `/en/pricing`). That makes it
 * the perfect base for building locale-prefixed targets.
 *
 *   const localize = useLocalizedHref();
 *   <Link href={localize('/pricing')}>…</Link>   // -> /en/pricing on the EN site
 *
 *   const switchLocale = useLocaleSwitcher();
 *   switchLocale('ru');                           // navigates to the RU URL of the current page
 */
export function useLocalizedHref() {
  const { locale } = useLocale();

  return useCallback(
    (path: string) => localizedPath(path, locale),
    [locale],
  );
}

/**
 * Returns a callback that switches the active locale by NAVIGATING to the
 * localized URL of the current page, so the address bar reflects the language
 * (and the server re-renders locale-correct metadata) rather than only flipping
 * client state.
 */
export function useLocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { setLocale } = useLocale();

  return useCallback(
    (newLocale: Locale) => {
      // `usePathname()` may return either the canonical path (`/blog`) or the
      // locale-prefixed one (`/ru/blog`) depending on the route. Strip any
      // existing locale prefix first, otherwise switching from an already
      // prefixed URL would stack prefixes (`/ru/blog` -> `/en/ru/blog`).
      const { path } = splitLocale(pathname || '/');
      const target = localizedPath(path, newLocale);
      setLocale(newLocale);
      router.push(target);
    },
    [pathname, router, setLocale],
  );
}
