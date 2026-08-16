import { Redis } from '@upstash/redis';

// Initialize Redis from environment variables
export const redis = Redis.fromEnv();

// For BullMQ connection
export const redisConnection = {
  url: process.env.REDIS_URL || '',
};

// Helper function to test connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    console.log('✅ Redis connection is healthy');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
}
