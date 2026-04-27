'use client';
import { useLocale } from '@/contexts/LocaleContext';
import {
  GuidePageLayout,
  GuideStep,
  GuideScreenshot,
  GuideCallout,
  GuideExternalLink,
} from '@/components/guide';
import en from '@/i18n/locales/en.json';
import pl from '@/i18n/locales/pl.json';
import ru from '@/i18n/locales/ru.json';

const translations = { en, pl, ru };

export default function GetApiCredentialsPage() {
  const { locale } = useLocale();
  const guide = translations[locale].guide;
  const topic = guide.topics.wfirma;
  const article = topic.articles.getApiCredentials;

  return (
    <GuidePageLayout
      title={article.title}
      summary={article.summary}
      breadcrumbs={[
        { label: guide.breadcrumbHome, href: '/guide' },
        { label: topic.title, href: '/guide/wfirma' },
        { label: article.title },
      ]}
    >
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{article.intro}</p>

      {article.steps.map((step, i) => {
        const stepLinks = (step as { links?: { label: string; href: string }[] }).links;
        return (
          <GuideStep key={i} number={i + 1} title={step.title}>
            <p>{step.body}</p>
            {stepLinks && stepLinks.length > 0 && (
              <ul className="space-y-1.5 mt-1">
                {stepLinks.map((link, j) => (
                  <li key={j}>
                    <GuideExternalLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            )}
            {step.screenshot && (
              <GuideScreenshot
                src={step.screenshot.src}
                alt={step.screenshot.alt}
                caption={step.screenshot.caption}
                placeholderHint={step.screenshot.placeholderHint}
              />
            )}
            {i === 2 && (
              <GuideCallout
                variant={article.callouts.secretSafety.variant as 'info' | 'warning' | 'tip'}
                title={article.callouts.secretSafety.title}
                body={article.callouts.secretSafety.body}
              />
            )}
          </GuideStep>
        );
      })}

      <section className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{article.links.title}</h2>
        <ul className="space-y-2">
          {(['wfirma', 'wfirmaSignIn', 'wfirmaApiDocs', 'appCredentials'] as const).map((key) => {
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
