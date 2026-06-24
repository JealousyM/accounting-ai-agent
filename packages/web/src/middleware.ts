import { NextRequest, NextResponse } from 'next/server';

/**
 * Locale routing middleware (localePrefix: as-needed).
 *
 * Polish is the default and is served on unprefixed URLs (/pricing). English and
 * Russian are served on prefixed URLs (/en/pricing, /ru/pricing); we rewrite
 * those internally to the existing flat page tree and pass the active locale to
 * the server via the `x-locale` request header (read by the root layout and by
 * each page's generateMetadata). A `NEXT_LOCALE` cookie persists the choice for
 * client-side navigation.
 *
 * The canonical Polish URLs are left completely untouched, so existing indexed
 * pages keep their URLs. `/pl/*` is 308-redirected to the unprefixed form to
 * avoid duplicate content.
 */

const DEFAULT_LOCALE = 'pl';
const PREFIXED_LOCALES = ['en', 'ru'];

function withLocaleHeader(req: NextRequest, locale: string, rewriteTo?: URL) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-locale', locale);

  const res = rewriteTo
    ? NextResponse.rewrite(rewriteTo, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });

  if (locale !== DEFAULT_LOCALE) {
    res.cookies.set('NEXT_LOCALE', locale, { path: '/', sameSite: 'lax' });
  }
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segments = pathname.split('/');
  const maybeLocale = segments[1];

  // /en/* or /ru/*  ->  rewrite to the flat (unprefixed) path, signal locale.
  if (PREFIXED_LOCALES.includes(maybeLocale)) {
    const rest = '/' + segments.slice(2).join('/');
    const url = req.nextUrl.clone();
    url.pathname = rest === '/' ? '/' : rest.replace(/\/$/, '');
    return withLocaleHeader(req, maybeLocale, url);
  }

  // /pl/*  ->  308-redirect to the canonical unprefixed URL (no duplicate content).
  if (maybeLocale === DEFAULT_LOCALE) {
    const rest = '/' + segments.slice(2).join('/');
    const url = req.nextUrl.clone();
    url.pathname = rest === '/' ? '/' : rest.replace(/\/$/, '');
    return NextResponse.redirect(url, 308);
  }

  // Unprefixed (Polish default): pass through, but tell the server it's pl.
  return withLocaleHeader(req, DEFAULT_LOCALE);
}

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
