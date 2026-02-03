'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTTS } from '@/contexts/TTSContext';

interface TTSTranslations {
  play: string;
  stop: string;
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
  const { ttsEnabled, isSupported, speak, stop, isMessageSpeaking } = useTTS();

  const isSpeakingThis = isMessageSpeaking(messageId);

  // Don't render if TTS is disabled or not supported
  if (!ttsEnabled || !isSupported) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSpeakingThis) {
      stop();
    } else {
      speak(content, messageId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        p-1 rounded-full transition-all duration-200
        ${isSpeakingThis
          ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 animate-pulse'
          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
        ${className}
      `}
      title={isSpeakingThis ? translations.stop : translations.play}
      aria-label={isSpeakingThis ? translations.stop : translations.play}
    >
      {isSpeakingThis ? (
        <VolumeX className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </button>
  );
}
