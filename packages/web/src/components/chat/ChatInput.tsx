'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Mic, MicOff, BookmarkCheck } from 'lucide-react';
import { useVoiceDictation, type Locale } from '@/hooks/useVoiceDictation';

interface InputTranslations {
  placeholder: string;
  hint: string;
  voiceStart?: string;
  voiceStop?: string;
  voiceListening?: string;
  voiceNotSupported?: string;
  voicePermissionDenied?: string;
  voiceError?: string;
  shortcuts?: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  translations: InputTranslations;
  locale?: Locale;
  prefillValue?: string;
  onPrefillConsumed?: () => void;
  onShortcutsClick?: () => void;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder,
  translations,
  locale = 'en',
  prefillValue,
  onPrefillConsumed,
  onShortcutsClick,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isSupported: isVoiceSupported,
    isListening,
    toggleListening,
  } = useVoiceDictation({
    lang: locale,
    continuous: true,
    onResult: (transcript, isFinal) => {
      if (isFinal) {
        setMessage((prev) => prev + (prev ? ' ' : '') + transcript);
      }
    },
  });

  // Apply pre-fill from shortcuts
  useEffect(() => {
    if (prefillValue !== undefined && prefillValue !== '') {
      setMessage(prefillValue);
      textareaRef.current?.focus();
      onPrefillConsumed?.();
    }
  }, [prefillValue, onPrefillConsumed]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-4 py-3 safe-area-bottom">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="relative flex items-end">
          {onShortcutsClick && (
            <button
              type="button"
              onClick={onShortcutsClick}
              disabled={disabled}
              title={translations.shortcuts ?? 'Shortcuts'}
              className="
                absolute left-2 bottom-1.5
                h-9 w-9 rounded-full
                flex items-center justify-center
                hover:bg-gray-200 dark:hover:bg-gray-600
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <BookmarkCheck className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || translations.placeholder}
            disabled={disabled}
            rows={1}
            className={`
              w-full py-3
              ${onShortcutsClick ? 'pl-12' : 'pl-4'} pr-24
              bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl
              resize-none overflow-hidden
              focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
            `}
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />

          <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
            {isVoiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={disabled}
                title={isListening ? translations.voiceStop : translations.voiceStart}
                className={`
                  h-9 w-9 rounded-full
                  flex items-center justify-center
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className="
                h-9 w-9 rounded-full
                bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400
                disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600
                flex items-center justify-center
                transition-colors duration-200
              "
            >
              {disabled ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
          {isListening && translations.voiceListening
            ? translations.voiceListening
            : translations.hint}
        </p>
      </form>
    </div>
  );
}
