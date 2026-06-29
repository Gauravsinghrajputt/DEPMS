'use strict';
const logger = require('../utils/logger');

let client = null;

async function connectRedis() {
  try {
    const Redis = require('ioredis');
    client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });
    await client.connect();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn('Redis not available - running without cache');
    client = null;
  }
  return client;
}

function getRedis() { return client; }

async function cacheGet(key) {
  try { if (!client) return null; const data = await client.get(key); return data ? JSON.parse(data) : null; } catch { return null; }
}

async function cacheSet(key, value, ttl = 300) {
  try { if (!client) return; await client.setex(key, ttl, JSON.stringify(value)); } catch {}
}

async function cacheDel(key) {
  try { if (!client) return; await client.del(key); } catch {}
}

async function cacheDelPattern(pattern) {
  try { if (!client) return; const keys = await client.keys(pattern); if (keys.length > 0) await client.del(...keys); } catch {}
}

module.exports = { connectRedis, getRedis, cacheGet, cacheSet, cacheDel, cacheDelPattern };
