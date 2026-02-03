/**
 * TTS Routes
 * API endpoints for text-to-speech synthesis
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';
import { TTSVoice, TTSModel } from '../services/tts.service';
import { ttsService } from '../services/tts.instance';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schema for TTS request
const ttsRequestSchema = z.object({
  text: z.string().min(1).max(4096),
  voice: z
    .enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
    .optional()
    .default('nova'),
  model: z.enum(['tts-1', 'tts-1-hd']).optional().default('tts-1'),
});

/**
 * POST /api/tts/speak
 * Synthesize text to speech using OpenAI TTS
 */
router.post(
  '/speak',
  rateLimiter({ windowMs: 60 * 1000, max: 20 }), // 20 per minute
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate request body
      const parsed = ttsRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parsed.error.errors,
        });
      }

      const { text, voice, model } = parsed.data;

      // Synthesize audio
      const audioBuffer = await ttsService.synthesize(userId, text, {
        voice: voice as TTSVoice,
        model: model as TTSModel,
      });

      // Send audio response
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      });

      return res.send(audioBuffer);
    } catch (error) {
      logger.error('TTS endpoint error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'TTS synthesis failed';

      // Specific error handling
      if (message.includes('API key not configured')) {
        return res.status(400).json({ error: 'OpenAI API key not configured' });
      }
      if (message.includes('requires OpenAI provider')) {
        return res.status(400).json({ error: message });
      }
      if (message.includes('Invalid OpenAI API key')) {
        return res.status(401).json({ error: 'Invalid OpenAI API key' });
      }
      if (message.includes('rate limit')) {
        return res.status(429).json({ error: message });
      }

      return res.status(500).json({ error: 'TTS synthesis failed' });
    }
  }
);

/**
 * GET /api/tts/status
 * Check if user can use TTS (has valid OpenAI credentials)
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const canUse = await ttsService.canUseTTS(userId);

    return res.json({
      available: canUse,
      voices: canUse
        ? ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
        : [],
    });
  } catch (error) {
    logger.error('TTS status check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId,
    });

    return res.status(500).json({ error: 'Failed to check TTS status' });
  }
});

export default router;
