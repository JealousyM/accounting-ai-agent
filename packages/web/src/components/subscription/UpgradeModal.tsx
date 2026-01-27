'use client';

import { X, Crown, Key, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'llm_key_required' | 'limit_reached' | 'wfirma_limit';
}

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const { locale } = useLocale();
  const t = translations[locale].subscription.upgrade;
  const tSub = translations[locale].subscription;

  if (!isOpen) return null;

  const getContent = () => {
    switch (reason) {
      case 'llm_key_required':
        return {
          title: t.apiKeyRequired,
          description: t.apiKeyRequiredDesc,
          primaryAction: {
            label: t.addApiKey,
            href: '/chat?settings=credentials',
          },
          secondaryAction: {
            label: tSub.upgradeToPro,
            href: '/pricing',
          },
        };
      case 'limit_reached':
        return {
          title: t.limitReached,
          description: t.limitReachedDesc,
          primaryAction: {
            label: t.addOwnKey,
            href: '/chat?settings=credentials',
          },
          secondaryAction: {
            label: t.viewSubscription,
            href: '/subscription',
          },
        };
      case 'wfirma_limit':
        return {
          title: t.wfirmaLimit,
          description: t.wfirmaLimitDesc,
          primaryAction: {
            label: tSub.upgradeToPro,
            href: '/pricing',
          },
          secondaryAction: {
            label: t.viewSubscription,
            href: '/subscription',
          },
        };
    }
  };

  const content = getContent();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
          {reason === 'llm_key_required' ? (
            <Key className="w-6 h-6 text-blue-600" />
          ) : (
            <Crown className="w-6 h-6 text-blue-600" />
          )}
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{content.title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{content.description}</p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={content.primaryAction.href}
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {content.primaryAction.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={content.secondaryAction.href}
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {content.secondaryAction.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
