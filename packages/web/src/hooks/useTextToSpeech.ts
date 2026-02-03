'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type Locale = 'en' | 'pl' | 'ru';

export type TTSErrorCode =
  | 'not-supported'
  | 'no-voices'
  | 'synthesis-failed'
  | 'cancelled'
  | 'unknown'
  | 'PLAYBACK_ERROR'
  | 'AI_TTS_ERROR';

export interface TTSError {
  code: TTSErrorCode;
  message: string;
}

interface UseTextToSpeechOptions {
  lang?: Locale;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: (messageId?: string) => void;
  onEnd?: (messageId?: string) => void;
  onError?: (error: TTSError) => void;
}

interface UseTextToSpeechReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  currentMessageId: string | null;
  error: TTSError | null;
  speak: (text: string, messageId?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  clearError: () => void;
}

const localeToSpeechLang: Record<Locale, string> = {
  en: 'en-US',
  pl: 'pl-PL',
  ru: 'ru-RU',
};

/**
 * Strips markdown formatting from text for cleaner speech synthesis
 */
function stripMarkdown(text: string): string {
  return (
    text
      // Remove headers
      .replace(/#{1,6}\s+/g, '')
      // Remove bold/italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Remove horizontal rules
      .replace(/---+/g, '')
      // Remove table formatting
      .replace(/\|/g, ' ')
      .replace(/-{3,}/g, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Clean up multiple spaces and newlines
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

export function useTextToSpeech(
  options: UseTextToSpeechOptions = {}
): UseTextToSpeechReturn {
  const {
    lang = 'en',
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    onStart,
    onEnd,
    onError,
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [error, setError] = useState<TTSError | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'speechSynthesis' in window;
      setIsSupported(supported);
    }
  }, []);

  // Get the best voice for the current language
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();
    const targetLang = localeToSpeechLang[lang];

    // Try to find a voice that matches the exact locale
    let voice = voices.find((v) => v.lang === targetLang);

    // If not found, try to find a voice that starts with the language code
    if (!voice) {
      const langCode = targetLang.split('-')[0];
      voice = voices.find((v) => v.lang.startsWith(langCode));
    }

    // Fall back to default voice
    return voice || voices[0] || null;
  }, [lang]);

  const speak = useCallback(
    (text: string, messageId?: string) => {
      if (!isSupported) {
        const notSupportedError: TTSError = {
          code: 'not-supported',
          message: 'Speech synthesis is not supported in this browser',
        };
        setError(notSupportedError);
        onError?.(notSupportedError);
        return;
      }

      // Stop any current speech
      window.speechSynthesis.cancel();

      const cleanText = stripMarkdown(text);
      if (!cleanText.trim()) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Set voice
      const voice = getVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = localeToSpeechLang[lang];
      }

      // Set properties
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setError(null);
        setCurrentMessageId(messageId || null);
        currentMessageIdRef.current = messageId || null;
        onStart?.(messageId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        const endedMessageId = currentMessageIdRef.current;
        setCurrentMessageId(null);
        currentMessageIdRef.current = null;
        onEnd?.(endedMessageId || undefined);
      };

      utterance.onerror = (event) => {
        // Ignore 'cancelled' errors as they're expected when stopping
        if (event.error === 'canceled' || event.error === 'interrupted') {
          setIsSpeaking(false);
          setIsPaused(false);
          setCurrentMessageId(null);
          currentMessageIdRef.current = null;
          return;
        }

        const ttsError: TTSError = {
          code: 'synthesis-failed',
          message: event.error || 'Speech synthesis failed',
        };
        setError(ttsError);
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentMessageId(null);
        currentMessageIdRef.current = null;
        onError?.(ttsError);
      };

      utteranceRef.current = utterance;

      // Speak
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        const speakError: TTSError = {
          code: 'unknown',
          message: e instanceof Error ? e.message : 'Failed to start speech',
        };
        setError(speakError);
        onError?.(speakError);
      }
    },
    [isSupported, getVoice, lang, rate, pitch, volume, onStart, onEnd, onError]
  );

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentMessageId(null);
      currentMessageIdRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load voices when they become available
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const handleVoicesChanged = () => {
      // Voices are loaded, trigger re-render if needed
      getVoice();
    };

    window.speechSynthesis.addEventListener(
      'voiceschanged',
      handleVoicesChanged
    );

    // Initial load
    handleVoicesChanged();

    return () => {
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        handleVoicesChanged
      );
    };
  }, [getVoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    currentMessageId,
    error,
    speak,
    pause,
    resume,
    stop,
    clearError,
  };
}
