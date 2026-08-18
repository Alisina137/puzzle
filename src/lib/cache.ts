import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

const CACHE_TTL = 60 * 5; // 5 minutes

export class CacheService {
  /**
   * Get cached data or fetch from database
   */
  static async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CACHE_TTL,
  ): Promise<T> {
    // Try to get from cache
    const cached = await redis.get(key);

    if (cached) {
      try {
        const cachedString =
          typeof cached === "string" ? cached : JSON.stringify(cached);

        return JSON.parse(cachedString) as T;
      } catch {
        // If parsing fails, continue to fetch fresh data
      }
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Store in cache
    await redis.set(key, JSON.stringify(data), { ex: ttl });

    return data;
  }

  /**
   * Invalidate cache for a key pattern
   */
  static async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Get books with cache
   */
  static async getCachedBooks(userId: string) {
    const key = `books:${userId}`;

    return this.getOrSet(key, async () => {
      return prisma.book.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          theme: true,
          puzzleCount: true,
          status: true,
          qualityScore: true,
          createdAt: true,
          _count: {
            select: {
              bookPuzzles: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    });
  }

  /**
   * Invalidate book cache for a user
   */
  static async invalidateBookCache(userId: string): Promise<void> {
    await this.invalidate(`books:${userId}`);
  }
}
