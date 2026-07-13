import { getRequestLocale } from '@/lib/locale.server';
import { LocaleLink } from '@/components/LocaleLink';
import { getAllPublished, getAllPosts } from '@/lib/blog/content';

/** In local development (and any non-production build) we also show drafts, with
 *  a visible badge, so articles can be reviewed before being published. */
const PREVIEW = process.env.NODE_ENV !== 'production';

const HEADING: Record<string, string> = { pl: 'Blog', en: 'Blog', ru: 'Блог' };
const EMPTY: Record<string, string> = {
  pl: 'Wkrótce pojawią się tu pierwsze artykuły.',
  en: 'Articles are coming soon.',
  ru: 'Скоро здесь появятся первые статьи.',
};
const PREVIEW_NOTE: Record<string, string> = {
  pl: 'Tryb podglądu (dev) — widzisz też szkice. Na produkcji pokazywane są tylko opublikowane.',
  en: 'Preview mode (dev) — drafts are shown too. Production shows only published articles.',
  ru: 'Режим предпросмотра (dev) — показаны и черновики. В проде видны только опубликованные.',
};

export default async function BlogIndexPage() {
  const locale = await getRequestLocale();
  const posts = PREVIEW ? getAllPosts(locale) : getAllPublished(locale);
  const hasDrafts = posts.some((p) => p.status === 'draft');

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{HEADING[locale]}</h1>

      {PREVIEW && hasDrafts && (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {PREVIEW_NOTE[locale]}
        </p>
      )}

      {posts.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{EMPTY[locale]}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <LocaleLink
              key={`${p.locale}-${p.slug}`}
              href={`/blog/${p.slug}`}
              className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  {p.category}
                </span>
                {PREVIEW && p.status === 'draft' && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 rounded px-1.5 py-0.5">
                    szkic
                  </span>
                )}
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white mt-1">{p.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                {p.description}
              </p>
            </LocaleLink>
          ))}
        </div>
      )}
    </main>
  );
}
