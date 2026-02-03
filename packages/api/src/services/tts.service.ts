/**
 * TTS Service
 * Provides text-to-speech synthesis using OpenAI TTS API
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { credentialsService } from './credentials.instance';

// OpenAI TTS voice options
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

// OpenAI TTS model options
export type TTSModel = 'tts-1' | 'tts-1-hd';

export interface TTSSynthesizeOptions {
  voice?: TTSVoice;
  model?: TTSModel;
}

// Max characters per request (OpenAI limit is 4096)
const MAX_TEXT_LENGTH = 4096;

export class TTSService {
  /**
   * Get OpenAI API key for TTS
   * Priority: 1) User's own OpenAI key, 2) App's OpenAI key from env
   */
  private async getOpenAIKey(userId: string): Promise<string | null> {
    // First, try user's own OpenAI key
    const credentials = await credentialsService.getLLMCredentials(userId);

    if (credentials?.provider === 'openai' && credentials.apiKey) {
      return credentials.apiKey;
    }

    // Fallback to app's OpenAI key (available for all authenticated users)
    const appKey = process.env.OPENAI_API_KEY;
    if (appKey) {
      return appKey;
    }

    return null;
  }

  /**
   * Synthesize text to speech using OpenAI TTS API
   * @param userId - User ID to get API credentials
   * @param text - Text to synthesize (max 4096 chars)
   * @param options - Voice and model options
   * @returns Audio buffer (MP3)
   */
  async synthesize(
    userId: string,
    text: string,
    options: TTSSynthesizeOptions = {}
  ): Promise<Buffer> {
    const { voice = 'nova', model = 'tts-1' } = options;

    // Get OpenAI API key (user's own or app's)
    const apiKey = await this.getOpenAIKey(userId);

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Validate text length
    if (text.length > MAX_TEXT_LENGTH) {
      logger.warn('TTS text truncated', {
        originalLength: text.length,
        maxLength: MAX_TEXT_LENGTH,
      });
      text = text.substring(0, MAX_TEXT_LENGTH);
    }

    // Strip markdown and clean up text for better speech
    const cleanText = this.stripMarkdown(text);

    if (!cleanText.trim()) {
      throw new Error('Text is empty after cleanup');
    }

    try {
      const client = new OpenAI({ apiKey });

      logger.info('TTS synthesis started', {
        userId,
        textLength: cleanText.length,
        voice,
        model,
      });

      const response = await client.audio.speech.create({
        model,
        voice,
        input: cleanText,
        response_format: 'mp3',
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      logger.info('TTS synthesis completed', {
        userId,
        audioSize: buffer.length,
      });

      return buffer;
    } catch (error) {
      logger.error('TTS synthesis failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error('Invalid OpenAI API key');
        }
        if (error.status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again later.');
        }
        if (error.status === 400) {
          throw new Error('Invalid TTS request: ' + error.message);
        }
      }

      throw error;
    }
  }

  /**
   * Check if user can use TTS (has access to OpenAI API key)
   */
  async canUseTTS(userId: string): Promise<boolean> {
    const apiKey = await this.getOpenAIKey(userId);
    return !!apiKey;
  }

  /**
   * Strip markdown formatting for cleaner speech
   */
  private stripMarkdown(text: string): string {
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
}
