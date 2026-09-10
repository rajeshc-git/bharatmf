import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {}
}

// In-memory cache for blazing fast KB-level RAM/CPU access
const memoryCache = new Map<string, { val: any; expires: number }>();

export function isRedisConnected(): boolean {
  return true; // Embedded ultra-fast cache is always active
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  // 1. Check in-memory map
  const mem = memoryCache.get(key);
  if (mem) {
    if (mem.expires > Date.now()) {
      return mem.val as T;
    }
    memoryCache.delete(key);
  }

  // 2. Check disk cache
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
      fs.unlinkSync(filePath);
    }
  } catch {}

  return null;
}

export async function cacheSet(key: string, value: any, ttlSeconds = 86400): Promise<void> {
  const expires = Date.now() + ttlSeconds * 1000;
  memoryCache.set(key, { val: value, expires });

  try {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ val: value, expires }), 'utf-8');
  } catch {}
}

export async function cacheDel(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

