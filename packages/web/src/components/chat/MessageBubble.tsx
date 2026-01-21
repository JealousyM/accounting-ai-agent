'use client';

import React from 'react';
import { Bot, User, Wrench } from 'lucide-react';
import { ChatMessage } from '@/hooks/useChat';

interface ToolsTranslations {
  companyInfo: string;
  contractors: string;
  financials: string;
  invoices: string;
  createContractor: string;
  updateContractor: string;
  deleteContractor: string;
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
            {renderMarkdown(message.content)}
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
          {message.metadata?.provider && (
            <span className="text-gray-300 dark:text-gray-600">
              {message.metadata.provider === 'openai' ? 'GPT-4' : 'Claude'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Custom markdown renderer with support for tables, headers, bold, code, and blockquotes
 */
function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check for table (lines starting with |)
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={`table-${i}`} className="my-2 overflow-x-auto">
          {renderTable(tableLines)}
        </div>
      );
      continue;
    }

    // Check for header (## )
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-bold mt-3 mb-2">
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // Check for blockquote (> )
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-blue-400 dark:border-blue-500 pl-3 my-2 text-gray-600 dark:text-gray-400 italic text-sm"
        >
          {renderInlineMarkdown(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Check for code block (```)
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      elements.push(
        <pre
          key={`code-${i}`}
          className="bg-gray-800 text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-xs"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Check for list item (- )
    if (line.startsWith('- ')) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 my-1">
          <span>•</span>
          <span>{renderInlineMarkdown(line.slice(2))}</span>
        </div>
      );
      i++;
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    } else {
      // Empty line - add spacing
      elements.push(<div key={`space-${i}`} className="h-2" />);
    }
    i++;
  }

  return elements;
}

/**
 * Render a markdown table
 */
function renderTable(lines: string[]): React.ReactNode {
  if (lines.length < 2) return null;

  // Parse header
  const headerCells = parseTableRow(lines[0]);

  // Skip separator line (|---|---|)
  const bodyLines = lines.slice(2);

  return (
    <table className="border-collapse border border-gray-300 dark:border-gray-600 text-xs w-full">
      <thead>
        <tr className="bg-gray-100 dark:bg-gray-700">
          {headerCells.map((cell, idx) => (
            <th
              key={idx}
              className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold"
            >
              {renderInlineMarkdown(cell)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bodyLines.map((line, rowIdx) => {
          const cells = parseTableRow(line);
          return (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
              {cells.map((cell, cellIdx) => (
                <td key={cellIdx} className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                  {renderInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Parse a table row into cells
 */
function parseTableRow(line: string): string[] {
  // Remove leading/trailing pipes and split by |
  const trimmed = line.trim();
  const withoutEdges = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutEnd = withoutEdges.endsWith('|') ? withoutEdges.slice(0, -1) : withoutEdges;
  return withoutEnd.split('|').map(cell => cell.trim());
}

/**
 * Render inline markdown (bold, code, links)
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  // Split by bold (**text**), inline code (`text`), and links ([text](url))
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    // Bold
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Links (markdown format: [text](url))
    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const [, linkText, linkUrl] = linkMatch;

      // Check if it's a file download link
      const isFileDownload = linkUrl.includes('/api/files/download/');

      return (
        <a
          key={index}
          href={linkUrl}
          target={isFileDownload ? '_self' : '_blank'}
          rel={isFileDownload ? undefined : 'noopener noreferrer'}
          download={isFileDownload}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium inline-flex items-center gap-1"
        >
          {linkText}
          {isFileDownload && <span className="text-sm">⬇</span>}
        </a>
      );
    }

    return part;
  });
}
