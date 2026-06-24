import type { MetadataRoute } from 'next';
import {
  PUBLIC_PATHS,
  LOCALES,
  LOCALE_BCP47,
  DEFAULT_LOCALE,
  absoluteUrl,
  localizedPath,
} from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
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
