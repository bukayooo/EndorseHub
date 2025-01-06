interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly ttlMs: number;

  constructor(ttlSeconds: number = 300) { // Default TTL: 5 minutes
    this.ttlMs = ttlSeconds * 1000;
  }

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  public set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  public cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
} 