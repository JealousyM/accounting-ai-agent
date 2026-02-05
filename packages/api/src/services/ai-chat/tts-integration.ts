/**
 * TTS Integration for LangGraph AI Pipeline
 * Generates TTS audio as part of the AI response flow
 * Tracks costs in database for reliable billing
 */

import { PrismaClient } from '@prisma/client';
import { traceable } from 'langsmith/traceable';
import { TTSService, TTSVoice } from '../tts.service';
import { logger } from '../../utils/logger';
import { Locale, TTSMetadata, TTSSkipReason } from '../../types/ai-chat.types';

// TTS pricing constants
const TTS_COST_PER_1K_CHARS = 0.015; // $0.015 per 1K characters for tts-1

export class TTSIntegration {
  constructor(
    private readonly ttsService: TTSService,
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Generate TTS audio for AI response
   * Called after LangGraph produces a response
   * Traced in LangSmith for observability
   */
  async generateForResponse(
    userId: string,
    responseText: string,
    locale: Locale
  ): Promise<TTSMetadata> {
    // Check if TTS should be skipped for this content
    const skipReason = this.shouldSkipTTS(responseText);
    if (skipReason) {
      logger.debug('TTS skipped', { userId, skipReason, textLength: responseText.length });
      return { locale, skipped: true, skipReason };
    }

    // Calculate cost
    const characterCount = responseText.length;
    const estimatedCostUSD = (characterCount / 1000) * TTS_COST_PER_1K_CHARS;

    // Use traceable wrapper for LangSmith visibility
    const generateWithTracing = traceable(
      async (text: string, voice: TTSVoice): Promise<{ result: TTSMetadata; usage: object }> => {
        const audioBuffer = await this.ttsService.synthesize(userId, text, {
          voice,
          model: 'tts-1',
        });

        const audioBase64 = audioBuffer.toString('base64');

        // Return both result and usage info for LangSmith cost tracking
        return {
          result: {
            locale,
            audioBase64,
          },
          usage: {
            characters: characterCount,
            cost_usd: parseFloat(estimatedCostUSD.toFixed(6)),
            model: 'tts-1',
            voice,
          },
        };
      },
      {
        name: 'tts_synthesis',
        run_type: 'llm', // Use 'llm' type so LangSmith shows cost column
        metadata: {
          userId,
          locale,
          model: 'tts-1',
          characters: characterCount,
          estimated_cost_usd: parseFloat(estimatedCostUSD.toFixed(6)),
          pricing: '$0.015 per 1K characters',
        },
        tags: [`user:${userId}`], // Required for LangSmith cost dashboard queries
      }
    );

    try {
      const voice = this.getVoiceForLocale(locale);

      logger.info('TTS integration: generating audio', {
        userId,
        locale,
        voice,
        textLength: responseText.length,
      });

      const { result, usage } = await generateWithTracing(responseText, voice);

      // Save TTS cost to database for reliable tracking
      await this.saveTTSCost(userId, characterCount, estimatedCostUSD);

      logger.info('TTS integration: audio generated', {
        userId,
        audioSize: result.audioBase64?.length || 0,
        usage,
        costSaved: true,
      });

      return result;
    } catch (error) {
      const message = (error as Error).message;
      logger.warn('TTS integration: generation failed', { error: message, userId });

      let skipReason: TTSSkipReason = 'error';
      if (message.includes('API key not configured')) {
        skipReason = 'no_api_key';
      }

      return { locale, skipped: true, skipReason };
    }
  }

  /**
   * Determine if TTS should be skipped for this content
   */
  private shouldSkipTTS(text: string): TTSSkipReason | null {
    // Skip for code-heavy responses (4+ code block markers = 2+ code blocks)
    const codeBlocks = (text.match(/```/g) || []).length;
    if (codeBlocks >= 4) {
      return 'code_heavy';
    }

    // Skip for table-heavy responses (markdown tables with many pipes)
    const pipes = (text.match(/\|/g) || []).length;
    if (pipes > 20) {
      return 'table_content';
    }

    // Skip for very short responses (likely just acknowledgments)
    if (text.trim().length < 10) {
      return 'disabled';
    }

    return null;
  }

  /**
   * Select OpenAI TTS voice based on locale
   * Nova works well for all supported languages
   */
  private getVoiceForLocale(locale: Locale): TTSVoice {
    const voiceMap: Record<Locale, TTSVoice> = {
      en: 'nova',
      pl: 'nova',
      ru: 'nova',
    };
    return voiceMap[locale] || 'nova';
  }

  /**
   * Save TTS cost to database for reliable tracking
   */
  private async saveTTSCost(userId: string, characters: number, costUsd: number): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ttsCharactersUsed: { increment: characters },
          ttsCostUsd: { increment: costUsd },
        },
      });
      logger.debug('TTS cost saved to database', { userId, characters, costUsd });
    } catch (error) {
      // Log but don't fail the TTS request if cost tracking fails
      logger.error('Failed to save TTS cost to database', {
        error: error instanceof Error ? error.message : error,
        userId,
        characters,
        costUsd,
      });
    }
  }
}
