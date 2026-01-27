'use client';

import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocale } from '@/contexts/LocaleContext';
import {
  Crown,
  Zap,
  CreditCard,
  Calendar,
  AlertCircle,
  Loader2,
  ExternalLink,
  Key,
  ToggleLeft,
  ToggleRight,
  XCircle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { UsageMeter } from './UsageMeter';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export function SubscriptionManagement() {
  const { locale } = useLocale();
  const t = translations[locale].subscription.management;
  const {
    subscription,
    isLoading,
    isPro,
    isFree,
    hasOwnLLMKey,
    useOwnLLMKey,
    openBillingPortal,
    toggleLLMPreference,
    cancel,
  } = useSubscription();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      await cancel();
      setShowCancelModal(false);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{t.loadError}</p>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isPro
                  ? 'bg-blue-100 dark:bg-blue-900/50'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              {isPro ? (
                <Crown className="w-6 h-6 text-blue-600" />
              ) : (
                <Zap className="w-6 h-6 text-gray-500" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isPro ? t.proPlan : t.freePlan}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.status}{' '}
                <span
                  className={`font-medium ${
                    subscription.status === 'active'
                      ? 'text-green-600'
                      : subscription.status === 'past_due'
                        ? 'text-yellow-600'
                        : 'text-gray-600'
                  }`}
                >
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              </p>
            </div>
          </div>

          {isFree && (
            <Link
              href="/pricing"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {translations[locale].subscription.upgradeToPro}
            </Link>
          )}
        </div>

        {/* Plan Details */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {isPro && subscription.currentPeriodEnd && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {subscription.cancelAtPeriodEnd ? t.expiresOn : t.renewsOn}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
            </div>
          )}

          {isPro && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.manageBilling}</p>
                <button
                  onClick={() => openBillingPortal()}
                  className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {t.billingPortal} <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cancellation Warning */}
        {subscription.cancelAtPeriodEnd && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              {t.cancelWarning.replace('{date}', formatDate(subscription.currentPeriodEnd))}
            </p>
          </div>
        )}

        {/* Cancel Subscription Button (Pro only, not already canceled) */}
        {isPro && !subscription.cancelAtPeriodEnd && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              <XCircle className="w-4 h-4" />
              {t.cancelSubscription}
            </button>
          </div>
        )}
      </div>

      {/* Usage Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.usage}</h3>

        <div className="space-y-6">
          {/* AI Messages Usage */}
          {subscription.usage.aiMessages.limit && (
            <UsageMeter
              label="AI Messages"
              used={subscription.usage.aiMessages.used}
              limit={subscription.usage.aiMessages.limit}
              resetAt={subscription.usage.aiMessages.resetAt}
            />
          )}

          {/* wFirma Usage */}
          {subscription.usage.wfirmaRequests.limit && (
            <UsageMeter
              label="wFirma Requests"
              used={subscription.usage.wfirmaRequests.used}
              limit={subscription.usage.wfirmaRequests.limit}
              resetAt={subscription.usage.wfirmaRequests.resetAt}
            />
          )}

          {/* No limits message for Pro with own key */}
          {isPro && useOwnLLMKey && hasOwnLLMKey && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.ownKeyNoLimits}
            </p>
          )}
        </div>
      </div>

      {/* LLM Key Preference (Pro only) */}
      {isPro && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{t.apiKeyPreference}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {useOwnLLMKey ? t.usingOwnKey : t.usingIncluded}
                </p>
                {!hasOwnLLMKey && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-2">
                    {t.addKeyHint}
                  </p>
                )}
              </div>
            </div>

            {hasOwnLLMKey && (
              <button
                onClick={() => toggleLLMPreference(!useOwnLLMKey)}
                className="flex items-center gap-2 text-sm"
              >
                {useOwnLLMKey ? (
                  <ToggleRight className="w-10 h-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-10 h-6 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Free Plan Info */}
      {isFree && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t.getMoreWithPro}
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 mb-4">
            <li>• {t.feature500Messages}</li>
            <li>• {t.featureUnlimitedWfirma}</li>
            <li>• {t.featurePrioritySupport}</li>
          </ul>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {t.viewPlans}
          </Link>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isCanceling && setShowCancelModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            {/* Close button */}
            <button
              onClick={() => setShowCancelModal(false)}
              disabled={isCanceling}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>

            {/* Content */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t.cancelTitle}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t.cancelDescription.replace('{date}', formatDate(subscription.currentPeriodEnd))}
            </p>

            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6 pl-4">
              <li>• {t.cancelFeatureCredits}</li>
              <li>• {t.featureUnlimitedWfirma}</li>
              <li>• {t.featurePrioritySupport}</li>
            </ul>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t.cancelContinueFree}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCanceling}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {t.keepSubscription}
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCanceling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.canceling}
                  </>
                ) : (
                  t.yesCancel
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
