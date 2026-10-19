const redis = require('../config/redis');

/**
 * Factory for creating Redis-backed rate limiters.
 * Supports per-user (authenticated sub) and per-IP throttling with window expiry.
 *
 * @param {Object} options
 * @param {string} options.prefix - Key prefix (e.g. 'hold', 'checkout', 'search')
 * @param {number} options.maxPerUser - Max allowed requests per window for authenticated users
 * @param {number} options.maxPerIp - Max allowed requests per window for client IP
 * @param {number} options.windowSeconds - Window length in seconds (defaults to 60)
 */
function createRateLimiter({ prefix, maxPerUser = 20, maxPerIp = 40, windowSeconds = 60 }) {
  return async function rateLimiter(req, res, next) {
    try {
      const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1')
        .split(',')[0].trim();
      const userId = req.user ? (req.user.sub || req.user.id) : null;

      const currentWindow = Math.floor(Date.now() / (windowSeconds * 1000));
      const keySuffix = `${prefix}:${currentWindow}`;

      const multi = redis.multi();
      const ipKey = `ratelimit:ip:${clientIp}:${keySuffix}`;
      multi.incr(ipKey);
      multi.expire(ipKey, windowSeconds * 2);

      let userKey = null;
      if (userId) {
        userKey = `ratelimit:user:${userId}:${keySuffix}`;
        multi.incr(userKey);
        multi.expire(userKey, windowSeconds * 2);
      }

      const results = await multi.exec();
      const ipCount = results[0][1];
      const userCount = userKey ? results[2][1] : 0;

      // Check IP threshold
      if (ipCount > maxPerIp) {
        res.setHeader('Retry-After', windowSeconds);
        res.setHeader('X-RateLimit-Limit', maxPerIp);
        res.setHeader('X-RateLimit-Remaining', 0);
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests from this IP address. Please wait ${windowSeconds}s before retrying.`,
            retryAfter: windowSeconds
          }
        });
      }

      // Check User threshold
      if (userId && userCount > maxPerUser) {
        res.setHeader('Retry-After', windowSeconds);
        res.setHeader('X-RateLimit-Limit', maxPerUser);
        res.setHeader('X-RateLimit-Remaining', 0);
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Account rate limit reached. Please wait ${windowSeconds}s before initiating more requests.`,
            retryAfter: windowSeconds
          }
        });
      }

      // Attach remaining count headers
      const remaining = userId ? Math.max(0, maxPerUser - userCount) : Math.max(0, maxPerIp - ipCount);
      res.setHeader('X-RateLimit-Limit', userId ? maxPerUser : maxPerIp);
      res.setHeader('X-RateLimit-Remaining', remaining);

      next();
    } catch (err) {
      // In case of Redis blip, fail open so legitimate traffic is not blocked
      console.warn('[RateLimiter Warning]: Redis error during rate limiting check:', err.message);
      next();
    }
  };
}

// Preset rate limiters according to Traffic Management PRD requirements:
// 1. Hold endpoint: protects seat inventory against aggressive scripts/bots
const holdLimiter = createRateLimiter({
  prefix: 'hold',
  maxPerUser: 15,
  maxPerIp: 30,
  windowSeconds: 60
});

// 2. Checkout endpoint: protects payment initiation and provider calls
const checkoutLimiter = createRateLimiter({
  prefix: 'checkout',
  maxPerUser: 10,
  maxPerIp: 20,
  windowSeconds: 60
});

// 3. Search & movie discovery endpoint: prevents scrapers and search surges
const searchLimiter = createRateLimiter({
  prefix: 'search',
  maxPerUser: 60,
  maxPerIp: 100,
  windowSeconds: 60
});

module.exports = {
  createRateLimiter,
  holdLimiter,
  checkoutLimiter,
  searchLimiter
};
