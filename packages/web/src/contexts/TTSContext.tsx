'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useTextToSpeech, type Locale, type TTSError } from '@/hooks/useTextToSpeech';
import { apiClient } from '@/lib/api/api-client';

// ============================================
// TYPES
// ============================================

export type AIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface TTSSettings {
  enabled: boolean;
  autoSpeak: boolean;
  rate: number;
  useAI: boolean;
  aiVoice: AIVoice;
}

interface TTSContextType {
  // Settings (persisted)
  ttsEnabled: boolean;
  setTTSEnabled: (enabled: boolean) => void;
  autoSpeak: boolean;
  setAutoSpeak: (auto: boolean) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  useAI: boolean;
  setUseAI: (useAI: boolean) => void;
  aiVoice: AIVoice;
  setAIVoice: (voice: AIVoice) => void;

  // Runtime state
  isSupported: boolean;
  isAIAvailable: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentMessageId: string | null;
  error: TTSError | null;

  // Actions
  speak: (text: string, messageId: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  clearError: () => void;
  isMessageSpeaking: (messageId: string) => boolean;
  isMessageLoading: (messageId: string) => boolean;
  checkAIAvailability: () => Promise<void>;
}

// ============================================
// CONSTANTS
// ============================================

const TTS_STORAGE_KEY = 'tts-settings';
const DEFAULT_SETTINGS: TTSSettings = {
  enabled: true,
  autoSpeak: true,
  rate: 1.0,
  useAI: false,
  aiVoice: 'nova',
};

// Module-level cache for AI availability check (prevents repeated API calls)
let aiAvailabilityCache: { available: boolean; timestamp: number } | null = null;
const AI_AVAILABILITY_CACHE_TTL = 60000; // 1 minute

export const AI_VOICES: { id: AIVoice; labelKey: string }[] = [
  { id: 'nova', labelKey: 'nova' },
  { id: 'alloy', labelKey: 'alloy' },
  { id: 'echo', labelKey: 'echo' },
  { id: 'fable', labelKey: 'fable' },
  { id: 'onyx', labelKey: 'onyx' },
  { id: 'shimmer', labelKey: 'shimmer' },
];

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
        useAI: typeof parsed.useAI === 'boolean' ? parsed.useAI : DEFAULT_SETTINGS.useAI,
        aiVoice: AI_VOICES.some(v => v.id === parsed.aiVoice) ? parsed.aiVoice : DEFAULT_SETTINGS.aiVoice,
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

function stripMarkdown(text: string): string {
  return (
    text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove list markers
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Remove table formatting
      .replace(/\|/g, '')
      .replace(/^[-:]+$/gm, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
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
  const [isAIAvailable, setIsAIAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAIError] = useState<TTSError | null>(null);

  // Audio element for AI TTS
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAIMessageIdRef = useRef<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  // Use the browser TTS hook
  const browserTTS = useTextToSpeech({
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

  // Check AI TTS availability on mount (with module-level caching)
  const checkAIAvailability = useCallback(async () => {
    // Use cached result if still valid
    const now = Date.now();
    if (aiAvailabilityCache && now - aiAvailabilityCache.timestamp < AI_AVAILABILITY_CACHE_TTL) {
      setIsAIAvailable(aiAvailabilityCache.available);
      return;
    }

    try {
      const response = await apiClient.get<{ available: boolean; voices: string[] }>('/api/tts/status');
      aiAvailabilityCache = { available: response.available, timestamp: now };
      setIsAIAvailable(response.available);
    } catch {
      aiAvailabilityCache = { available: false, timestamp: now };
      setIsAIAvailable(false);
    }
  }, []);

  useEffect(() => {
    checkAIAvailability();
  }, [checkAIAvailability]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Settings setters
  const setTTSEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, enabled }));
    if (!enabled) {
      browserTTS.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        setIsAISpeaking(false);
        currentAIMessageIdRef.current = null;
      }
    }
  }, [browserTTS]);

  const setAutoSpeak = useCallback((autoSpeak: boolean) => {
    setSettings((prev) => ({ ...prev, autoSpeak }));
  }, []);

