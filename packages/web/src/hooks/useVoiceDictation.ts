'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export type VoiceDictationErrorCode =
  | 'not-supported'
  | 'not-allowed'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'aborted'
  | 'unknown';

export interface VoiceDictationError {
  code: VoiceDictationErrorCode;
  message: string;
}

export type Locale = 'en' | 'pl' | 'ru';

interface UseVoiceDictationOptions {
  lang?: Locale;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: VoiceDictationError) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface UseVoiceDictationReturn {
  isSupported: boolean;
  isListening: boolean;
  error: VoiceDictationError | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearError: () => void;
}

const localeToSpeechLang: Record<Locale, string> = {
  en: 'en-US',
  pl: 'pl-PL',
  ru: 'ru-RU',
};

const mapErrorToCode = (error: string): VoiceDictationErrorCode => {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed';
    case 'no-speech':
      return 'no-speech';
    case 'audio-capture':
      return 'audio-capture';
    case 'network':
      return 'network';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
};

export function useVoiceDictation(
  options: UseVoiceDictationOptions = {}
): UseVoiceDictationReturn {
  const {
    lang = 'en',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<VoiceDictationError | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStoppingRef = useRef(false);

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = !!(
        window.SpeechRecognition || window.webkitSpeechRecognition
      );
      setIsSupported(supported);
    }
  }, []);

  // Initialize recognition instance
  const getRecognition = useCallback((): SpeechRecognition | null => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return null;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = localeToSpeechLang[lang] || 'en-US';
    recognition.maxAlternatives = 1;

    return recognition;
  }, [lang, continuous, interimResults]);

  // Setup event handlers
  const setupRecognition = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) return null;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      onStart?.();
    };

    recognition.onend = () => {
      setIsListening(false);
      onEnd?.();

      // Auto-restart if continuous mode and not manually stopped
      if (continuous && !isStoppingRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Ignore if already started or other error
        }
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onResult?.(finalTranscript, true);
      } else if (interimTranscript) {
        onResult?.(interimTranscript, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorCode = mapErrorToCode(event.error);

      // Don't treat 'no-speech' and 'aborted' as errors that need display
      if (errorCode === 'no-speech' || errorCode === 'aborted') {
        return;
      }

      const voiceError: VoiceDictationError = {
        code: errorCode,
        message: event.message || event.error,
      };

      setError(voiceError);
      setIsListening(false);
      onError?.(voiceError);
    };

    recognition.onnomatch = () => {
      // No match found, ignore silently
    };

    return recognition;
  }, [getRecognition, continuous, onStart, onEnd, onResult, onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const notSupportedError: VoiceDictationError = {
        code: 'not-supported',
        message: 'Speech recognition is not supported in this browser',
      };
      setError(notSupportedError);
      onError?.(notSupportedError);
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    isStoppingRef.current = false;
    const recognition = setupRecognition();

    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        const startError: VoiceDictationError = {
          code: 'unknown',
          message: e instanceof Error ? e.message : 'Failed to start recognition',
        };
        setError(startError);
        onError?.(startError);
      }
    }
  }, [isSupported, setupRecognition, onError]);

  const stopListening = useCallback(() => {
    isStoppingRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  // Update language when it changes
  useEffect(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.lang = localeToSpeechLang[lang] || 'en-US';
    }
  }, [lang, isListening]);

  return {
    isSupported,
    isListening,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearError,
  };
}
