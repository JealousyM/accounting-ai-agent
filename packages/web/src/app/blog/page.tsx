import { getRequestLocale } from '@/lib/locale.server';
import { LocaleLink } from '@/components/LocaleLink';
import { getAllPublished } from '@/lib/blog/content';

const HEADING: Record<string, string> = { pl: 'Blog', en: 'Blog', ru: 'Блог' };
const EMPTY: Record<string, string> = {
  pl: 'Wkrótce pojawią się tu pierwsze artykuły.',
  en: 'Articles are coming soon.',
  ru: 'Скоро здесь появятся первые статьи.',
};

export default async function BlogIndexPage() {
  const locale = await getRequestLocale();
  const posts = getAllPublished(locale);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{HEADING[locale]}</h1>

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
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {p.category}
              </span>
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
