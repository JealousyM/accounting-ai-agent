'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useTextToSpeech, type Locale, type TTSError } from '@/hooks/useTextToSpeech';

// ============================================
// TYPES
// ============================================

interface TTSSettings {
  enabled: boolean;
  autoSpeak: boolean;
  rate: number;
}

interface TTSContextType {
  // Settings (persisted)
  ttsEnabled: boolean;
  setTTSEnabled: (enabled: boolean) => void;
  autoSpeak: boolean;
  setAutoSpeak: (auto: boolean) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;

  // Runtime state
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  currentMessageId: string | null;
  error: TTSError | null;

  // Actions
  speak: (text: string, messageId: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  clearError: () => void;
  isMessageSpeaking: (messageId: string) => boolean;
}

// ============================================
// CONSTANTS
// ============================================

const TTS_STORAGE_KEY = 'tts-settings';
const DEFAULT_SETTINGS: TTSSettings = {
  enabled: true,
  autoSpeak: true,
  rate: 1.0,
};

// ============================================
// UTILS
// ============================================

function loadSettings(): TTSSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(TTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
        autoSpeak: typeof parsed.autoSpeak === 'boolean' ? parsed.autoSpeak : DEFAULT_SETTINGS.autoSpeak,
        rate: typeof parsed.rate === 'number' ? parsed.rate : DEFAULT_SETTINGS.rate,
      };
    }
  } catch {
    // Ignore parsing errors
  }

  return DEFAULT_SETTINGS;
}

function saveSettings(settings: TTSSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TTS_STORAGE_KEY, JSON.stringify(settings));
}

// ============================================
// CONTEXT
// ============================================

const TTSContext = createContext<TTSContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface TTSProviderProps {
  children: React.ReactNode;
  locale?: Locale;
}

export function TTSProvider({ children, locale = 'en' }: TTSProviderProps) {
  // Settings state
  const [settings, setSettings] = useState<TTSSettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use the TTS hook
  const tts = useTextToSpeech({
    lang: locale,
    rate: settings.rate,
  });

  
  // Initialize settings from localStorage
  useEffect(() => {
    if (isInitialized) return;

    const loaded = loadSettings();
    setSettings(loaded);
    setIsInitialized(true);
  }, [isInitialized]);

  // Save settings when they change
  useEffect(() => {
    if (isInitialized) {
      saveSettings(settings);
    }
  }, [settings, isInitialized]);

  // Settings setters
  const setTTSEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, enabled }));
    if (!enabled) {
      tts.stop();
    }
  }, [tts]);

  const setAutoSpeak = useCallback((autoSpeak: boolean) => {
    setSettings((prev) => ({ ...prev, autoSpeak }));
  }, []);

  const setSpeechRate = useCallback((rate: number) => {
    setSettings((prev) => ({ ...prev, rate }));
  }, []);

  // Speak action
  const speak = useCallback(
    (text: string, messageId: string) => {
      if (!settings.enabled) return;
      tts.speak(text, messageId);
    },
    [settings.enabled, tts]
  );

  // Check if specific message is speaking
  const isMessageSpeaking = useCallback(
    (messageId: string) => {
      return tts.isSpeaking && tts.currentMessageId === messageId;
    },
    [tts.isSpeaking, tts.currentMessageId]
  );

  const value: TTSContextType = {
    // Settings
    ttsEnabled: settings.enabled,
    setTTSEnabled,
    autoSpeak: settings.autoSpeak,
    setAutoSpeak,
    speechRate: settings.rate,
    setSpeechRate,

    // Runtime state
    isSupported: tts.isSupported,
    isSpeaking: tts.isSpeaking,
    isPaused: tts.isPaused,
    currentMessageId: tts.currentMessageId,
    error: tts.error,

    // Actions
    speak,
    stop: tts.stop,
    pause: tts.pause,
    resume: tts.resume,
    clearError: tts.clearError,
    isMessageSpeaking,
  };

  return <TTSContext.Provider value={value}>{children}</TTSContext.Provider>;
}

// ============================================
// HOOKS
// ============================================

/**
 * useTTS hook
 * Access TTS state and actions
 */
export function useTTS(): TTSContextType {
  const context = useContext(TTSContext);

  if (context === undefined) {
    throw new Error('useTTS must be used within a TTSProvider');
  }

  return context;
}

/**
 * Hook for auto-speaking new messages
 * Call this when a new AI message arrives
 */
export function useAutoSpeak() {
  const { ttsEnabled, autoSpeak, speak, isSpeaking } = useTTS();

  const triggerAutoSpeak = useCallback(
    (text: string, messageId: string) => {
      if (!ttsEnabled || !autoSpeak || isSpeaking) return;

      // Small delay to let UI update
      setTimeout(() => {
        speak(text, messageId);
      }, 100);
    },
    [ttsEnabled, autoSpeak, isSpeaking, speak]
  );

  return { triggerAutoSpeak, shouldAutoSpeak: ttsEnabled && autoSpeak };
}
