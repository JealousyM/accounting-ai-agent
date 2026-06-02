interface RateLimitRedis {
  incr(key: string): Promise<number>;
  setEx(key: string, seconds: number, value: string): Promise<unknown>;
}

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_MESSAGES = 10;

export class TelegramRateLimiter {
  constructor(
    private readonly redis: RateLimitRedis,
    private readonly windowSeconds: number = RATE_LIMIT_WINDOW_SECONDS,
    private readonly maxMessages: number = RATE_LIMIT_MAX_MESSAGES,
  ) {}

  /**
   * Returns true if the user is within the rate limit, false if exceeded.
   * Increments the counter and sets a TTL window on the first call.
   */
  async isAllowed(telegramUserId: string): Promise<boolean> {
    const key = `telegram:rate:${telegramUserId}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.setEx(key, this.windowSeconds, String(count));
    }
    return count <= this.maxMessages;
  }
}
