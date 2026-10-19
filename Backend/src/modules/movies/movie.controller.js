const tmdbService = require('./tmdb.service');
const redis = require('../../config/redis');

const NOW_PLAYING_CACHE_TTL = 10 * 60; // 10 minutes
const MOVIE_DETAILS_CACHE_TTL = 30 * 60; // 30 minutes

class MovieController {
  async getNowPlaying(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const cacheKey = `cache:movies:now-playing:${page}`;

      // 1. Try reading from Redis cache first
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.status(200).json(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.warn('[Cache Warning]: Redis get error:', cacheErr.message);
      }

      // 2. Cache miss: fetch from TMDB
      res.setHeader('X-Cache', 'MISS');
      const data = await tmdbService.getNowPlaying(page);

      // 3. Populate Redis cache asynchronously
      try {
        await redis.set(cacheKey, JSON.stringify(data), 'EX', NOW_PLAYING_CACHE_TTL);
      } catch (cacheErr) {
        console.warn('[Cache Warning]: Redis set error:', cacheErr.message);
      }

      return res.status(200).json(data);
    } catch (err) {
      console.error('[MovieController] Error fetching now-playing:', err.message);
      return res.status(502).json({
        error: {
          code: 'EXTERNAL_METADATA_UNAVAILABLE',
          message: 'Unable to load movie catalogue at this time. Please try again shortly.'
        }
      });
    }
  }

  async getMovieDetails(req, res, next) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Movie ID parameter is required'
          }
        });
      }

      const cacheKey = `cache:movies:details:${id}`;

      // 1. Try reading from Redis cache
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.status(200).json(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.warn('[Cache Warning]: Redis get error:', cacheErr.message);
      }

      // 2. Fetch from TMDB
      res.setHeader('X-Cache', 'MISS');
      const data = await tmdbService.getMovieDetails(id);

      // 3. Populate Redis cache
      try {
        await redis.set(cacheKey, JSON.stringify(data), 'EX', MOVIE_DETAILS_CACHE_TTL);
      } catch (cacheErr) {
        console.warn('[Cache Warning]: Redis set error:', cacheErr.message);
      }

      return res.status(200).json(data);
    } catch (err) {
      console.error(`[MovieController] Error fetching movie details for ${req.params.id}:`, err.message);
      return res.status(502).json({
        error: {
          code: 'EXTERNAL_METADATA_UNAVAILABLE',
          message: 'Unable to load movie details at this time.'
        }
      });
    }
  }
}

module.exports = new MovieController();
