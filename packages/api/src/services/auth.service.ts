import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

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
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
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

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.warn('⚠️  JWT secrets not set in environment variables');
    }
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
        wfirmaConfig: validated.companyName
          ? JSON.stringify({ companyName: validated.companyName })
          : undefined,
      },
    });

    // Generate tokens
    return this.generateTokenPair(user.id, user.email);
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
    return this.generateTokenPair(user.id, user.email);
  }

  /**
   * Find or create OAuth user
   */
  async findOrCreateOAuthUser(profile: OAuthProfile): Promise<TokenPair> {
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
          wfirmaConfig: validated.picture ? JSON.stringify({ picture: validated.picture }) : undefined,
        },
      });
    }

    // Generate tokens
    return this.generateTokenPair(user.id, user.email);
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
      return this.generateTokenPair(user.id, user.email);
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
  private async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const payload: JwtPayload = {
      userId,
      email,
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
}

// Export singleton instance
export const authService = new AuthService();
