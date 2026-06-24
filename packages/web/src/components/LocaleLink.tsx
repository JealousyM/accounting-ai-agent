'use client';

import Link from 'next/link';
import { forwardRef, type ComponentProps } from 'react';
import { useLocalizedHref } from '@/hooks/useLocalizedHref';

type LocaleLinkProps = ComponentProps<typeof Link>;

/**
 * Drop-in replacement for `next/link` for PUBLIC/marketing pages that prefixes
 * internal string hrefs with the active locale (`/pricing` -> `/en/pricing`),
 * so navigating within the EN/RU site keeps the user in their language and
 * crawlers can reach the localized URLs.
 *
 * Only string hrefs beginning with `/` are localized; external links, hashes
 * (`#features`) and `UrlObject` hrefs pass through untouched.
 *
 * Do NOT use inside the authenticated app — those routes stay locale-agnostic.
 */
export const LocaleLink = forwardRef<HTMLAnchorElement, LocaleLinkProps>(
  function LocaleLink({ href, ...rest }, ref) {
    const localize = useLocalizedHref();
    const localizedHref =
      typeof href === 'string' && href.startsWith('/') ? localize(href) : href;
    return <Link ref={ref} href={localizedHref} {...rest} />;
  },
);
