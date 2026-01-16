'use client';

import React from 'react';
import { Menu, MessageSquarePlus, Bot, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationDetail } from '@/hooks/useChat';

type Locale = 'en' | 'pl' | 'ru';

interface HeaderTranslations {
  defaultTitle: string;
  subtitle: string;
  newChat: string;
}

interface ChatHeaderProps {
  conversation: ConversationDetail | undefined;
  onMenuClick: () => void;
  onNewChat: () => void;
  isCreatingConversation: boolean;
  translations: HeaderTranslations;
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
  locale,
  onLocaleChange,
}: ChatHeaderProps) {
  const cycleLocale = () => {
    const locales: Locale[] = ['en', 'pl', 'ru'];
    const currentIndex = locales.indexOf(locale);
    const nextIndex = (currentIndex + 1) % locales.length;
    onLocaleChange(locales[nextIndex]);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
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
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-none">
              {conversation?.title || translations.defaultTitle}
            </h1>
            <p className="text-xs text-gray-500">
              {translations.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <Button
          variant="ghost"
          size="sm"
          onClick={cycleLocale}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
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
      </div>
    </div>
  );
}
