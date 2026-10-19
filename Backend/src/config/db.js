const { PrismaClient } = require('@prisma/client');
const redis = require('./redis');

/**
 * ============================================================================
 * DATABASE CONNECTION POOLING CONFIGURATION & SIZING JUSTIFICATION
 * ============================================================================
 * 
 * Sizing Formula Justification:
 *   Connections = (num_physical_cores * 2) + effective_spindle_count
 * 
 * Why Connection Limits are Essential:
 *   PostgreSQL uses a process-per-connection architecture where each client
 *   connection spawns a dedicated OS backend process.
 *   - Too many connections (e.g. 500 VUs opening 500 connections) degrades performance:
 *     1. Context switching overhead on CPU cores.
 *     2. RAM exhaustion: each backend allocates work_mem (e.g. 4MB) per query node.
 *     3. Latch contention on PostgreSQL shared buffers and pg_locks.
 *   - For a 4-vCPU database server with SSD storage (spindle count = 1):
 *     Pool Size = (4 * 2) + 1 = 9 connections (clamped to 10-15 per instance).
 *   - A bounded pool of 15 connections with sub-millisecond connection reuse can
 *     easily serve thousands of requests per second under peak surge.
 *   - Fail-fast pool_timeout (10s) prevents requests from queuing indefinitely
 *     when the database is under backpressure.
 * 
 * Production PgBouncer Topology:
 *   In production, Node.js instances connect through PgBouncer running in
 *   `transaction` pooling mode, allowing thousands of application threads to share
 *   a small, optimal pool of active PostgreSQL backend connections.
 */

const DEFAULT_POOL_LIMIT = parseInt(process.env.DB_POOL_LIMIT, 10) || 15;
const DEFAULT_POOL_TIMEOUT = parseInt(process.env.DB_POOL_TIMEOUT, 10) || 10;

function formatPooledUrl(rawUrl, poolLimit = DEFAULT_POOL_LIMIT, poolTimeout = DEFAULT_POOL_TIMEOUT) {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', String(poolLimit));
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', String(poolTimeout));
    }
    return url.toString();
  } catch {
    // If not standard URL format, append query parameters
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}connection_limit=${poolLimit}&pool_timeout=${poolTimeout}`;
  }
}

const primaryDbUrl = formatPooledUrl(process.env.DATABASE_URL || process.env.DATABASE_PRIMARY_URL);
const replicaDbUrl = process.env.DATABASE_REPLICA_URL 
  ? formatPooledUrl(process.env.DATABASE_REPLICA_URL)
  : primaryDbUrl; // Fallback to primary if replica not provisioned

// Primary Prisma Client (Authoritative for Writes & Strong Consistency Reads)
const primaryPrisma = new PrismaClient({
  datasources: {
    db: { url: primaryDbUrl }
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

// Read Replica Prisma Client (For offloading read-only queries)
const replicaPrisma = (replicaDbUrl !== primaryDbUrl)
  ? new PrismaClient({
      datasources: {
        db: { url: replicaDbUrl }
      },
      log: ['error']
    })
  : primaryPrisma;

/**
 * ============================================================================
 * READ-YOUR-OWN-WRITES (RYOW) ROUTING LOGIC
 * ============================================================================
 * 
 * Replication Lag Problem:
 *   Asynchronous PostgreSQL streaming replication incurs 10ms - 500ms lag.
 *   If a user reserves seat F7 (Write to Primary), and immediately requests the
 *   seat map or booking status, querying a replica would return stale data
 *   ("seat still free" or "booking not found").
 * 
 * RYOW Solution:
 *   1. When a user executes a state mutation (POST /hold, POST /checkout, etc.),
 *      the server sets an active write timestamp in Redis for that session/user
 *      with a 5-second TTL (surpassing maximum replica replication lag).
 *   2. On incoming read requests (GET), if the user's write window is active
 *      or the client passes an `X-Matinee-Write-Timestamp` header within 5s,
 *      the query routes to PRIMARY.
 *   3. All other read traffic routes to the REPLICA pool.
 */
const RYOW_WINDOW_SECONDS = 5;

async function recordUserWrite(userId) {
  if (!userId) return;
  try {
    await redis.set(`ryow:user:${userId}`, Date.now().toString(), 'EX', RYOW_WINDOW_SECONDS);
  } catch (err) {
    // Non-blocking: fail-open
    console.warn('[RYOW] Failed to set write timestamp in Redis:', err.message);
  }
}

async function hasRecentWrite(userId, clientWriteTimestamp) {
  // Check client-provided write timestamp header
  if (clientWriteTimestamp) {
    const elapsed = Date.now() - parseInt(clientWriteTimestamp, 10);
    if (!isNaN(elapsed) && elapsed < RYOW_WINDOW_SECONDS * 1000) {
      return true;
    }
  }

  // Check Redis session tracking
  if (userId) {
    try {
      const lastWrite = await redis.get(`ryow:user:${userId}`);
      if (lastWrite) {
        return true;
      }
    } catch {
      // In case Redis is down, fail-safe to primary
      return true;
    }
  }

  return false;
}

/**
 * Resolves the appropriate Prisma client based on RYOW session context and HTTP method
 */
async function resolveDbClient(req) {
  if (!req) return primaryPrisma;

  // Writes always route to Primary
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (isMutation) {
    return primaryPrisma;
  }

  // Check for explicit primary override header
  if (req.headers['x-force-primary'] === 'true') {
    return primaryPrisma;
  }

  // Check Read-Your-Own-Writes status
  const userId = req.user?.sub || req.user?.id;
  const clientTimestamp = req.headers['x-matinee-write-timestamp'];
  const isWithinWriteWindow = await hasRecentWrite(userId, clientTimestamp);

  if (isWithinWriteWindow) {
    req.routedToPrimaryForRYOW = true;
    return primaryPrisma;
  }

  return replicaPrisma;
}

// Proxy wrapper around primaryPrisma so existing code calling `prisma.<model>` works as before
module.exports = primaryPrisma;
module.exports.primaryPrisma = primaryPrisma;
module.exports.replicaPrisma = replicaPrisma;
module.exports.resolveDbClient = resolveDbClient;
module.exports.recordUserWrite = recordUserWrite;
module.exports.hasRecentWrite = hasRecentWrite;
module.exports.RYOW_WINDOW_SECONDS = RYOW_WINDOW_SECONDS;
