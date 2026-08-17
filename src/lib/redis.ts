import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';

// For Upstash REST API
export const redis = UpstashRedis.fromEnv();

// For BullMQ connection - using ioredis
// BullMQ needs a standard Redis connection
// We'll use ioredis with the REDIS_URL
const redisUrl = process.env.REDIS_URL || '';

// Create the connection for BullMQ
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    if (times > 3) {
      console.error('? Redis connection failed after 3 attempts');
      return null;
    }
    return Math.min(times * 100, 3000);
  },
});

// Helper function to test connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    console.log('? Redis connection is healthy');
    return true;
  } catch (error) {
    console.error('? Redis connection failed:', error);
    return false;
  }
}

// Check if Redis is configured
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL || 
         (!!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN);
}