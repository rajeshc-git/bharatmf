import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:3279';
const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

// Ensure cache directory exists for fallback
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {}
}

let redisClient: Redis | null = null;
let redisAvailable = false;

// Fallback in-memory cache
const memoryCache = new Map<string, { val: any; expires: number }>();

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      if (times > 3) return null; // stop reconnecting if not available
      return Math.min(times * 1000, 3000);
    },
    lazyConnect: true,
  });

  redisClient.connect().then(() => {
    redisAvailable = true;
    console.log('[Redis] Connected to Redis cache at', REDIS_URL);
  }).catch(() => {
    redisAvailable = false;
    console.log('[Redis] Redis not reachable, using fast disk/memory fallback cache');
  });

  redisClient.on('error', () => {
    redisAvailable = false;
  });

  redisClient.on('connect', () => {
    redisAvailable = true;
  });
} catch (err) {
  redisAvailable = false;
  console.log('[Redis] Initialization fallback active');
}

export function isRedisConnected(): boolean {
  return redisAvailable;
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (redisAvailable && redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
    } catch {
      // Fallback to memory
    }
  }

  // Check memory
  const mem = memoryCache.get(key);
  if (mem && mem.expires > Date.now()) {
    return mem.val as T;
  }

  // Check disk fallback
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.expires > Date.now()) {
        memoryCache.set(key, parsed);
        return parsed.val as T;
      }
    }
  } catch {}

  return null;
}

export async function cacheSet(key: string, value: any, ttlSeconds = 86400): Promise<void> {
  const serialized = JSON.stringify(value);

  if (redisAvailable && redisClient) {
    try {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
      return;
    } catch {
      // Fallback to memory
    }
  }

  const expires = Date.now() + ttlSeconds * 1000;
  memoryCache.set(key, { val: value, expires });

  try {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ val: value, expires }), 'utf-8');
  } catch {}
}

export async function cacheDel(key: string): Promise<void> {
  if (redisAvailable && redisClient) {
    try {
      await redisClient.del(key);
    } catch {}
  }
  memoryCache.delete(key);
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}
