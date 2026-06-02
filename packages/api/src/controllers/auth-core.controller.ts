import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { credentialsService } from '../services/credentials.instance';
import { emailService } from '../services/email.service';
import { telegramService } from '../services/telegram.instance';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { scheduleKsefContractorSync } from './helpers/ksef-login-sync';

export class AuthCoreController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const tokens = await authService.register(req.body);

      const user = await prisma.user.findUnique({
        where: { email: req.body.email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          locale: true,
          createdAt: true,
        },
      });

      logger.info('User registered successfully', { userId: user?.id, email: user?.email });

      if (user?.email && user?.firstName) {
        emailService.sendWelcomeEmail(user.email, user.firstName, user.locale || 'en')
          .catch((err) => logger.warn('Failed to send welcome email', { email: user.email, error: err }));
        telegramService.notifyNewUser(user.email, user.firstName, 'email', req.body.subscribeToPro ? 'pro' : 'free');
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          userId: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          locale: user?.locale,
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already registered')) {
          logger.warn('Registration attempt with existing email', { email: req.body.email });
          res.status(409).json({ success: false, error: 'Conflict', message: error.message });
          return;
        }
        logger.error('Registration failed', { error: error.message, email: req.body.email });
        res.status(400).json({ success: false, error: 'Registration Failed', message: error.message });
        return;
      }
      logger.error('Unexpected error during registration', { error });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const tokens = await authService.login(req.body);

      const user = await prisma.user.findUnique({
        where: { email: req.body.email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isFirstLogin: true,
        },
      });

      const wfirmaEnabled = user ? await credentialsService.hasWFirmaEnabled(user.id) : false;

      logger.info('User logged in successfully', { userId: user?.id, email: user?.email });

      if (wfirmaEnabled && user?.id) {
        scheduleKsefContractorSync(user.id);
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          userId: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          isFirstLogin: user?.isFirstLogin ?? false,
          wfirmaEnabled,
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.warn('Login failed', { error: error.message, email: req.body.email });
        res.status(401).json({ success: false, error: 'Authentication Failed', message: error.message });
        return;
      }
      logger.error('Unexpected error during login', { error });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, locale } = req.body;
      const result = await authService.requestPasswordReset(email, locale || 'en');

      logger.info('Password reset requested', { email, emailSent: result.emailSent });

      const isDev = process.env.NODE_ENV !== 'production';

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        emailSent: result.emailSent,
        ...(isDev && result.resetLink && { resetLink: result.resetLink }),
        ...(isDev && result.emailError && { emailError: result.emailError }),
      });
    } catch (error) {
      logger.error('Error processing password reset request', { error });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;
      await authService.resetPassword(token, password);

      logger.info('Password reset successful');

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.',
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.warn('Password reset failed', { error: error.message });

        if (error.message.includes('Invalid or expired')) {
          res.status(400).json({
            success: false,
            error: 'Invalid Token',
            message: 'The password reset link is invalid or has expired. Please request a new one.',
          });
          return;
        }

        if (error.message.includes('does not meet requirements')) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Password does not meet the security requirements.',
          });
          return;
        }

        res.status(400).json({ success: false, error: 'Reset Failed', message: error.message });
        return;
      }
      logger.error('Unexpected error during password reset', { error });
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An unexpected error occurred' });
    }
  }
}

export const authCoreController = new AuthCoreController();
