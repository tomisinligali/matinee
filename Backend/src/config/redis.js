const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 2,
  retryStrategy(times) {
    // Reconnect with bounded backoff up to 2 seconds
    return Math.min(times * 100, 2000);
  },
  enableOfflineQueue: true,
  lazyConnect: false
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully to Redis cache');
});

redis.on('error', (err) => {
  console.warn('[Redis] Connection warning (cache fallback will be used):', err.message);
});

module.exports = redis;
