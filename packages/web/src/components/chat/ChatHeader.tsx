'use client';

import { Menu, MessageSquarePlus, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { type ProfileTranslations, type ApiCredentialsTranslations, type TelegramLinkTranslations } from '@/components/profile';
import { type HelpPanelTranslations } from '@/components/help';
import { ConversationDetail } from '@/hooks/useChat';
import { CurrentPlanBadge } from '@/components/subscription';
import { HeaderUserMenu } from '@/components/layout/HeaderUserMenu';
import { TTSSettingsButton } from './TTSSettingsButton';

type Locale = 'en' | 'pl' | 'ru';

interface HeaderTranslations {
  defaultTitle: string;
  subtitle: string;
  newChat: string;
  logout: string;
}

interface TTSTranslations {
  settings: string;
  enabled: string;
  enabledHint: string;
  autoSpeak: string;
  autoSpeakHint: string;
  rate: string;
  rateSlow: string;
  rateNormal: string;
  rateFast: string;
  notSupported: string;
}

interface SharedTranslations {
  share: string;
  unshare: string;
  sharedBadge: string;
  noOrganization: string;
}

interface ChatHeaderProps {
  conversation: ConversationDetail | undefined;
  onMenuClick: () => void;
  onNewChat: () => void;
  isCreatingConversation: boolean;
  translations: HeaderTranslations;
  profileTranslations: ProfileTranslations;
  apiCredentialsTranslations: ApiCredentialsTranslations;
  helpTranslations: HelpPanelTranslations;
  ttsTranslations: TTSTranslations;
  sharedTranslations?: SharedTranslations;
  telegramTranslations?: TelegramLinkTranslations;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onShareToggle?: () => void;
  isShared?: boolean;
  isOwner?: boolean;
}

export function ChatHeader({
  conversation,
  onMenuClick,
  onNewChat,
  isCreatingConversation,
  translations,
  profileTranslations,
  apiCredentialsTranslations,
  helpTranslations,
  ttsTranslations,
  sharedTranslations,
  telegramTranslations,
  locale,
  onLocaleChange,
  onShareToggle,
  isShared,
  isOwner,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Title */}
        <div className="flex items-center gap-2">
          <Link href="/" className="shrink-0" aria-label="eKsięgowy AI home">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo, no optimization benefit */}
            <img
              src="/logo.svg"
              alt="eKsięgowy AI"
              width={56}
              height={56}
            />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-none">
                {conversation?.title || translations.defaultTitle}
              </h1>
              {isShared && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {sharedTranslations?.sharedBadge || 'Shared'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {translations.subtitle}
            </p>
          </div>
          {/* Share toggle button (only for conversation owner) */}
          {isOwner && conversation && onShareToggle && sharedTranslations && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShareToggle}
              className={`ml-1 px-2 ${
                isShared
                  ? 'text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              title={isShared ? sharedTranslations.unshare : sharedTranslations.share}
            >
              <Share2 className={`w-4 h-4 ${isShared ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* New chat button - icon only on mobile, with text on desktop */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNewChat}
          disabled={isCreatingConversation}
          className="flex items-center gap-2 px-2 sm:px-3"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">{translations.newChat}</span>
        </Button>

        {/* Shared user-controls cluster — chat-only controls injected via slots */}
        <HeaderUserMenu
          locale={locale}
          onLocaleChange={onLocaleChange}
          logoutLabel={translations.logout}
          profileTranslations={profileTranslations}
          apiCredentialsTranslations={apiCredentialsTranslations}
          helpTranslations={helpTranslations}
          telegramTranslations={telegramTranslations}
          desktopExtras={
            <>
              <CurrentPlanBadge className="hidden sm:flex" />
              <div className="hidden sm:block">
                <TTSSettingsButton translations={ttsTranslations} />
              </div>
            </>
          }
          mobileExtras={
            <div className="px-4 py-1">
              <TTSSettingsButton translations={ttsTranslations} />
            </div>
          }
        />
      </div>
    </div>
  );
}
