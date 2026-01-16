'use client';

import React from 'react';
import { Bot, User, Wrench } from 'lucide-react';
import { ChatMessage } from '@/hooks/useChat';

interface ToolsTranslations {
  companyInfo: string;
  contractors: string;
  financials: string;
  invoices: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  translations: {
    toolsUsed: string;
  };
  toolsTranslations: ToolsTranslations;
}

export function MessageBubble({ message, translations, toolsTranslations }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const formatToolName = (name: string): string => {
    const nameMap: Record<string, string> = {
      get_company_info: toolsTranslations.companyInfo,
      get_contractors: toolsTranslations.contractors,
      get_financial_summary: toolsTranslations.financials,
      get_invoices: toolsTranslations.invoices,
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
          ${isUser ? 'bg-blue-600' : 'bg-blue-100'}
        `}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-blue-600" />
        )}
      </div>

      {/* Message content */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            rounded-2xl px-4 py-3 shadow-sm
            ${isUser
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
            }
          `}
        >
          {/* Tool calls indicator */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
              <Wrench className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">
                {translations.toolsUsed} {message.toolCalls.map(t => formatToolName(t.name)).join(', ')}
              </span>
            </div>
          )}

          {/* Message text with markdown-like formatting */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {formatMessageContent(message.content)}
          </div>
        </div>

        {/* Timestamp and metadata */}
        <div
          className={`
            flex items-center gap-2 mt-1 text-xs text-gray-400
            ${isUser ? 'justify-end' : 'justify-start'}
          `}
        >
          <span>
            {new Date(message.timestamp).toLocaleTimeString('pl-PL', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.metadata?.provider && (
            <span className="text-gray-300">
              {message.metadata.provider === 'openai' ? 'GPT-4' : 'Claude'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format message content with basic markdown support
 */
function formatMessageContent(content: string): React.ReactNode {
  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      // Code block
      const code = part.slice(3, -3).replace(/^\w+\n/, ''); // Remove language identifier
      return (
        <pre
          key={index}
          className="bg-gray-800 text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-xs"
        >
          <code>{code}</code>
        </pre>
      );
    }

    // Regular text with inline formatting
    return (
      <span key={index}>
        {part.split('\n').map((line, lineIndex, arr) => (
          <React.Fragment key={lineIndex}>
            {formatInlineMarkdown(line)}
            {lineIndex < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  });
}

/**
 * Format inline markdown (bold, italic, code)
 */
function formatInlineMarkdown(text: string): React.ReactNode {
  // Simple bold and inline code formatting
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
