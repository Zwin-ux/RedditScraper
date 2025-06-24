import NodeCache from 'node-cache';

// Standard TTL: 1 hour
const DEFAULT_TTL = 60 * 60;
// Check for expired items every 5 minutes
const CHECK_PERIOD = 60 * 5;

type CacheKey = string;

export class CacheService<T> {
  private cache: NodeCache;
  private namespace: string;

  constructor(namespace: string, ttlSeconds: number = DEFAULT_TTL) {
    this.namespace = namespace;
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: CHECK_PERIOD,
      useClones: false, // Better performance when we don't need to clone objects
    });
  }

  /**
   * Generate a namespaced cache key
   */
  private getKey(key: string): CacheKey {
    return `${this.namespace}:${key}`;
  }

  /**
   * Get a value from the cache
   */
  async get(key: string): Promise<T | undefined> {
    return this.cache.get<T>(this.getKey(key));
  }

  /**
   * Set a value in the cache
   */
  async set(key: string, value: T, ttl?: number): Promise<boolean> {
    return this.cache.set(this.getKey(key), value, ttl || this.cache.options.stdTTL);
  }

  /**
   * Delete a value from the cache
   */
  async del(key: string): Promise<number> {
    return this.cache.del(this.getKey(key));
  }

  /**
   * Clear all keys in this namespace
   */
  async flush(): Promise<void> {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.stats.keys,
      hits: this.cache.stats.hits,
      misses: this.cache.stats.misses,
      keys: this.cache.keys(),
    };
  }
}

// Export commonly used cache instances
export const subredditCache = new CacheService<unknown>('subreddit');
export const userProfileCache = new CacheService<unknown>('user', DEFAULT_TTL * 24); // User profiles last 24 hours
export const searchCache = new CacheService<unknown>('search');
