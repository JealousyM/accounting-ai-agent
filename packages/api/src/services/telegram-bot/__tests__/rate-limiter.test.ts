import { TelegramRateLimiter } from '../rate-limiter';

function makeRedis(incrValue = 1) {
  return {
    incr: jest.fn().mockResolvedValue(incrValue),
    setEx: jest.fn().mockResolvedValue('OK'),
  };
}

describe('TelegramRateLimiter', () => {
  it('allows the first message and sets the TTL window', async () => {
    const redis = makeRedis(1);
    const limiter = new TelegramRateLimiter(redis as any, 60, 10);

    const allowed = await limiter.isAllowed('user-123');

    expect(allowed).toBe(true);
    expect(redis.incr).toHaveBeenCalledWith('telegram:rate:user-123');
    expect(redis.setEx).toHaveBeenCalledWith('telegram:rate:user-123', 60, '1');
  });

  it('does not reset TTL on subsequent messages within the window', async () => {
    const redis = makeRedis(5);
    const limiter = new TelegramRateLimiter(redis as any, 60, 10);

    const allowed = await limiter.isAllowed('user-123');

    expect(allowed).toBe(true);
    expect(redis.setEx).not.toHaveBeenCalled();
  });

  it('allows messages up to the max limit', async () => {
    const redis = makeRedis(10);
    const limiter = new TelegramRateLimiter(redis as any, 60, 10);

    const allowed = await limiter.isAllowed('user-123');

    expect(allowed).toBe(true);
  });

  it('blocks messages that exceed the max limit', async () => {
    const redis = makeRedis(11);
    const limiter = new TelegramRateLimiter(redis as any, 60, 10);

    const allowed = await limiter.isAllowed('user-123');

    expect(allowed).toBe(false);
  });

  it('uses custom window and max when provided', async () => {
    const redis = makeRedis(1);
    const limiter = new TelegramRateLimiter(redis as any, 120, 5);

    await limiter.isAllowed('user-abc');

    expect(redis.setEx).toHaveBeenCalledWith('telegram:rate:user-abc', 120, '1');
  });

  it('namespaces keys per user', async () => {
    const redis = makeRedis(1);
    const limiter = new TelegramRateLimiter(redis as any, 60, 10);

    await limiter.isAllowed('user-A');
    await limiter.isAllowed('user-B');

    expect(redis.incr).toHaveBeenCalledWith('telegram:rate:user-A');
    expect(redis.incr).toHaveBeenCalledWith('telegram:rate:user-B');
  });
});
