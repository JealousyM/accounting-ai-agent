'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';
import { useKSeF } from '@/hooks/useKSeF';
import type { KSeFAdapterType, KSeFEnvironment } from '@/lib/api/ksef';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

export function KSeFSettingsForm() {
  const { locale } = useLocale();
  const t = translations[locale].ksef;
  const { config, isLoadingConfig, updateConfig } = useKSeF();

  const [ksefToken, setKsefToken] = useState('');
  const [ksefNip, setKsefNip] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setKsefToken(config.ksefToken ?? '');
      setKsefNip(config.ksefNip ?? '');
      setNotificationEmail(config.notificationEmail ?? '');
    }
  }, [config]);

  if (isLoadingConfig || !config) {
    return <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-64" />;
  }

  const handleSaveTokenNip = () => {
    setIsSaving(true);
    updateConfig({
      ksefToken: ksefToken || undefined,
      ksefNip: ksefNip || undefined,
    });
    // Reset saving state after a brief delay since updateConfig is fire-and-forget
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.settings}</h3>

      {/* Preferred Adapter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.submissionChannel}
        </label>
        <select
          value={config.preferredAdapter}
          onChange={(e) => updateConfig({ preferredAdapter: e.target.value as KSeFAdapterType })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="wfirma">{t.wfirmaRecommended}</option>
          <option value="direct">{t.directApi}</option>
        </select>
      </div>

      {/* Environment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.environment}
        </label>
        <select
          value={config.environment}
          onChange={(e) => updateConfig({ environment: e.target.value as KSeFEnvironment })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="test">{t.test}</option>
          <option value="demo">{t.demo}</option>
          <option value="production">{t.production}</option>
        </select>
      </div>

      {/* Auto-send toggles */}
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={config.autoSendEnabled}
            onChange={(e) => updateConfig({ autoSendEnabled: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t.autoSend}</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={config.autoSendOnCreate}
            onChange={(e) => updateConfig({ autoSendOnCreate: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            disabled={!config.autoSendEnabled}
          />
          <span className={`text-sm ${config.autoSendEnabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
            {t.autoSendOnCreate}
          </span>
        </label>
      </div>

      {/* Notification toggles */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.notifications}</h4>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={config.notifyOnAccepted}
            onChange={(e) => updateConfig({ notifyOnAccepted: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t.notifyAccepted}</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={config.notifyOnRejected}
            onChange={(e) => updateConfig({ notifyOnRejected: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t.notifyRejected}</span>
        </label>

        {/* Notification Email */}
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t.notificationEmail}
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder={t.notificationEmailPlaceholder}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={!config.notifyOnAccepted && !config.notifyOnRejected}
            />
            <button
              onClick={() => updateConfig({ notificationEmail: notificationEmail || undefined })}
              disabled={!config.notifyOnAccepted && !config.notifyOnRejected}
              className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.saveSettings}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t.notificationEmailHint}
          </p>
        </div>
      </div>

      {/* Token & NIP - only shown when direct adapter is selected */}
      {config.preferredAdapter === 'direct' && (
        <div className="space-y-4 border-t dark:border-gray-700 pt-6">
          <div className="rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">{t.directAdapterNote}</p>
          </div>

          {/* KSeF Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.ksefToken}
            </label>
            <input
              type="password"
              value={ksefToken}
              onChange={(e) => setKsefToken(e.target.value)}
              placeholder={t.ksefTokenPlaceholder}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.ksefTokenHint}</p>
          </div>

          {/* KSeF NIP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.ksefNip}
            </label>
            <input
              type="text"
              value={ksefNip}
              onChange={(e) => setKsefNip(e.target.value)}
              placeholder={t.ksefNipPlaceholder}
              maxLength={10}
              pattern="[0-9]*"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Save button for token/NIP */}
          <button
            onClick={handleSaveTokenNip}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? t.savingSettings : t.saveSettings}
          </button>
        </div>
      )}
    </div>
  );
}
