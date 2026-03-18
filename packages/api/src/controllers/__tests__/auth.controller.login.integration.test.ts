// packages/api/src/services/__tests__/auth.service.register.test.ts
import { AuthService } from '../../services/auth.service';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { organizationService } from '../../services/organization.instance';
import { credentialsService } from '../../services/credentials.instance';

// ---------------------------------------
// Mocks
// ---------------------------------------
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
  },
}));

jest.mock('../../services/organization.instance', () => ({
  organizationService: {
    findOrCreateByName: jest.fn(),
  },
}));

jest.mock('../../services/credentials.instance', () => ({
  credentialsService: {
    setWFirmaCredentials: jest.fn(),
    setLLMCredentials: jest.fn(),
    hasWFirmaEnabled: jest.fn(),
    getAvailableModels: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mock-hash'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => {
  const mockSign = jest
    .fn()
    .mockImplementationOnce(() => 'mock-access-token')
    .mockImplementationOnce(() => 'mock-refresh-token');

  return {
    __esModule: true,
    default: {
      sign: mockSign,
      verify: jest.fn(),
    },
    sign: mockSign,
    verify: jest.fn(),
    JsonWebTokenError: class extends Error {},
    TokenExpiredError: class extends Error {},
  };
});

// ---------------------------------------
// Test Suite
// ---------------------------------------
describe('AuthService – register()', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a new user (minimal happy path)', async () => {
    const authService = new AuthService();

    const input = {
      email: 'john.doe@example.com',
      password: 'StrongPass1!',
      firstName: 'John',
      lastName: 'Doe',
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-123',
      email: input.email,
      role: 'user',
    });
    (redis.setEx as jest.Mock).mockResolvedValue('OK');

    const result = await authService.register(input);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: input.email },
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
        }),
      }),
    );
    expect(redis.setEx).toHaveBeenCalledWith(
      'refresh_token:user-123',
      604800,
      'mock-refresh-token',
    );
    expect(result).toEqual({
      token: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 15 * 60,
    });

    // Optional services should NOT be called
    expect(organizationService.findOrCreateByName).not.toHaveBeenCalled();
    expect(credentialsService.setWFirmaCredentials).not.toHaveBeenCalled();
    expect(credentialsService.setLLMCredentials).not.toHaveBeenCalled();
  });

  it('links organization when companyName is provided', async () => {
    const authService = new AuthService();

    const input = {
      email: 'jane.doe@example.com',
      password: 'StrongPass1!',
      firstName: 'Jane',
      lastName: 'Doe',
      companyName: 'Acme Corp',
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-456',
      email: input.email,
      role: 'user',
    });
    (redis.setEx as jest.Mock).mockResolvedValue('OK');

    await authService.register(input);

    expect(organizationService.findOrCreateByName).toHaveBeenCalledWith(
      input.companyName,
      'user-456',
    );
  });

  it('throws when JWT secrets are missing in env', () => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    expect(() => new AuthService()).toThrow(
      /JWT_SECRET and JWT_REFRESH_SECRET must be set/,
    );
  });
});
