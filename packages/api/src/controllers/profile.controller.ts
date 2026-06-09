import { Request, Response } from 'express';
import { credentialsService } from '../services/credentials.instance';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export class ProfileController {
  async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          google: { visible: !!process.env.GOOGLE_CLIENT_ID },
        },
      });
    } catch (error) {
      logger.error('Error fetching auth config', { error });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        logger.warn('Profile access attempt without authentication');
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          locale: true,
          role: true,
          googleId: true,
          wfirmaConfig: true,
          organizationId: true,
          orgRole: true,
          orgMembershipStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        logger.error('User not found in database', { userId });
        res.status(404).json({ success: false, error: 'Not Found', message: 'User not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          locale: user.locale,
          role: user.role,
          hasGoogleAuth: !!user.googleId,
          company: user.wfirmaConfig,
          organizationId: user.organizationId,
          orgRole: user.orgRole,
          orgMembershipStatus: user.orgMembershipStatus,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error fetching user profile', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      const { firstName, lastName, locale } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(locale !== undefined && { locale }),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          locale: true,
          role: true,
          googleId: true,
          wfirmaConfig: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info('User profile updated', { userId });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          locale: updatedUser.locale,
          role: updatedUser.role,
          hasGoogleAuth: !!updatedUser.googleId,
          company: updatedUser.wfirmaConfig,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating user profile', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }

  async markFirstLoginComplete(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isFirstLogin: false },
      });

      logger.info('First login marked complete', { userId });

      res.status(200).json({ success: true, message: 'First login marked complete' });
    } catch (error) {
      logger.error('Error marking first login complete', { error, userId: req.user?.userId });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }

  async getPublicLLMModels(req: Request, res: Response): Promise<void> {
    try {
      const { provider, apiKey } = req.query;

      if (!provider || !apiKey) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Provider and apiKey are required' });
        return;
      }

      if (provider !== 'openai' && provider !== 'google') {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid provider. Must be "openai" or "google"' });
        return;
      }

      const models = await credentialsService.getAvailableModels(
        provider as 'openai' | 'google',
        apiKey as string
      );

      res.status(200).json({ success: true, data: { models } });
    } catch (error) {
      logger.error('Error fetching LLM models', { error });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch models from provider' });
    }
  }
}

export const profileController = new ProfileController();