  const setSpeechRate = useCallback((rate: number) => {
    setSettings((prev) => ({ ...prev, rate }));
  }, []);

  const setUseAI = useCallback((useAI: boolean) => {
    setSettings((prev) => ({ ...prev, useAI }));
  }, []);

  const setAIVoice = useCallback((aiVoice: AIVoice) => {
    setSettings((prev) => ({ ...prev, aiVoice }));
  }, []);

  // Stop all playback
  const stopAll = useCallback(() => {
    browserTTS.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsAISpeaking(false);
    currentAIMessageIdRef.current = null;
    setAIError(null);
  }, [browserTTS]);

  // Speak with AI TTS
  const speakWithAI = useCallback(
    async (text: string, messageId: string) => {
      stopAll();
      setIsLoading(true);
      setAIError(null);
      currentAIMessageIdRef.current = messageId;

      try {
        const cleanText = stripMarkdown(text);
        if (!cleanText.trim()) {
          throw new Error('Text is empty');
        }

        // Fetch audio from API
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011'}/api/tts/speak`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              text: cleanText,
              voice: settings.aiVoice,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'TTS synthesis failed');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play audio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsAISpeaking(false);
          currentAIMessageIdRef.current = null;
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsAISpeaking(false);
          currentAIMessageIdRef.current = null;
          setAIError({ code: 'PLAYBACK_ERROR', message: 'Audio playback failed' });
          URL.revokeObjectURL(audioUrl);
        };

        setIsLoading(false);
        setIsAISpeaking(true);
        await audio.play();
      } catch (error) {
        setIsLoading(false);
        setIsAISpeaking(false);
        currentAIMessageIdRef.current = null;
        setAIError({
          code: 'AI_TTS_ERROR',
          message: error instanceof Error ? error.message : 'AI TTS failed',
        });
      }
    },
    [settings.aiVoice, stopAll]
  );

  // Main speak action
  const speak = useCallback(
    (text: string, messageId: string) => {
      if (!settings.enabled) return;

      if (settings.useAI && isAIAvailable) {
        speakWithAI(text, messageId);
      } else {
        browserTTS.speak(text, messageId);
      }
    },
    [settings.enabled, settings.useAI, isAIAvailable, speakWithAI, browserTTS]
  );

  // Check if specific message is speaking
  const isMessageSpeaking = useCallback(
    (messageId: string) => {
      if (settings.useAI && isAIAvailable) {
        return isAISpeaking && currentAIMessageIdRef.current === messageId;
      }
      return browserTTS.isSpeaking && browserTTS.currentMessageId === messageId;
    },
    [settings.useAI, isAIAvailable, isAISpeaking, browserTTS.isSpeaking, browserTTS.currentMessageId]
  );

  // Check if specific message is loading (AI TTS fetching audio)
  const isMessageLoading = useCallback(
    (messageId: string) => {
      return isLoading && currentAIMessageIdRef.current === messageId;
    },
    [isLoading]
  );

  // Combined state
  const isSpeaking = settings.useAI && isAIAvailable ? isAISpeaking : browserTTS.isSpeaking;
  const currentMessageId = settings.useAI && isAIAvailable
    ? currentAIMessageIdRef.current
    : browserTTS.currentMessageId;
  const error = aiError || browserTTS.error;

  const clearError = useCallback(() => {
    setAIError(null);
    browserTTS.clearError();
  }, [browserTTS]);

  const value: TTSContextType = {
    // Settings
    ttsEnabled: settings.enabled,
    setTTSEnabled,
    autoSpeak: settings.autoSpeak,
    setAutoSpeak,
    speechRate: settings.rate,
    setSpeechRate,
    useAI: settings.useAI,
    setUseAI,
    aiVoice: settings.aiVoice,
    setAIVoice,

    // Runtime state
    isSupported: browserTTS.isSupported,
    isAIAvailable,
    isSpeaking,
    isPaused: browserTTS.isPaused,
    isLoading,
    currentMessageId,
    error,

    // Actions
    speak,
    stop: stopAll,
    pause: browserTTS.pause,
    resume: browserTTS.resume,
    clearError,
    isMessageSpeaking,
    isMessageLoading,
    checkAIAvailability,
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
