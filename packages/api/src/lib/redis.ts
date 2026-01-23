import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Error handling
redisClient.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: (error as Error).message });
  }
})();

// Export Redis client
export const redis = redisClient;

export default redis;
