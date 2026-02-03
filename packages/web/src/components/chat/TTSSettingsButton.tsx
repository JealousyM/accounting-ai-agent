'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTTS } from '@/contexts/TTSContext';

interface TTSTranslations {
  settings: string;
  enabled: string;
  enabledHint: string;
  autoSpeak: string;
  autoSpeakHint: string;
  rate: string;
  rateSlow: string;
  rateNormal: string;
  rateFast: string;
  notSupported: string;
}

interface TTSSettingsButtonProps {
  translations: TTSTranslations;
}

export function TTSSettingsButton({ translations }: TTSSettingsButtonProps) {
  const {
    isSupported,
    ttsEnabled,
    setTTSEnabled,
    autoSpeak,
    setAutoSpeak,
    speechRate,
    setSpeechRate,
    isSpeaking,
    stop,
  } = useTTS();

  const [isOpen, setIsOpen] = useState(false);

  if (!isSupported) {
    return null;
  }

  const handleToggle = () => {
    if (isSpeaking) {
      stop();
    }
    setTTSEnabled(!ttsEnabled);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 ${
          ttsEnabled
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400'
        } hover:text-gray-900 dark:hover:text-gray-100`}
        title={translations.settings}
      >
        {ttsEnabled ? (
          <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </Button>

      {/* Settings Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  {translations.settings}
                </h3>
              </div>

              {/* Enable/Disable TTS */}
              <div className="mb-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {translations.enabled}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {translations.enabledHint}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggle}
                    className={`
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                      transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${ttsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                        transition duration-200 ease-in-out
                        ${ttsEnabled ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </label>
              </div>

              {/* Auto-speak Toggle */}
              <div className="mb-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {translations.autoSpeak}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {translations.autoSpeakHint}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    disabled={!ttsEnabled}
                    className={`
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                      transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${!ttsEnabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${autoSpeak && ttsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                        transition duration-200 ease-in-out
                        ${autoSpeak && ttsEnabled ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </label>
              </div>

              {/* Speech Rate Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {translations.rate}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{translations.rateSlow}</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    disabled={!ttsEnabled}
                    className={`
                      flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer
                      ${!ttsEnabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  />
                  <span className="text-xs text-gray-500">{translations.rateFast}</span>
                </div>
                <div className="text-center text-xs text-gray-500 mt-1">
                  {speechRate.toFixed(1)}x
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
