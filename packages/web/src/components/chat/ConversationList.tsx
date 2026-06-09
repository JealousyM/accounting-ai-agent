'use client';

import React from 'react';
import { MessageSquare, Trash2, Loader2, AlertTriangle, Users, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Conversation } from '@/hooks/useChat';

interface SidebarTranslations {
  noConversations: string;
  startNewChat: string;
  deleteConfirm: string;
  deleteTitle: string;
  deleteWarning: string;
  deleteCancel: string;
  deleteButton: string;
  yesterday: string;
  messages: string;
  searchPlaceholder?: string;
  noSearchResults?: string;
  noSearchResultsSuggestion?: string;
}

interface SharedTranslations {
  section: string;
  sharedBy: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  sharedConversations?: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  translations: SidebarTranslations;
  sharedTranslations?: SharedTranslations;
}

// Wraps the matched substring of `text` with <mark> for highlighting.
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function filterByQuery(conversations: Conversation[], query: string): Conversation[] {
  if (!query) return conversations;
  const q = query.toLowerCase();
  return conversations.filter(c => c.title.toLowerCase().includes(q));
}

export function ConversationList({
  conversations,
  sharedConversations = [],
  currentId,
  onSelect,
  onDelete,
  isLoading,
  translations,
  sharedTranslations,
}: ConversationListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K focuses the search input
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDeleteRequest = (id: string) => {
    setPendingDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      onDelete(pendingDeleteId);
    }
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  const filteredConversations = filterByQuery(conversations, searchQuery);
  const filteredShared = filterByQuery(sharedConversations, searchQuery);
  const isSearching = searchQuery.length > 0;
  const noResults = isSearching && filteredConversations.length === 0 && filteredShared.length === 0;
  const isEmpty = !isSearching && conversations.length === 0 && sharedConversations.length === 0;

  return (
    <>
      {/* Search input */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={translations.searchPlaceholder ?? 'Search conversations…'}
            className="
              w-full pl-8 pr-7 py-1.5 text-sm rounded-md
              bg-gray-100 dark:bg-gray-700
              border border-transparent focus:border-blue-400 dark:focus:border-blue-500
              text-gray-900 dark:text-gray-100
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:outline-none transition-colors
            "
          />
          {isSearching && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Empty (no conversations at all) */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{translations.noConversations}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {translations.startNewChat}
          </p>
        </div>
      )}

      {/* No search results */}
      {noResults && (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {translations.noSearchResults ?? 'No conversations matching'}{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">"{searchQuery}"</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {translations.noSearchResultsSuggestion ?? 'Try a different keyword or start a new chat'}
          </p>
        </div>
      )}

      {/* Personal conversations */}
      {filteredConversations.length > 0 && (
        <div className="py-2">
          {filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === currentId}
              onSelect={() => onSelect(conversation.id)}
              onDelete={() => handleDeleteRequest(conversation.id)}
              translations={translations}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}

      {/* Shared conversations section */}
      {filteredShared.length > 0 && sharedTranslations && (
        <div className="py-2">
          <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700" />
          <div className="flex items-center gap-2 px-4 py-1.5">
            <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {sharedTranslations.section}
            </span>
          </div>
          {filteredShared.map((conversation) => (
            <SharedConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === currentId}
              onSelect={() => onSelect(conversation.id)}
              translations={translations}
              sharedByLabel={sharedTranslations.sharedBy}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteCancel}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {translations.deleteTitle}
            </DialogTitle>
            <DialogDescription>
              {translations.deleteConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {translations.deleteWarning}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={handleDeleteCancel}
            >
              {translations.deleteCancel}
            </Button>
            <Button
              variant="default"
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {translations.deleteButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  translations: SidebarTranslations;
  searchQuery: string;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  translations,
  searchQuery,
}: ConversationItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
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
            <HighlightedText text={conversation.title} query={searchQuery} />
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

interface SharedConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  translations: SidebarTranslations;
  sharedByLabel: string;
  searchQuery: string;
}

function SharedConversationItem({
  conversation,
  isActive,
  onSelect,
  translations,
  sharedByLabel,
  searchQuery,
}: SharedConversationItemProps) {
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
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className={`
              text-sm font-medium truncate
              ${isActive ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
            `}
          >
            <HighlightedText text={conversation.title} query={searchQuery} />
          </h3>
          {conversation.ownerName && (
            <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">
              {sharedByLabel.replace('{name}', conversation.ownerName)}
            </p>
          )}
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
      </div>
    </div>
  );
}
