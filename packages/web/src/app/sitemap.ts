import type { MetadataRoute } from 'next';
import {
  PUBLIC_PATHS,
  LOCALES,
  LOCALE_BCP47,
  DEFAULT_LOCALE,
  absoluteUrl,
  localizedPath,
  type Locale,
} from '@/lib/seo';
import { getAllPublishedAllLocales } from '@/lib/blog/content';

function staticEntries(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => {
    const languages: Record<string, string> = {};
    for (const l of LOCALES) {
      languages[LOCALE_BCP47[l]] = absoluteUrl(localizedPath(path, l));
    }
    languages['x-default'] = absoluteUrl(localizedPath(path, DEFAULT_LOCALE));

    return {
      url: absoluteUrl(path),
      changeFrequency: path === '/' ? 'weekly' : 'monthly',
      priority: path === '/' ? 1 : path === '/pricing' ? 0.9 : 0.7,
      alternates: { languages },
    };
  });
}

/** Published blog articles, grouped by translationKey so each hreflang set only
 *  lists locales that actually have a published translation. Never throws — a
 *  content read error degrades to no blog entries rather than a broken sitemap. */
function blogEntries(): MetadataRoute.Sitemap {
  try {
    const byKey = new Map<string, { locale: Locale; slug: string }[]>();
    for (const p of getAllPublishedAllLocales()) {
      const arr = byKey.get(p.translationKey) ?? [];
      arr.push({ locale: p.locale, slug: p.slug });
      byKey.set(p.translationKey, arr);
    }

    const entries: MetadataRoute.Sitemap = [];
    for (const variants of byKey.values()) {
      const primary = variants.find((v) => v.locale === DEFAULT_LOCALE) ?? variants[0];
      const languages: Record<string, string> = {};
      for (const v of variants) {
        languages[LOCALE_BCP47[v.locale]] = absoluteUrl(localizedPath(`/blog/${v.slug}`, v.locale));
      }
      languages['x-default'] = absoluteUrl(localizedPath(`/blog/${primary.slug}`, primary.locale));
      entries.push({
        url: absoluteUrl(localizedPath(`/blog/${primary.slug}`, primary.locale)),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: { languages },
      });
    }
    return entries;
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [...staticEntries(), ...blogEntries()];
}
