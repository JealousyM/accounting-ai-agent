import { Request, Response } from 'express';
import { credentialsService } from '../services/credentials.instance';
import { logger } from '../utils/logger';
import { CryptoService } from '../services/crypto.service';

export class CredentialsController {
  /**
   * GET /api/credentials
   * Get user's credential settings (masked)
   */
  async getCredentials(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const summary = await credentialsService.getCredentialsSummary(userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error fetching credentials', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch credentials',
      });
    }
  }

  /**
   * PUT /api/credentials/wfirma
   * Set or update wFirma credentials
   */
  async setWFirmaCredentials(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { accessKey, secretKey, companyId } = req.body;

      await credentialsService.setWFirmaCredentials(userId, {
        accessKey,
        secretKey,
        companyId,
      });

      logger.info('wFirma credentials updated', {
        userId,
        companyId: CryptoService.mask(companyId),
      });

      res.status(200).json({
        success: true,
        message: 'wFirma credentials saved successfully',
      });
    } catch (error) {
      const message = (error as Error).message;
      logger.error('Error setting wFirma credentials', { error, userId: req.user?.userId });

      if (message.includes('Invalid wFirma credentials')) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid wFirma credentials - please check your access key, secret key, and company ID',
        });
        return;
      }

      if (message.includes('Encryption not configured')) {
        res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          message: 'Credential storage is not configured',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to save wFirma credentials',
      });
    }
  }

  /**
   * DELETE /api/credentials/wfirma
   * Remove wFirma credentials
   */
  async removeWFirmaCredentials(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      await credentialsService.removeWFirmaCredentials(userId);

      logger.info('wFirma credentials removed', { userId });

      res.status(200).json({
        success: true,
        message: 'wFirma credentials removed successfully',
      });
    } catch (error) {
      logger.error('Error removing wFirma credentials', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to remove wFirma credentials',
      });
    }
  }

  /**
   * PUT /api/credentials/llm
   * Set or update LLM credentials
   */
  async setLLMCredentials(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const { provider, apiKey } = req.body;

      await credentialsService.setLLMCredentials(userId, {
        provider,
        apiKey,
      });

      logger.info('LLM credentials updated', { userId, provider });

      res.status(200).json({
        success: true,
        message: `${provider} API key saved successfully`,
      });
    } catch (error) {
      const message = (error as Error).message;
      logger.error('Error setting LLM credentials', { error, userId: req.user?.userId });

      if (message.includes('Invalid') && message.includes('API key')) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid API key - authentication failed',
        });
        return;
      }

      if (message.includes('Encryption not configured')) {
        res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          message: 'Credential storage is not configured',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to save LLM credentials',
      });
    }
  }

  /**
   * DELETE /api/credentials/llm
   * Remove LLM credentials
   */
  async removeLLMCredentials(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      await credentialsService.removeLLMCredentials(userId);

      logger.info('LLM credentials removed', { userId });

      res.status(200).json({
        success: true,
        message: 'LLM credentials removed successfully',
      });
    } catch (error) {
      logger.error('Error removing LLM credentials', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to remove LLM credentials',
      });
    }
  }
}

export const credentialsController = new CredentialsController();
