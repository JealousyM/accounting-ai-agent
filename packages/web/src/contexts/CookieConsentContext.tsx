'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export interface CookiePreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsentState {
  hasConsented: boolean;
  preferences: CookiePreferences;
  consentTimestamp: string | null;
}

interface CookieConsentStorage {
  version: string;
  timestamp: string;
  preferences: CookiePreferences;
}

interface CookieConsentContextType {
  state: CookieConsentState;
  showBanner: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (preferences: Omit<CookiePreferences, 'necessary'>) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  isPreferencesOpen: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const COOKIE_CONSENT_KEY = 'cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0';

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

// ============================================
// UTILS
// ============================================

function getStoredConsent(): CookieConsentStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as CookieConsentStorage;
    if (parsed.version === COOKIE_CONSENT_VERSION) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveConsentToStorage(preferences: CookiePreferences): CookieConsentStorage {
  const consent: CookieConsentStorage = {
    version: COOKIE_CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    preferences,
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  return consent;
}

// ============================================
// CONTEXT
// ============================================

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface CookieConsentProviderProps {
  children: React.ReactNode;
}

export function CookieConsentProvider({ children }: CookieConsentProviderProps) {
  const [state, setState] = useState<CookieConsentState>({
    hasConsented: false,
    preferences: DEFAULT_PREFERENCES,
    consentTimestamp: null,
  });
  const [showBanner, setShowBanner] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;

    const stored = getStoredConsent();
    if (stored) {
      setState({
        hasConsented: true,
        preferences: stored.preferences,
        consentTimestamp: stored.timestamp,
      });
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }
    setIsInitialized(true);
  }, [isInitialized]);

  const saveConsent = useCallback((preferences: CookiePreferences) => {
    const consent = saveConsentToStorage(preferences);
    setState({
      hasConsented: true,
      preferences,
      consentTimestamp: consent.timestamp,
    });
    setShowBanner(false);
    setIsPreferencesOpen(false);
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: true, marketing: true });
  }, [saveConsent]);

  const rejectAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: false, marketing: false });
  }, [saveConsent]);

  const savePreferences = useCallback(
    (prefs: Omit<CookiePreferences, 'necessary'>) => {
      saveConsent({ necessary: true, ...prefs });
    },
    [saveConsent]
  );

  const openPreferences = useCallback(() => {
    setIsPreferencesOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setIsPreferencesOpen(false);
  }, []);

  const value: CookieConsentContextType = {
    state,
    showBanner,
    acceptAll,
    rejectAll,
    savePreferences,
    openPreferences,
    closePreferences,
    isPreferencesOpen,
  };

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useCookieConsent(): CookieConsentContextType {
  const context = useContext(CookieConsentContext);

  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }

  return context;
}
