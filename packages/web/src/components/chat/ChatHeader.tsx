'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, MessageSquarePlus, Globe, User, LogOut, Shield, MoreVertical, HelpCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ProfileEditModal, type ProfileTranslations, ApiCredentialsModal, type ApiCredentialsTranslations, type TelegramLinkTranslations } from '@/components/profile';
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
  sharedTranslations,
  telegramTranslations,
  locale,
  onLocaleChange,
  onShareToggle,
  isShared,
  isOwner,
}: ChatHeaderProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isApiCredentialsModalOpen, setIsApiCredentialsModalOpen] = useState(false);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { logout, isAdmin } = useAuth();

  // Close mobile menu on outside click
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMobileMenuOpen]);

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
            <Link href="/" className="shrink-0" aria-label="eKsięgowy AI home">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo, no optimization benefit */}
              <img
                src="/logo.svg"
                alt="eKsięgowy AI"
                width={96}
                height={96}
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
          {/* Current plan badge - desktop only */}
          <CurrentPlanBadge className="hidden sm:flex" />

          {/* Help button - desktop only */}
          <div className="hidden sm:block">
            <HelpButton onClick={() => setIsHelpPanelOpen(true)} />
          </div>

          {/* TTS Settings - desktop only */}
          <div className="hidden sm:block">
            <TTSSettingsButton translations={ttsTranslations} />
          </div>

          {/* Theme toggle - desktop only */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* Language switcher - desktop only */}
          <div className="hidden sm:flex items-center gap-1 text-gray-600 dark:text-gray-400 px-1">
            <Globe className="w-4 h-4" />
            <select
              value={locale}
              onChange={(e) => onLocaleChange(e.target.value as Locale)}
              className="text-xs font-medium bg-transparent border-none cursor-pointer focus:ring-0 focus:outline-none text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 py-1 [color-scheme:light] dark:[color-scheme:dark]"
            >
              {Object.entries(localeLabels).map(([val, label]) => (
                <option key={val} value={val} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">{label}</option>
              ))}
            </select>
          </div>

          {/* Profile button - desktop only */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsProfileModalOpen(true)}
            className="hidden sm:flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 px-3"
          >
            <User className="w-4 h-4" />
          </Button>

          {/* Admin button (only for admins) - desktop only */}
          {isAdmin && (
            <Link href="/admin" className="hidden sm:block">
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

          {/* Desktop logout button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="hidden sm:flex items-center gap-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 px-3"
            title={translations.logout}
          >
            <LogOut className="w-4 h-4" />
          </Button>

          {/* Mobile more menu — contains all actions hidden on mobile */}
          <div className="relative sm:hidden" ref={mobileMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="px-1.5 text-gray-600 dark:text-gray-400"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {isMobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
                {/* Profile */}
                <button
                  onClick={() => { setIsProfileModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <User className="w-4 h-4" />
                  {profileTranslations.title}
                </button>

                {/* Language */}
                <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <Globe className="w-4 h-4" />
                  <select
                    value={locale}
                    onChange={(e) => { onLocaleChange(e.target.value as Locale); setIsMobileMenuOpen(false); }}
                    className="text-sm bg-transparent border-none cursor-pointer focus:ring-0 focus:outline-none text-gray-700 dark:text-gray-300 py-0 [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    {Object.entries(localeLabels).map(([val, label]) => (
                      <option key={val} value={val} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">{label}</option>
                    ))}
                  </select>
                </div>

                {/* Theme */}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
                  <ThemeToggle />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                {/* Help */}
                <button
                  onClick={() => { setIsHelpPanelOpen(true); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <HelpCircle className="w-4 h-4" />
                  {helpTranslations.title}
                </button>

                {/* TTS */}
                <div className="px-4 py-1">
                  <TTSSettingsButton translations={ttsTranslations} />
                </div>

                {/* Admin */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                {/* Logout */}
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <LogOut className="w-4 h-4" />
                  {translations.logout}
                </button>
              </div>
            )}
          </div>
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
        telegramTranslations={telegramTranslations}
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
