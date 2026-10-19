const { resolveDbClient, recordUserWrite } = require('../config/db');

/**
 * Read-Your-Own-Writes (RYOW) Middleware
 * 
 * 1. Resolves `req.db` to Primary or Replica based on mutation status or recent writes.
 * 2. On mutating responses (2xx/3xx on POST/PUT/PATCH/DELETE), sets `X-Matinee-Write-Timestamp`
 *    and records the user's write in Redis with a 5s TTL.
 * 3. Exposes `X-Database-Route: PRIMARY | REPLICA` in response headers for observability.
 */
module.exports = async function readYourOwnWritesMiddleware(req, res, next) {
  try {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    
    // Resolve client
    req.db = await resolveDbClient(req);
    
    // Add observability header
    const route = (req.db === req.app.get('replicaPrisma') && !req.routedToPrimaryForRYOW) 
      ? 'REPLICA' 
      : 'PRIMARY';
    res.setHeader('X-Database-Route', route);

    // If it's a mutation, intercept response finish to record the write timestamp
    if (isMutation) {
      const now = Date.now().toString();
      res.setHeader('X-Matinee-Write-Timestamp', now);

      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          const userId = req.user?.sub || req.user?.id;
          if (userId) {
            await recordUserWrite(userId);
          }
        }
      });
    }

    next();
  } catch (err) {
    // Fail-safe to primary if router encounters an issue
    req.db = require('../config/db').primaryPrisma;
    res.setHeader('X-Database-Route', 'PRIMARY-FALLBACK');
    next();
  }
};
