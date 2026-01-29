import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { emailService } from './email.service';
import { credentialsService } from './credentials.instance';
import { logger } from '../utils/logger';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const oauthProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
  provider: z.enum(['google', 'github']),
});

// ============================================
// TYPES
// ============================================

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OAuthTokenPair extends TokenPair {
  needsProfileCompletion: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  locale?: string;
  // Optional API credentials
  useWfirma?: boolean;
  wfirmaAccessKey?: string;
  wfirmaSecretKey?: string;
  wfirmaCompanyId?: string;
  llmProvider?: 'openai' | 'google' | 'none';
  llmApiKey?: string;
  llmModel?: string;
  // Subscription option
  subscribeToPro?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface OAuthProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: 'google' | 'github';
}

// ============================================
// AUTH SERVICE
// ============================================

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly JWT_EXPIRES_IN = '15m';
  private readonly JWT_REFRESH_EXPIRES_IN = '7d';
  private readonly SALT_ROUNDS = 10;
  private readonly REDIS_REFRESH_TOKEN_PREFIX = 'refresh_token:';
  private readonly RESET_TOKEN_PREFIX = 'password_reset:';
  private readonly RESET_TOKEN_TTL = 3600; // 1 hour in seconds

  constructor() {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error(
        'SECURITY ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables. ' +
        'Generate secure secrets with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }

    this.JWT_SECRET = jwtSecret;
    this.JWT_REFRESH_SECRET = jwtRefreshSecret;
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<TokenPair> {
    // Validate input
    const validated = registerSchema.parse(input);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, this.SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        locale: input.locale || 'en',
        wfirmaConfig: validated.companyName
          ? JSON.stringify({ companyName: validated.companyName })
          : undefined,
      },
    });

    // Save API credentials if provided
    // wFirma credentials - check if all credentials provided (regardless of checkbox)
    const hasWfirmaCredentials = input.wfirmaAccessKey && input.wfirmaSecretKey && input.wfirmaCompanyId;
    if (hasWfirmaCredentials) {
      try {
        await credentialsService.setWFirmaCredentials(user.id, {
          accessKey: input.wfirmaAccessKey!,
          secretKey: input.wfirmaSecretKey!,
          companyId: input.wfirmaCompanyId!,
        });
        logger.info('wFirma credentials saved during registration', { userId: user.id });
      } catch (error) {
        // Log error but don't fail registration - user can add credentials later
        logger.warn('Failed to save wFirma credentials during registration', { userId: user.id, error: (error as Error).message });
      }
    }

    // LLM credentials
    if (input.llmProvider && input.llmProvider !== 'none' && input.llmApiKey) {
      try {
        await credentialsService.setLLMCredentials(user.id, {
          provider: input.llmProvider,
          apiKey: input.llmApiKey,
          model: input.llmModel,
        });
        logger.info('LLM credentials saved during registration', { userId: user.id, provider: input.llmProvider, model: input.llmModel });
      } catch (error) {
        // Log error but don't fail registration - user can add credentials later
        logger.warn('Failed to save LLM credentials during registration', { userId: user.id, error: (error as Error).message });
      }
    } else if (input.subscribeToPro) {
      // PRO users: auto-provision default LLM credentials from environment
      const defaultProvider = process.env.DEFAULT_LLM_PROVIDER as 'openai' | 'google' | undefined;
      const defaultApiKey = process.env.DEFAULT_LLM_API_KEY;
      const defaultModel = process.env.DEFAULT_LLM_MODEL;

      if (defaultProvider && defaultApiKey) {
        try {
          await credentialsService.setLLMCredentials(user.id, {
            provider: defaultProvider,
            apiKey: defaultApiKey,
            model: defaultModel,
          });
          logger.info('Default LLM credentials provisioned for PRO registration', { userId: user.id, provider: defaultProvider, model: defaultModel });
        } catch (error) {
          logger.warn('Failed to provision default LLM credentials during PRO registration', { userId: user.id, error: (error as Error).message });
        }
      } else {
        logger.warn('PRO registration without LLM credentials: DEFAULT_LLM_PROVIDER or DEFAULT_LLM_API_KEY not configured', { userId: user.id });
      }
    }

    // Generate tokens
    return this.generateTokenPair(user.id, user.email, user.role);
  }

  /**
   * Login existing user
   */
  async login(input: LoginInput): Promise<TokenPair> {
    // Validate input
    const validated = loginSchema.parse(input);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new Error('Please login with OAuth provider');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validated.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    // Generate tokens
    return this.generateTokenPair(user.id, user.email, user.role);
  }

  /**
   * Find or create OAuth user
   */
  async findOrCreateOAuthUser(profile: OAuthProfile, locale?: string): Promise<OAuthTokenPair> {
    // Validate profile
    const validated = oauthProfileSchema.parse(profile);

    const oauthIdField = validated.provider === 'google' ? 'googleId' : 'githubId';

    // Try to find user by OAuth ID
    const whereClause = validated.provider === 'google'
      ? { googleId: validated.id }
      : { githubId: validated.id };

    let user = await prisma.user.findUnique({
      where: whereClause,
    });

    // If not found, try to find by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: validated.email },
      });

      // If found by email, update OAuth ID
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { [oauthIdField]: validated.id },
        });
      }
    }

    // If still not found, create new user
    if (!user) {
      const nameParts = validated.name?.split(' ') || [];
      const firstName = nameParts[0] || validated.email.split('@')[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      user = await prisma.user.create({
        data: {
          email: validated.email,
          googleId: validated.provider === 'google' ? validated.id : undefined,
          githubId: validated.provider === 'github' ? validated.id : undefined,
          firstName,
          lastName,
          locale: locale || 'en',
          wfirmaConfig: validated.picture ? JSON.stringify({ picture: validated.picture }) : undefined,
        },
      });
    }

    // Check if user has LLM credentials configured
    const credentials = await prisma.userApiCredentials.findUnique({
      where: { userId: user.id },
    });
    const needsProfileCompletion = !credentials?.llmApiKey;

    // Generate tokens
    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return {
      ...tokens,
      needsProfileCompletion,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as JwtPayload;

      // Check if refresh token exists in Redis
      const redisKey = `${this.REDIS_REFRESH_TOKEN_PREFIX}${payload.userId}`;
      const storedToken = await redis.get(redisKey);

      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new token pair
      return this.generateTokenPair(user.id, user.email, user.role);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      throw error;
    }
  }

  /**
   * Verify access token
   */
  verifyToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string): Promise<void> {
    const redisKey = `${this.REDIS_REFRESH_TOKEN_PREFIX}${userId}`;
    await redis.del(redisKey);
  }

  /**
   * Generate JWT token pair
   * @private
   */
  private async generateTokenPair(userId: string, email: string, role: 'user' | 'admin' = 'user'): Promise<TokenPair> {
    const payload: JwtPayload = {
      userId,
      email,
      role,
    };

    // Generate access token (15 minutes)
    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    // Generate refresh token (7 days)
    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    });

    // Store refresh token in Redis (7 days = 604800 seconds)
    const redisKey = `${this.REDIS_REFRESH_TOKEN_PREFIX}${userId}`;
    await redis.setEx(redisKey, 604800, refreshToken);

    // Calculate expiry time in seconds
    const expiresIn = 15 * 60; // 15 minutes in seconds

    return {
      token,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): boolean {
    try {
      registerSchema.shape.password.parse(password);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Hash password (utility method)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password with hash (utility method)
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Request password reset - generates token and sends email
   */
  async requestPasswordReset(email: string, locale: string = 'en'): Promise<void> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    // Check if user has a password (not OAuth-only)
    if (!user.passwordHash) {
      logger.info('Password reset requested for OAuth-only account', { email });
      return;
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store token in Redis with user ID
    const redisKey = `${this.RESET_TOKEN_PREFIX}${tokenHash}`;
    await redis.setEx(redisKey, this.RESET_TOKEN_TTL, user.id);

    logger.info('Password reset token generated', { userId: user.id, email });

    // Send email with reset link
    const emailSent = await emailService.sendPasswordResetEmail(email, resetToken, locale);

    if (!emailSent && process.env.NODE_ENV === 'production') {
      logger.error('Failed to send password reset email', { email });
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash the token to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const redisKey = `${this.RESET_TOKEN_PREFIX}${tokenHash}`;

    // Get user ID from Redis
    const userId = await redis.get(redisKey);

    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate password strength
    if (!this.validatePassword(newPassword)) {
      throw new Error('Password does not meet requirements');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Delete used token
    await redis.del(redisKey);

    // Invalidate all existing refresh tokens for this user
    const refreshTokenKey = `${this.REDIS_REFRESH_TOKEN_PREFIX}${userId}`;
    await redis.del(refreshTokenKey);

    logger.info('Password reset successful', { userId });
  }
}

// Export singleton instance
export const authService = new AuthService();
