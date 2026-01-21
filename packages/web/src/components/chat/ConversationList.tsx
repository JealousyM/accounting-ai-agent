'use client';

import React from 'react';
import { MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Conversation } from '@/hooks/useChat';

interface SidebarTranslations {
  noConversations: string;
  startNewChat: string;
  deleteConfirm: string;
  yesterday: string;
  messages: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  translations: SidebarTranslations;
}

export function ConversationList({
  conversations,
  currentId,
  onSelect,
  onDelete,
  isLoading,
  translations,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{translations.noConversations}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {translations.startNewChat}
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === currentId}
          onSelect={() => onSelect(conversation.id)}
          onDelete={() => onDelete(conversation.id)}
          translations={translations}
        />
      ))}
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  translations: SidebarTranslations;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  translations,
}: ConversationItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(translations.deleteConfirm)) {
      onDelete();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return translations.yesterday;
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pl-PL', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <div
      className={`
        group px-3 py-2 mx-2 rounded-lg cursor-pointer
        transition-colors duration-150
        ${isActive
          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
        }
      `}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className={`
              text-sm font-medium truncate
              ${isActive ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
            `}
          >
            {conversation.title}
          </h3>
          {conversation.lastMessage && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {conversation.lastMessage}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatDate(conversation.updatedAt)}
            </span>
            <span className="text-xs text-gray-300 dark:text-gray-600">
              {conversation.messageCount} {translations.messages}
            </span>
          </div>
        </div>

        {/* Delete button */}
        {(isHovered || isActive) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="
              opacity-0 group-hover:opacity-100
              p-1 h-auto text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400
              transition-opacity duration-150
            "
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
