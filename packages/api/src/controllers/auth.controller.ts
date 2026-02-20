import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { credentialsService } from '../services/credentials.instance';
import { emailService } from '../services/email.service';
import { telegramService } from '../services/telegram.instance';
import { ksefContractorService } from '../services/ksef/contractor.instance';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  email: string | null;
  name: string | null;
  login: string;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  picture?: string;
}

export class AuthController {
  /**
   * GET /api/auth/config
   * Get public auth configuration (OAuth visibility settings)
   */
  async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = {
        github: {
          visible: process.env.GITHUB_CLIENT_VISIBLE === 'true',
        },
        google: {
          visible: !!process.env.GOOGLE_CLIENT_ID,
        },
      };

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Error fetching auth config', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const tokens = await authService.register(req.body);

      // Get user data
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

      // Send welcome email (don't await - send in background)
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
        // Check for duplicate email
        if (error.message.includes('already registered')) {
          logger.warn('Registration attempt with existing email', { email: req.body.email });
          res.status(409).json({
            success: false,
            error: 'Conflict',
            message: error.message,
          });
          return;
        }

        logger.error('Registration failed', { error: error.message, email: req.body.email });
        res.status(400).json({
          success: false,
          error: 'Registration Failed',
          message: error.message,
        });
        return;
      }

      logger.error('Unexpected error during registration', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/login
   * Login existing user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const tokens = await authService.login(req.body);

      // Get user data (full object to access isFirstLogin after migration)
      const user = await prisma.user.findUnique({
        where: { email: req.body.email },
      });

      // Check if user has wFirma enabled
      const wfirmaEnabled = user ? await credentialsService.hasWFirmaEnabled(user.id) : false;

      // Get isFirstLogin (will be available after migration)
      const isFirstLogin = (user as any)?.isFirstLogin ?? false;

      logger.info('User logged in successfully', { userId: user?.id, email: user?.email });

      // Background sync of KSeF contractors (fire-and-forget)
      if (wfirmaEnabled && user?.id) {
        ksefContractorService.syncFromWFirma(user.id)
          .then(result => logger.info('KSeF contractor sync on login', { userId: user!.id, synced: result.synced }))
          .catch(err => logger.warn('KSeF contractor sync failed (non-fatal)', { userId: user!.id, error: (err as Error).message }));
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          userId: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          isFirstLogin,
          wfirmaEnabled,
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.warn('Login failed', { error: error.message, email: req.body.email });
        res.status(401).json({
          success: false,
          error: 'Authentication Failed',
          message: error.message,
        });
        return;
      }

      logger.error('Unexpected error during login', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      const tokens = await authService.refreshToken(refreshToken);

      logger.info('Token refreshed successfully');

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.warn('Token refresh failed', { error: error.message });
        res.status(401).json({
          success: false,
          error: 'Token Refresh Failed',
          message: error.message,
        });
        return;
      }

      logger.error('Unexpected error during token refresh', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user (invalidate refresh token)
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        logger.warn('Logout attempt without authentication');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      await authService.logout(userId);

      logger.info('User logged out successfully', { userId });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout failed', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        logger.warn('Profile access attempt without authentication');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      // Get user from database (excluding sensitive data)
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
          githubId: true,
          wfirmaConfig: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        logger.error('User not found in database', { userId });
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User not found',
        });
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
          hasGithubAuth: !!user.githubId,
          company: user.wfirmaConfig,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error fetching user profile', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * PATCH /api/auth/profile
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
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
          githubId: true,
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
          hasGithubAuth: !!updatedUser.githubId,
          company: updatedUser.wfirmaConfig,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error updating user profile', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/first-login-complete
   * Mark first login as complete (hide welcome modal)
   */
  async markFirstLoginComplete(req: Request, res: Response): Promise<void> {
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

      await prisma.user.update({
        where: { id: userId },
        data: { isFirstLogin: false } as any, // Type will be correct after migration
      });

      logger.info('First login marked complete', { userId });

      res.status(200).json({
        success: true,
        message: 'First login marked complete',
      });
    } catch (error) {
      logger.error('Error marking first login complete', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/oauth/google
   * Google OAuth authentication - verifies access_token with Google and authenticates user
   */
  async googleOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { access_token, locale } = req.body;

      if (!access_token) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Access token is required',
        });
        return;
      }

      // Verify access token with Google and fetch user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        logger.error('Google token verification failed', { status: userInfoResponse.status });
        res.status(401).json({
          success: false,
          error: 'OAuth Failed',
          message: 'Invalid or expired Google access token',
        });
        return;
      }

      const userData = (await userInfoResponse.json()) as GoogleUserInfo;

      if (!userData.email || !userData.verified_email) {
        res.status(400).json({
          success: false,
          error: 'OAuth Failed',
          message: 'Could not retrieve verified email from Google',
        });
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

      // Background sync of KSeF contractors on OAuth login
      const googleOAuthUser = await prisma.user.findUnique({ where: { email: profile.email }, select: { id: true } });
      if (googleOAuthUser) {
        credentialsService.hasWFirmaEnabled(googleOAuthUser.id).then(enabled => {
          if (enabled) {
            ksefContractorService.syncFromWFirma(googleOAuthUser.id)
              .catch(err => logger.warn('KSeF contractor sync failed (non-fatal)', { userId: googleOAuthUser.id, error: (err as Error).message }));
          }
        }).catch(() => {});
      }

      res.status(200).json({
        success: true,
        message: 'OAuth authentication successful',
        data: tokens,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Google OAuth failed', { error: error.message });
        res.status(400).json({
          success: false,
          error: 'OAuth Failed',
          message: error.message,
        });
        return;
      }

      logger.error('Unexpected error during Google OAuth', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/oauth/github
   * GitHub OAuth authentication
   */
  async githubOAuth(req: Request, res: Response): Promise<void> {
    try {
      const profile = {
        ...req.body,
        provider: 'github' as const,
      };

      const tokens = await authService.findOrCreateOAuthUser(profile);

      logger.info('GitHub OAuth successful', { email: profile.email });

      if (tokens.isNewUser) {
        telegramService.notifyNewUser(profile.email, profile.name || profile.email, 'github');
      }

      // Background sync of KSeF contractors on OAuth login
      const githubOAuthUser = await prisma.user.findUnique({ where: { email: profile.email }, select: { id: true } });
      if (githubOAuthUser) {
        credentialsService.hasWFirmaEnabled(githubOAuthUser.id).then(enabled => {
          if (enabled) {
            ksefContractorService.syncFromWFirma(githubOAuthUser.id)
              .catch(err => logger.warn('KSeF contractor sync failed (non-fatal)', { userId: githubOAuthUser.id, error: (err as Error).message }));
          }
        }).catch(() => {});
      }

      res.status(200).json({
        success: true,
        message: 'OAuth authentication successful',
        data: tokens,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('GitHub OAuth failed', { error: error.message });
        res.status(400).json({
          success: false,
          error: 'OAuth Failed',
          message: error.message,
        });
        return;
      }

      logger.error('Unexpected error during GitHub OAuth', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset email
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, locale } = req.body;

      await authService.requestPasswordReset(email, locale || 'en');

      // Always return success to prevent email enumeration
      logger.info('Password reset requested', { email });

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      logger.error('Error processing password reset request', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password using token
   */
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

        res.status(400).json({
          success: false,
          error: 'Reset Failed',
          message: error.message,
        });
        return;
      }

      logger.error('Unexpected error during password reset', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * POST /api/auth/complete-profile
   * Complete OAuth user profile with LLM and optional wFirma credentials
   */
  async completeProfile(req: Request, res: Response): Promise<void> {
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

      const { llmProvider, llmApiKey, llmModel, useWfirma, wfirmaAccessKey, wfirmaSecretKey, wfirmaCompanyId } = req.body;

      // Save LLM credentials
      try {
        await credentialsService.setLLMCredentials(userId, {
          provider: llmProvider,
          apiKey: llmApiKey,
          model: llmModel,
        });
        logger.info('LLM credentials saved during profile completion', { userId, provider: llmProvider, model: llmModel });
      } catch (error) {
        logger.error('Failed to save LLM credentials during profile completion', { userId, error: (error as Error).message });
        res.status(400).json({
          success: false,
          error: 'Credentials Error',
          message: (error as Error).message,
        });
        return;
      }

      // Save wFirma credentials if provided
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
          // Log warning but don't fail - LLM credentials are already saved
          logger.warn('Failed to save wFirma credentials during profile completion', { userId, error: (error as Error).message });
        }
      }

      logger.info('Profile completed successfully', { userId });

      res.status(200).json({
        success: true,
        message: 'Profile completed successfully',
      });
    } catch (error) {
      logger.error('Error completing profile', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }

  /**
   * GET /api/auth/llm-models
   * Fetch available LLM models for registration (public endpoint)
   */
  async getPublicLLMModels(req: Request, res: Response): Promise<void> {
    try {
      const { provider, apiKey } = req.query;

      if (!provider || !apiKey) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Provider and apiKey are required',
        });
        return;
      }

      if (provider !== 'openai' && provider !== 'google') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid provider. Must be "openai" or "google"',
        });
        return;
      }

      const models = await credentialsService.getAvailableModels(
        provider as 'openai' | 'google',
        apiKey as string
      );

      res.status(200).json({
        success: true,
        data: { models },
      });
    } catch (error) {
      logger.error('Error fetching LLM models', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch models from provider',
      });
    }
  }

  /**
   * POST /api/auth/oauth/github/callback
   * Exchange GitHub authorization code for access token and authenticate user
   */
  async githubOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, locale } = req.body;

      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Authorization code is required',
        });
        return;
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = (await tokenResponse.json()) as GitHubTokenResponse;

      if (tokenData.error) {
        logger.error('GitHub token exchange failed', { error: tokenData.error });
        res.status(400).json({
          success: false,
          error: 'OAuth Failed',
          message: tokenData.error_description || 'Failed to exchange authorization code',
        });
        return;
      }

      // Fetch user profile from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const userData = (await userResponse.json()) as GitHubUserResponse;

      // Fetch user email (may be private)
      let email = userData.email;
      if (!email) {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });
        const emails = (await emailsResponse.json()) as GitHubEmail[];
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        email = primaryEmail?.email ?? null;
      }

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'OAuth Failed',
          message: 'Could not retrieve email from GitHub. Please ensure your email is verified.',
        });
        return;
      }

      const profile = {
        id: String(userData.id),
        email,
        name: userData.name || userData.login,
        picture: userData.avatar_url,
        provider: 'github' as const,
      };

      const tokens = await authService.findOrCreateOAuthUser(profile, locale);

      logger.info('GitHub OAuth callback successful', { email: profile.email });

      if (tokens.isNewUser) {
        telegramService.notifyNewUser(profile.email, profile.name || profile.email, 'github');
      }

      // Background sync of KSeF contractors on OAuth login
      const githubCallbackUser = await prisma.user.findUnique({ where: { email: profile.email }, select: { id: true } });
      if (githubCallbackUser) {
        credentialsService.hasWFirmaEnabled(githubCallbackUser.id).then(enabled => {
          if (enabled) {
            ksefContractorService.syncFromWFirma(githubCallbackUser.id)
              .catch(err => logger.warn('KSeF contractor sync failed (non-fatal)', { userId: githubCallbackUser.id, error: (err as Error).message }));
          }
        }).catch(() => {});
      }

      res.status(200).json({
        success: true,
        message: 'OAuth authentication successful',
        data: tokens,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('GitHub OAuth callback failed', { error: error.message });
        res.status(400).json({
          success: false,
          error: 'OAuth Failed',
          message: error.message,
        });
        return;
      }

      logger.error('Unexpected error during GitHub OAuth callback', { error });
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    }
  }
}

export const authController = new AuthController();
