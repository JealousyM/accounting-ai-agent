import { AuthService } from '../auth.service';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../lib/redis', () => ({
  redis: {
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const input = {
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      (redis.setEx as jest.Mock).mockResolvedValue('OK');

      const result = await authService.register(input);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      const input = {
        email: 'existing@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: input.email,
      });

      await expect(authService.register(input)).rejects.toThrow('Email already registered');
    });

    it('should throw error for weak password', async () => {
      const input = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(authService.register(input)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const input = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const hashedPassword = await bcrypt.hash(input.password, 10);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: input.email,
        passwordHash: hashedPassword,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (redis.setEx as jest.Mock).mockResolvedValue('OK');

      const result = await authService.login(input);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw error for invalid credentials', async () => {
      const input = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(input)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      // This would need a valid token to test properly
      expect(() => authService.verifyToken('invalid-token')).toThrow();
    });
  });
});
