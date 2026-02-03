import Redis from 'ioredis'

// Singleton pattern for Redis client
let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      reconnectOnError(err) {
        const targetError = 'READONLY'
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true
        }
        return false
      },
    })

    redis.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    redis.on('connect', () => {
      console.log('✅ Redis connected')
    })
  }

  return redis
}

// Helper functions for cache operations
export class CacheService {
  private redis: Redis

  constructor() {
    this.redis = getRedisClient()
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key)
      if (!data) return null
      return JSON.parse(data) as T
    } catch (error) {
      console.error('Cache GET error:', error)
      return null
    }
  }

  /**
   * Set cached data with TTL (in seconds)
   */
  async set(key: string, value: any, ttlSeconds: number = 86400): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
      console.error('Cache SET error:', error)
    }
  }

  /**
   * Delete specific cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('Cache DELETE error:', error)
    }
  }

  /**
   * Delete cache keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache DELETE PATTERN error:', error)
    }
  }

  /**
   * Invalidate all search cache (use after ingestion)
   */
  async invalidateSearchCache(): Promise<void> {
    await this.deletePattern('silip:search:*')
  }
}

export const cacheService = new CacheService()
