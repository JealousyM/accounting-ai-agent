'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppVersion } from '@/components/ui/app-version';
import Link from 'next/link';
import { useChat } from '@/hooks/useChat';
import { useLocale } from '@/contexts/LocaleContext';
import { ConversationList } from './ConversationList';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export function ChatContainer() {
  const {
    conversations,
    currentConversation,
    currentConversationId,
    messages,
    isLoading,
    isLoadingConversations,
    isLoadingConversation,
    isCreatingConversation,
    sendMessage,
    createConversation,
    selectConversation,
    deleteConversation,
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { locale, setLocale } = useLocale();
  const t = translations[locale].chat;

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  const handleNewChat = async () => {
    await createConversation();
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.sidebar.title}</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                disabled={isCreatingConversation}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <MessageSquarePlus className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              currentId={currentConversationId}
              onSelect={handleSelectConversation}
              onDelete={deleteConversation}
              isLoading={isLoadingConversations}
              translations={t.sidebar}
            />
          </div>

          {/* Sidebar footer with AI Costs link */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <Link
                href="/dashboard/costs"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                <span>{t.aiCosts}</span>
              </Link>
              <AppVersion />
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <ChatHeader
          conversation={currentConversation}
          onMenuClick={() => setIsSidebarOpen(true)}
          onNewChat={handleNewChat}
          isCreatingConversation={isCreatingConversation}
          translations={t.header}
          profileTranslations={translations[locale].profile}
          locale={locale}
          onLocaleChange={setLocale}
        />

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            isLoadingConversation={isLoadingConversation}
            translations={t.messages}
            toolsTranslations={t.tools}
            suggestionsTranslations={t.suggestions}
          />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder={
            !currentConversationId
              ? t.input.placeholderNew
              : t.input.placeholderDefault
          }
          translations={t.input}
        />
      </div>
    </div>
  );
}
