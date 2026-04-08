'use client';

import { useLocale } from '@/contexts/LocaleContext';
import type { UserDeepStats } from '@/lib/api/admin';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface BehaviorPanelProps {
  stats: UserDeepStats;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-900 dark:text-white font-medium">{value}</span>
    </div>
  );
}

function ChannelBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        active
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
      }`}
    >
      {label}
    </span>
  );
}

export function BehaviorPanel({ stats }: BehaviorPanelProps) {
  const { locale } = useLocale();
  const t = translations[locale].admin.userDetail.stats;

  const { channels, tts, memories, lastActivity } = stats;

  const fmt = (date: string | null) =>
    date ? new Date(date).toLocaleString() : t.noActivity;

  return (
    <section className="border rounded-lg p-6 bg-white dark:bg-gray-800 space-y-5">
      {/* Channels */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          {t.channels}
        </h2>
        <div className="flex flex-wrap gap-2 mb-2">
          <ChannelBadge active label={t.web} />
          <ChannelBadge active={channels.telegram.active} label={t.telegram} />
        </div>
        {channels.telegram.active && channels.telegram.linkedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t.telegramLinkedAt}: {new Date(channels.telegram.linkedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* TTS */}
      <div className="border-t pt-4 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{t.tts}</h2>
        <div className="space-y-1">
          <Row
            label={t.ttsCharacters}
            value={new Intl.NumberFormat().format(tts.charactersUsed)}
          />
          <Row label={t.ttsCost} value={`$${tts.costUsd.toFixed(4)}`} />
        </div>
      </div>

      {/* Memories */}
      <div className="border-t pt-4 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          {t.memories}
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          Total: <span className="font-semibold">{memories.total}</span>
        </p>
        {memories.byCategory.length > 0 && (
          <ul className="space-y-1">
            {memories.byCategory.map(({ category, count }) => (
              <li
                key={category}
                className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300"
              >
                <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Last activity */}
      <div className="border-t pt-4 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          Last activity
        </h2>
        <div className="space-y-1">
          <Row label={t.lastConversation} value={fmt(lastActivity.lastConversationAt)} />
          <Row label={t.lastToolCall} value={fmt(lastActivity.lastToolCallAt)} />
        </div>
      </div>
    </section>
  );
}
