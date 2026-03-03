/**
 * AI Chat Service Utilities
 * Language detection and helper functions
 */

import { Locale } from '../../i18n';

/**
 * Detect locale from user message text
 * Uses simple heuristics: Cyrillic = Russian, Polish diacritics = Polish, else English
 */
export function detectLocale(text: string): Locale {
  // Check for Cyrillic characters (Russian)
  const cyrillicPattern = /[\u0400-\u04FF]/;
  if (cyrillicPattern.test(text)) {
    return 'ru';
  }

  // Check for Polish-specific diacritics
  const polishPattern = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
  if (polishPattern.test(text)) {
    return 'pl';
  }

  // Default to English for Latin text without Polish diacritics
  return 'en';
}

/**
 * Generate a default conversation title
 */
export function generateConversationTitle(): string {
  const now = new Date();
  return `Chat ${now.toLocaleDateString('pl-PL')} ${now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Generate title from first message
 */
export function generateTitleFromMessage(message: string): string {
  const truncated = message.substring(0, 50);
  return truncated.length < message.length ? `${truncated}...` : truncated;
}

/**
 * Sanitize user-controlled or external data before embedding in AI prompts.
 * Strips markdown structural elements (headings, bold, italic) that could be
 * interpreted as prompt instructions rather than data content.
 */
export function sanitizeForPrompt(value: string, maxLength = 500): string {
  return value
    .slice(0, maxLength)
    .replace(/^#{1,6}\s+/gm, '')       // strip markdown headings
    .replace(/\*\*(.*?)\*\*/g, '$1')   // strip bold (**)
    .replace(/__(.*?)__/g, '$1')       // strip bold (__)
    .replace(/\*(.*?)\*/g, '$1')       // strip italic (*)
    .replace(/_(.*?)_/g, '$1')         // strip italic (_)
    .trim();
}
