'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InputTranslations {
  placeholder: string;
  hint: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  translations: InputTranslations;
}

export function ChatInput({ onSend, disabled, placeholder, translations }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      // Reset textarea height
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
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || translations.placeholder}
              disabled={disabled}
              rows={1}
              className="
                w-full px-4 py-3 pr-12
                bg-gray-50 border border-gray-200 rounded-2xl
                resize-none overflow-hidden
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                text-gray-900 placeholder-gray-400
              "
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
          </div>

          <Button
            type="submit"
            disabled={!message.trim() || disabled}
            className="
              h-12 w-12 rounded-full
              bg-blue-600 hover:bg-blue-700
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center
            "
          >
            {disabled ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-2 text-center">
          {translations.hint}
        </p>
      </form>
    </div>
  );
}
