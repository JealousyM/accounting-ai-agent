import { PrismaClient } from '@prisma/client';
import { LangSmithService } from '../langsmith/langsmith.service';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  aIConversation: { findFirst: jest.fn(), findMany: jest.fn() },
} as unknown as PrismaClient;

jest.mock('langsmith', () => ({
  Client: jest.fn().mockImplementation(() => ({
    listRuns: jest.fn().mockReturnValue((async function* () {})()),
  })),
}));

// Access private members through a typed helper to keep tests readable.
function cacheOf(svc: LangSmithService) {
  return (svc as any).runsCache as Map<string, { data: unknown; expiresAt: number }>;
}

function cleanExpired(svc: LangSmithService) {
  (svc as any).cleanExpired();
}

describe('LangSmithService — runsCache TTL cleanup', () => {
  let service: LangSmithService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LangSmithService(mockPrisma);
  });

  it('cleanExpired removes entries whose expiresAt is in the past', () => {
    const now = Date.now();
    const cache = cacheOf(service);

    cache.set('user-A:day', { data: [], expiresAt: now - 1 });    // expired
    cache.set('user-B:week', { data: [], expiresAt: now + 30000 }); // still valid

    cleanExpired(service);

    expect(cache.has('user-A:day')).toBe(false);
    expect(cache.has('user-B:week')).toBe(true);
  });

  it('cleanExpired removes all entries when all are expired', () => {
    const past = Date.now() - 1;
    const cache = cacheOf(service);

    cache.set('user-A:day', { data: [], expiresAt: past });
    cache.set('user-B:day', { data: [], expiresAt: past });
    cache.set('all:year', { data: [], expiresAt: past });

    cleanExpired(service);

    expect(cache.size).toBe(0);
  });

  it('cleanExpired is a no-op when cache is empty', () => {
    expect(() => cleanExpired(service)).not.toThrow();
    expect(cacheOf(service).size).toBe(0);
  });

  it('cleanExpired keeps entries with expiresAt exactly equal to now', () => {
    // expiresAt === now is NOT expired (condition is `< now`, not `<=`)
    const now = Date.now();
    const cache = cacheOf(service);

    // Freeze Date.now so the comparison is stable
    jest.spyOn(Date, 'now').mockReturnValue(now);

    cache.set('user-A:month', { data: [], expiresAt: now });

    cleanExpired(service);

    expect(cache.has('user-A:month')).toBe(true);

    jest.restoreAllMocks();
  });
});
