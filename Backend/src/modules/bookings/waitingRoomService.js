const crypto = require('crypto');
const redis = require('../../config/redis');

// Default active threshold per showtime (surges above this join the waiting room queue)
const DEFAULT_CAPACITY = parseInt(process.env.WAITING_ROOM_CAPACITY, 10) || 30;
const ACTIVE_TTL_SECONDS = 5 * 60; // 5-minute active window once admitted
const ADMISSION_TICK_USERS = 5; // Admitted per processing tick

class WaitingRoomService {
  getActiveKey(showtimeId) {
    return `waiting_room:active:${showtimeId}`;
  }

  getQueueKey(showtimeId) {
    return `waiting_room:queue:${showtimeId}`;
  }

  getTokenKey(token) {
    return `waiting_room:token:${token}`;
  }

  /**
   * Remove active users whose heartbeat or session has exceeded ACTIVE_TTL_SECONDS.
   */
  async cleanupActiveUsers(showtimeId) {
    const activeKey = this.getActiveKey(showtimeId);
    const now = Date.now();
    const cutoff = now - ACTIVE_TTL_SECONDS * 1000;

    // Active users stored as Hash: userId -> JSON({ timestamp, token })
    const allActive = await redis.hgetall(activeKey);
    const expiredUsers = [];

    for (const [uid, rawData] of Object.entries(allActive)) {
      try {
        const data = JSON.parse(rawData);
        if (data.timestamp < cutoff) {
          expiredUsers.push(uid);
        }
      } catch (_) {
        expiredUsers.push(uid);
      }
    }

    if (expiredUsers.length > 0) {
      await redis.hdel(activeKey, ...expiredUsers);
    }
  }

  /**
   * Check capacity and promote queued users to active set if room exists.
   */
  async processAdmission(showtimeId, capacity = DEFAULT_CAPACITY) {
    await this.cleanupActiveUsers(showtimeId);

    const activeKey = this.getActiveKey(showtimeId);
    const queueKey = this.getQueueKey(showtimeId);

    const currentActiveCount = await redis.hlen(activeKey);
    const availableSlots = capacity - currentActiveCount;

    if (availableSlots <= 0) return;

    const admitCount = Math.min(availableSlots, ADMISSION_TICK_USERS);
    // Pop top users with earliest timestamps
    const usersToAdmit = await redis.zrange(queueKey, 0, admitCount - 1);

    if (!usersToAdmit || usersToAdmit.length === 0) return;

    for (const userId of usersToAdmit) {
      const token = `WR-${crypto.randomBytes(16).toString('hex')}`;
      const tokenData = {
        token,
        userId,
        showtimeId,
        admittedAt: Date.now(),
        expiresAt: Date.now() + ACTIVE_TTL_SECONDS * 1000
      };

      // Set token with TTL
      await redis.set(this.getTokenKey(token), JSON.stringify(tokenData), 'EX', ACTIVE_TTL_SECONDS);

      // Add to active hash
      await redis.hset(activeKey, userId, JSON.stringify(tokenData));

      // Remove from queue
      await redis.zrem(queueKey, userId);
    }
  }

  /**
   * User requests to enter seat selection for a showtime.
   */
  async joinQueue({ showtimeId, userId, capacity = DEFAULT_CAPACITY }) {
    await this.cleanupActiveUsers(showtimeId);

    const activeKey = this.getActiveKey(showtimeId);
    const queueKey = this.getQueueKey(showtimeId);

    // 1. Check if user is already active
    const existingActive = await redis.hget(activeKey, userId);
    if (existingActive) {
      const data = JSON.parse(existingActive);
      return {
        status: 'ADMITTED',
        token: data.token,
        expiresInSeconds: Math.floor((data.expiresAt - Date.now()) / 1000),
        position: 0
      };
    }

    // 2. Check current active count against capacity
    const currentActiveCount = await redis.hlen(activeKey);

    if (currentActiveCount < capacity) {
      // Under capacity: immediately admit user
      const token = `WR-${crypto.randomBytes(16).toString('hex')}`;
      const tokenData = {
        token,
        userId,
        showtimeId,
        admittedAt: Date.now(),
        expiresAt: Date.now() + ACTIVE_TTL_SECONDS * 1000
      };

      await redis.set(this.getTokenKey(token), JSON.stringify(tokenData), 'EX', ACTIVE_TTL_SECONDS);
      await redis.hset(activeKey, userId, JSON.stringify(tokenData));

      return {
        status: 'ADMITTED',
        token,
        expiresInSeconds: ACTIVE_TTL_SECONDS,
        position: 0
      };
    }

    // 3. Over capacity: add user to Sorted Set queue
    const now = Date.now();
    await redis.zadd(queueKey, now, userId);

    const rank = await redis.zrank(queueKey, userId);
    const position = (rank !== null ? rank : 0) + 1;
    const totalWaiting = await redis.zcard(queueKey);

    return {
      status: 'QUEUED',
      position,
      totalWaiting,
      estimatedWaitSeconds: position * 4
    };
  }

  /**
   * Polling or query queue status for a user.
   */
  async getQueueStatus({ showtimeId, userId, capacity = DEFAULT_CAPACITY }) {
    // Process any promotions
    await this.processAdmission(showtimeId, capacity);

    const activeKey = this.getActiveKey(showtimeId);
    const queueKey = this.getQueueKey(showtimeId);

    // 1. Check if user was admitted
    const activeData = await redis.hget(activeKey, userId);
    if (activeData) {
      const data = JSON.parse(activeData);
      return {
        status: 'ADMITTED',
        token: data.token,
        expiresInSeconds: Math.floor((data.expiresAt - Date.now()) / 1000),
        position: 0
      };
    }

    // 2. Check user's position in queue
    const rank = await redis.zrank(queueKey, userId);
    if (rank === null) {
      // Not in queue, re-join
      return this.joinQueue({ showtimeId, userId, capacity });
    }

    const position = rank + 1;
    const totalWaiting = await redis.zcard(queueKey);

    return {
      status: 'QUEUED',
      position,
      totalWaiting,
      estimatedWaitSeconds: position * 4
    };
  }

  /**
   * Verify whether a token allows hold/checkout operations.
   */
  async verifyToken({ token, showtimeId, userId }) {
    if (!token) return false;
    const rawData = await redis.get(this.getTokenKey(token));
    if (!rawData) return false;

    try {
      const data = JSON.parse(rawData);
      if (data.showtimeId !== showtimeId) return false;
      if (userId && data.userId !== userId) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Check if a showtime is currently under surge (exceeding capacity).
   */
  async isSurgeActive(showtimeId, capacity = DEFAULT_CAPACITY) {
    const activeCount = await redis.hlen(this.getActiveKey(showtimeId));
    const queueCount = await redis.zcard(this.getQueueKey(showtimeId));
    return activeCount >= capacity || queueCount > 0;
  }
}

module.exports = new WaitingRoomService();
