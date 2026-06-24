import 'server-only';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/lib/seo';

/**
 * Resolve the active request locale from the `x-locale` header set by the
 * locale-routing middleware. Server-only — used by the root layout and by each
 * public page's generateMetadata to emit locale-correct canonical + hreflang.
 */
export async function getRequestLocale(): Promise<Locale> {
  const value = (await headers()).get('x-locale');
  return (LOCALES as string[]).includes(value ?? '') ? (value as Locale) : DEFAULT_LOCALE;
}
