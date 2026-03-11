'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Link2, Unlink, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getTelegramStatus,
  linkTelegram,
  unlinkTelegram,
} from '@/lib/api/telegram';

export interface TelegramLinkTranslations {
  title: string;
  description: string;
  codePlaceholder: string;
  linkButton: string;
  unlinkButton: string;
  linked: string;
  notLinked: string;
  instructions: string;
}

interface TelegramLinkSectionProps {
  translations: TelegramLinkTranslations;
}

export function TelegramLinkSection({ translations: t }: TelegramLinkSectionProps) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ['telegram-status'],
    queryFn: getTelegramStatus,
  });

  const linkMutation = useMutation({
    mutationFn: linkTelegram,
    onSuccess: () => {
      setCode('');
      setError(null);
      setSuccess(t.linked);
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to link Telegram');
      setSuccess(null);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: () => {
      setError(null);
      setSuccess(null);
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to unlink Telegram');
    },
  });

  const handleLink = () => {
    if (code.trim().length === 6) {
      setError(null);
      linkMutation.mutate(code.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLink();
    }
  };

  if (isLoading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{t.title}</h3>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-5 h-5 text-blue-500" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{t.title}</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t.description}</p>

      {/* Error / Success messages */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-400">{success}</p>
        </div>
      )}

      {status?.linked ? (
        /* Linked state */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <Check className="h-3 w-3" />
                {t.linked}
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {status.username ? `@${status.username}` : status.firstName || 'Telegram'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => unlinkMutation.mutate()}
              disabled={unlinkMutation.isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Unlink className="h-4 w-4 mr-1" />
              {unlinkMutation.isPending ? '...' : t.unlinkButton}
            </Button>
          </div>
        </div>
      ) : (
        /* Unlinked state */
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {t.notLinked}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t.instructions}
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={handleKeyDown}
              placeholder={t.codePlaceholder}
              className="max-w-[180px] font-mono text-center tracking-widest"
              maxLength={6}
            />
            <Button
              size="sm"
              onClick={handleLink}
              disabled={code.trim().length !== 6 || linkMutation.isPending}
            >
              <Link2 className="h-4 w-4 mr-1" />
              {linkMutation.isPending ? '...' : t.linkButton}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
