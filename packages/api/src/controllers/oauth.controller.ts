import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { credentialsService } from '../services/credentials.instance';
import { telegramService } from '../services/telegram.instance';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { scheduleKsefContractorSync } from './helpers/ksef-login-sync';

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  picture?: string;
}

export class OAuthController {
  async googleOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { access_token, locale } = req.body;

      if (!access_token) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Access token is required' });
        return;
      }

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!userInfoResponse.ok) {
        logger.error('Google token verification failed', { status: userInfoResponse.status });
        res.status(401).json({ success: false, error: 'OAuth Failed', message: 'Invalid or expired Google access token' });
        return;
      }

      const userData = (await userInfoResponse.json()) as GoogleUserInfo;

      if (!userData.email || !userData.verified_email) {
        res.status(400).json({ success: false, error: 'OAuth Failed', message: 'Could not retrieve verified email from Google' });
        return;
      }

      const profile = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        provider: 'google' as const,
      };

      const tokens = await authService.findOrCreateOAuthUser(profile, locale);

      logger.info('Google OAuth successful', { email: profile.email });

      if (tokens.isNewUser) {
        telegramService.notifyNewUser(profile.email, profile.name || profile.email, 'google');
      }

      const googleOAuthUser = await prisma.user.findUnique({
        where: { email: profile.email },
        select: { id: true },
      });
      if (googleOAuthUser) {
        scheduleKsefContractorSync(googleOAuthUser.id);
      }

      res.status(200).json({
        success: true,
        message: 'OAuth authentication successful',
        data: tokens,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Google OAuth failed', { error: error.message });
        res.status(400).json({ success: false, error: 'OAuth Failed', message: error.message });
        return;
      }
      logger.error('Unexpected error during Google OAuth', { error });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }

  async completeProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      const { llmProvider, llmApiKey, llmModel, useWfirma, wfirmaAccessKey, wfirmaSecretKey, wfirmaCompanyId } = req.body;

      try {
        await credentialsService.setLLMCredentials(userId, {
          provider: llmProvider,
          apiKey: llmApiKey,
          model: llmModel,
        });
        logger.info('LLM credentials saved during profile completion', { userId, provider: llmProvider, model: llmModel });
      } catch (error) {
        logger.error('Failed to save LLM credentials during profile completion', { userId, error: (error as Error).message });
        res.status(400).json({ success: false, error: 'Credentials Error', message: (error as Error).message });
        return;
      }

      const hasWfirmaCredentials = useWfirma && wfirmaAccessKey && wfirmaSecretKey && wfirmaCompanyId;
      if (hasWfirmaCredentials) {
        try {
          await credentialsService.setWFirmaCredentials(userId, {
            accessKey: wfirmaAccessKey,
            secretKey: wfirmaSecretKey,
            companyId: wfirmaCompanyId,
          });
          logger.info('wFirma credentials saved during profile completion', { userId });
        } catch (error) {
          logger.warn('Failed to save wFirma credentials during profile completion', { userId, error: (error as Error).message });
        }
      }

      logger.info('Profile completed successfully', { userId });

      res.status(200).json({ success: true, message: 'Profile completed successfully' });
    } catch (error) {
      logger.error('Error completing profile', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }
}

export const oauthController = new OAuthController();
