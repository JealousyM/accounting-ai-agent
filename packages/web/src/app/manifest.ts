import type { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — AI dla księgowości`,
    short_name: SITE_NAME,
    description:
      'Asystent księgowy oparty na AI dla polskich firm. Integracja z wFirma i KSeF.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    lang: 'pl',
    icons: [
      { src: '/logo.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
    ],
  };
}
