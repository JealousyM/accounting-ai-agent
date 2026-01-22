import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

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

      // Get user data
      const user = await prisma.user.findUnique({
        where: { email: req.body.email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      logger.info('User logged in successfully', { userId: user?.id, email: user?.email });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          userId: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
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
   * POST /api/auth/oauth/google
   * Google OAuth authentication
   */
  async googleOAuth(req: Request, res: Response): Promise<void> {
    try {
      const profile = {
        ...req.body,
        provider: 'google' as const,
      };

      const tokens = await authService.findOrCreateOAuthUser(profile);

      logger.info('Google OAuth successful', { email: profile.email });

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
   * POST /api/auth/oauth/github/callback
   * Exchange GitHub authorization code for access token and authenticate user
   */
  async githubOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;

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

      const tokenData = await tokenResponse.json();

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

      const userData = await userResponse.json();

      // Fetch user email (may be private)
      let email = userData.email;
      if (!email) {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find((e: { primary: boolean; verified: boolean; email: string }) => e.primary && e.verified);
        email = primaryEmail?.email;
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

      const tokens = await authService.findOrCreateOAuthUser(profile);

      logger.info('GitHub OAuth callback successful', { email: profile.email });

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
