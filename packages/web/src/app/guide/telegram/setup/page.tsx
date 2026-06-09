'use client';
import { useLocale } from '@/contexts/LocaleContext';
import {
  GuidePageLayout,
  GuideStep,
  GuideCallout,
  GuideExternalLink,
} from '@/components/guide';
import en from '@/i18n/locales/en.json';
import pl from '@/i18n/locales/pl.json';
import ru from '@/i18n/locales/ru.json';

const translations = { en, pl, ru };

export default function TelegramSetupArticlePage() {
  const { locale } = useLocale();
  const guide = translations[locale].guide;
  const topic = guide.topics.telegram;
  const article = topic.articles.setup;

  return (
    <GuidePageLayout
      title={article.title}
      summary={article.summary}
      breadcrumbs={[
        { label: guide.breadcrumbHome, href: '/guide' },
        { label: topic.title, href: '/guide/telegram' },
        { label: article.title },
      ]}
    >
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{article.intro}</p>

      {article.steps.map((step, i) => (
        <GuideStep key={i} number={i + 1} title={step.title}>
          <p>{step.body}</p>
          {i === 1 && (
            <GuideCallout
              variant={article.callouts.codeExpiry.variant as 'warning'}
              title={article.callouts.codeExpiry.title}
              body={article.callouts.codeExpiry.body}
            />
          )}
        </GuideStep>
      ))}

      <section className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {article.links.title}
        </h2>
        <ul className="space-y-2">
          {(['setupWizard', 'telegram'] as const).map((key) => {
            const link = article.links[key];
            return (
              <li key={key}>
                <GuideExternalLink href={link.href} label={link.label} />
              </li>
            );
          })}
        </ul>
      </section>
    </GuidePageLayout>
  );
}
