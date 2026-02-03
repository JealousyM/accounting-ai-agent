'use client';

import React, { useState } from 'react';
import { Menu, MessageSquarePlus, Bot, Globe, User, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ProfileEditModal, type ProfileTranslations, ApiCredentialsModal, type ApiCredentialsTranslations } from '@/components/profile';
import { HelpButton, HelpPanel, type HelpPanelTranslations } from '@/components/help';
import { ConversationDetail } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { CurrentPlanBadge } from '@/components/subscription';
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
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

const localeLabels: Record<Locale, string> = {
  en: 'EN',
  pl: 'PL',
  ru: 'RU',
};

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
  locale,
  onLocaleChange,
}: ChatHeaderProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isApiCredentialsModalOpen, setIsApiCredentialsModalOpen] = useState(false);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const { logout, isAdmin } = useAuth();

  const cycleLocale = () => {
    const locales: Locale[] = ['en', 'pl', 'ru'];
    const currentIndex = locales.indexOf(locale);
    const nextIndex = (currentIndex + 1) % locales.length;
    onLocaleChange(locales[nextIndex]);
  };

  return (
    <>
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
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-none">
                {conversation?.title || translations.defaultTitle}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {translations.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Current plan badge */}
          <CurrentPlanBadge className="hidden sm:flex" />

          {/* Help button */}
          <HelpButton onClick={() => setIsHelpPanelOpen(true)} />

          {/* TTS Settings */}
          <TTSSettingsButton translations={ttsTranslations} />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Profile button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <User className="w-4 h-4" />
          </Button>

          {/* Admin button (only for admins) */}
          {isAdmin && (
            <Link href="/admin">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                title="Admin"
              >
                <Shield className="w-4 h-4" />
              </Button>
            </Link>
          )}

          {/* Language switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleLocale}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">{localeLabels[locale]}</span>
          </Button>

          {/* New chat button (desktop) */}
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            disabled={isCreatingConversation}
            className="hidden sm:flex items-center gap-2"
          >
            <MessageSquarePlus className="w-4 h-4" />
            {translations.newChat}
          </Button>

          {/* Logout button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="flex items-center gap-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            title={translations.logout}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        translations={profileTranslations}
        onOpenApiCredentials={() => setIsApiCredentialsModalOpen(true)}
      />

      {/* API Credentials Modal */}
      <ApiCredentialsModal
        open={isApiCredentialsModalOpen}
        onOpenChange={setIsApiCredentialsModalOpen}
        translations={apiCredentialsTranslations}
      />

      {/* Help Panel */}
      <HelpPanel
        open={isHelpPanelOpen}
        onClose={() => setIsHelpPanelOpen(false)}
        initialCategory="aiChat"
        translations={helpTranslations}
      />
    </>
  );
}
