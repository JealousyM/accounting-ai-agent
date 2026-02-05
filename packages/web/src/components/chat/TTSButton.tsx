'use client';

import React from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useTTS } from '@/contexts/TTSContext';

interface TTSTranslations {
  play: string;
  stop: string;
  loading?: string;
}

interface TTSButtonProps {
  messageId: string;
  content: string;
  translations: TTSTranslations;
  className?: string;
}

export function TTSButton({
  messageId,
  content,
  translations,
  className = '',
}: TTSButtonProps) {
  const { ttsEnabled, isSupported, speak, stop, isMessageSpeaking, isMessageLoading } = useTTS();

  const isSpeakingThis = isMessageSpeaking(messageId);
  const isLoadingThis = isMessageLoading(messageId);

  // Don't render if TTS is disabled or not supported
  if (!ttsEnabled || !isSupported) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't allow clicks while loading
    if (isLoadingThis) return;

    if (isSpeakingThis) {
      stop();
    } else {
      speak(content, messageId);
    }
  };

  // Determine button state and styling
  const getButtonState = () => {
    if (isLoadingThis) {
      return {
        className: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 cursor-wait',
        title: translations.loading || 'Loading...',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
      };
    }
    if (isSpeakingThis) {
      return {
        className: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 animate-pulse',
        title: translations.stop,
        icon: <VolumeX className="w-4 h-4" />,
      };
    }
    return {
      className: 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
      title: translations.play,
      icon: <Volume2 className="w-4 h-4" />,
    };
  };

  const state = getButtonState();

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoadingThis}
      className={`
        p-1 rounded-full transition-all duration-200
        ${state.className}
        ${className}
      `}
      title={state.title}
      aria-label={state.title}
    >
      {state.icon}
    </button>
  );
}
