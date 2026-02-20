'use client';

import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKSeF } from '@/hooks/useKSeF';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

interface KSeFBulkSendDialogProps {
  invoiceIds: string[];
  open: boolean;
  onClose: () => void;
}

export function KSeFBulkSendDialog({ invoiceIds, open, onClose }: KSeFBulkSendDialogProps) {
  const { bulkSend, isSending, lastBulkResult } = useKSeF();
  const [continueOnError, setContinueOnError] = useState(true);
  const { locale } = useLocale();
  const t = translations[locale].ksef;

  if (!open) return null;

  const handleSend = () => {
    bulkSend(invoiceIds, continueOnError);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.bulkSend}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t.bulkSendCount.replace('{count}', String(invoiceIds.length))}
        </p>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={continueOnError}
            onChange={(e) => setContinueOnError(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t.continueOnError}</span>
        </label>

        {lastBulkResult && (
          <div className="text-sm p-3 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
            <p>{`${t.total}: ${lastBulkResult.total} | ${t.successful}: ${lastBulkResult.successful} | ${t.failed}: ${lastBulkResult.failed}`}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{t.cancel}</Button>
          <Button onClick={handleSend} disabled={isSending}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? t.sendingProgress : t.sendToKsef}
          </Button>
        </div>
      </div>
    </div>
  );
}
