'use client';

import React, { useRef, useEffect } from 'react';
import { Loader2, Bot } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatMessage } from '@/hooks/useChat';

interface MessagesTranslations {
  emptyTitle: string;
  emptyDescription: string;
  thinking: string;
  toolsUsed: string;
}

interface ToolsTranslations {
  companyInfo: string;
  contractors: string;
  financials: string;
  invoices: string;
  createContractor: string;
  updateContractor: string;
  deleteContractor: string;
}

interface SuggestionsTranslations {
  vatRates: string;
  companyData: string;
  ipBox: string;
  zusPayment: string;
  unpaidInvoices: string;
  taxDeadlines: string;
}

interface TTSTranslations {
  play: string;
  stop: string;
  loading?: string;
}

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingConversation: boolean;
  translations: MessagesTranslations;
  toolsTranslations: ToolsTranslations;
  suggestionsTranslations: SuggestionsTranslations;
  ttsTranslations: TTSTranslations;
  onSuggestionClick?: (text: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  isLoadingConversation,
  translations,
  toolsTranslations,
  suggestionsTranslations,
  ttsTranslations,
  onSuggestionClick,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoadingConversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  const suggestions = [
    suggestionsTranslations.vatRates,
    suggestionsTranslations.companyData,
    suggestionsTranslations.ipBox,
    suggestionsTranslations.zusPayment,
    suggestionsTranslations.unpaidInvoices,
    suggestionsTranslations.taxDeadlines,
  ];

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
          <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {translations.emptyTitle}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
          {translations.emptyDescription}
        </p>
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSuggestionClick?.(suggestion)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-700 border border-transparent transition-colors duration-150 cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            translations={{ toolsUsed: translations.toolsUsed }}
            toolsTranslations={toolsTranslations}
            ttsTranslations={ttsTranslations}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400 text-sm">{translations.thinking}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
