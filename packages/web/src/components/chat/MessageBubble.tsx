'use client';

import React from 'react';
import { Bot, User, Wrench } from 'lucide-react';
import { ChatMessage } from '@/hooks/useChat';
import { MarkdownRenderer } from '@/components/ui/markdown';
import { TTSButton } from './TTSButton';

interface ToolsTranslations {
  companyInfo: string;
  contractors: string;
  financials: string;
  invoices: string;
  createContractor: string;
  updateContractor: string;
  deleteContractor: string;
}

interface TTSTranslations {
  play: string;
  stop: string;
  loading?: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  translations: {
    toolsUsed: string;
  };
  toolsTranslations: ToolsTranslations;
  ttsTranslations: TTSTranslations;
}

export function MessageBubble({ message, translations, toolsTranslations, ttsTranslations }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const formatToolName = (name: string): string => {
    const nameMap: Record<string, string> = {
      get_company_info: toolsTranslations.companyInfo,
      get_contractors: toolsTranslations.contractors,
      get_financial_summary: toolsTranslations.financials,
      get_invoices: toolsTranslations.invoices,
      create_contractor: toolsTranslations.createContractor,
      update_contractor: toolsTranslations.updateContractor,
      delete_contractor: toolsTranslations.deleteContractor,
    };
    return nameMap[name] || name;
  };

  // Skip system messages
  if (message.role === 'system') {
    return null;
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isUser ? 'bg-blue-600' : 'bg-blue-100 dark:bg-blue-900'}
        `}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        )}
      </div>

      {/* Message content */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            rounded-2xl px-4 py-3 shadow-sm
            ${isUser
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'
            }
          `}
        >
          {/* Tool calls indicator */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
              <Wrench className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {translations.toolsUsed} {message.toolCalls.map(t => formatToolName(t.name)).join(', ')}
              </span>
            </div>
          )}

          {/* Message text with markdown rendering */}
          <div className="text-sm leading-relaxed">
            <MarkdownRenderer
              content={message.content}
              variant="chat"
              enableFileDownloads={true}
              className={isUser ? 'prose-invert' : ''}
            />
          </div>
        </div>

        {/* Timestamp and metadata */}
        <div
          className={`
            flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500
            ${isUser ? 'justify-end' : 'justify-start'}
          `}
        >
          <span>
            {new Date(message.timestamp).toLocaleTimeString('pl-PL', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.metadata?.model && (
            <span className="text-gray-300 dark:text-gray-600">
              {message.metadata.model}
            </span>
          )}
          {!isUser && (
            <TTSButton
              messageId={message.id}
              content={message.content}
              translations={ttsTranslations}
            />
          )}
        </div>
      </div>
    </div>
  );
}
