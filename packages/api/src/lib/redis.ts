import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(redisUrl, {
  family: 4, // Force IPv4 — prevents ECONNRESET on Windows with Docker
  retryStrategy: (times) => {
    if (times > 20) {
      logger.error('Redis: max reconnect attempts reached');
      return null;
    }
    const delay = Math.min(times * 100, 5000);
    logger.info(`Redis: reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

// ioredis-compatible wrapper matching node-redis API used in the codebase
export const redis = {
  get: (key: string) => redisClient.get(key),
  set: (key: string, value: string) => redisClient.set(key, value),
  setEx: (key: string, seconds: number, value: string) =>
    redisClient.setex(key, seconds, value),
  del: (key: string) => redisClient.del(key),
  incr: (key: string) => redisClient.incr(key),
  quit: () => redisClient.quit(),
  isReady: redisClient.status === 'ready',
};

export default redis;
