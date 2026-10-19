const redis = require('../../config/redis');

const HOLD_TTL_SECONDS = 10 * 60; // 10 minutes authoritative expiry
const HOLD_KEY_PREFIX = 'hold';

/**
 * Lua script for atomic multi-seat reservation.
 * Guarantees all-or-nothing atomicity in Redis single-threaded execution context:
 * - If ANY of the requested seats is already held (key exists), aborts and returns 0 + conflicting key.
 * - If ALL requested seats are available, sets all keys with payload and EX ttl in seconds, returning 1 + "OK".
 */
const ATOMIC_HOLD_LUA_SCRIPT = `
local keys = KEYS
local payload = ARGV[1]
local ttl = tonumber(ARGV[2])

-- 1. Check if any of the keys already exist
for i = 1, #keys do
    if redis.call('EXISTS', keys[i]) == 1 then
        return { 0, keys[i] }
    end
end

-- 2. Atomically set all keys with expiration
for i = 1, #keys do
    redis.call('SET', keys[i], payload, 'EX', ttl)
end

return { 1, "OK" }
`;

class RedisHoldService {
  /**
   * Format key for a seat hold.
   */
  getHoldKey(showtimeId, seatId) {
    return `${HOLD_KEY_PREFIX}:${showtimeId}:${seatId}`;
  }

  /**
   * Atomically acquire holds on one or more seats in Redis using SET ... NX EX logic.
   * @param {Object} params
   * @param {string} params.showtimeId
   * @param {string[]} params.seatIds - List of resolved seat IDs
   * @param {string} params.userId
   * @returns {Promise<{ success: boolean, conflictingSeatId?: string, expiresAt: Date }>}
   */
  async acquireAtomicHold({ showtimeId, seatIds, userId }) {
    if (!seatIds || seatIds.length === 0) {
      throw new Error('At least one seat must be specified');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOLD_TTL_SECONDS * 1000);

    const payload = JSON.stringify({
      userId,
      showtimeId,
      heldAt: now.getTime(),
      expiresAt: expiresAt.getTime()
    });

    // If single seat, we can directly use the native Redis SET NX EX command
    if (seatIds.length === 1) {
      const key = this.getHoldKey(showtimeId, seatIds[0]);
      // SET key value EX seconds NX -> returns 'OK' or null
      const result = await redis.set(key, payload, 'EX', HOLD_TTL_SECONDS, 'NX');

      if (result === 'OK') {
        return { success: true, expiresAt };
      } else {
        return { success: false, conflictingSeatId: seatIds[0] };
      }
    }

    // For multi-seat requests, run atomic Lua script to prevent partial holds
    const keys = seatIds.map(id => this.getHoldKey(showtimeId, id));
    const [status, info] = await redis.eval(
      ATOMIC_HOLD_LUA_SCRIPT,
      keys.length,
      ...keys,
      payload,
      HOLD_TTL_SECONDS
    );

    if (status === 1) {
      return { success: true, expiresAt };
    } else {
      // Conflicting key returned e.g. "hold:showtime123:seat456"
      const conflictingSeatId = info ? info.split(':').pop() : seatIds[0];
      return { success: false, conflictingSeatId };
    }
  }

  /**
   * Release Redis holds for a list of seats.
   */
  async releaseAtomicHold({ showtimeId, seatIds }) {
    if (!seatIds || seatIds.length === 0) return 0;
    const keys = seatIds.map(id => this.getHoldKey(showtimeId, id));
    return redis.del(...keys);
  }

  /**
   * Fetch all active seat hold IDs in Redis for a given showtime.
   */
  async getActiveHoldSeatIds(showtimeId) {
    const pattern = `${HOLD_KEY_PREFIX}:${showtimeId}:*`;
    const keys = await redis.keys(pattern);
    return keys.map(k => k.split(':').pop());
  }

  /**
   * Check if a specific seat is actively held in Redis.
   */
  async isSeatHeld(showtimeId, seatId) {
    const key = this.getHoldKey(showtimeId, seatId);
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
}

module.exports = new RedisHoldService();
