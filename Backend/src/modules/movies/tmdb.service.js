/**
 * ==============================================================================
 * TMDB ADAPTER & CACHING SERVICE (Backend-For-Frontend Pattern)
 * ==============================================================================
 *
 * RESPONSIBILITY:
 *   This is the SINGLE FILE in the Matinee backend that knows about TMDB's API
 *   endpoints, headers, parameters, and raw payload structure.
 *
 * TTL STRATEGY:
 *   - NOW_PLAYING_TTL: 86,400 seconds (24 hours).
 *     Cinema releases and theatrical runs change daily. 24h TTL guarantees
 *     fresh screening options while eliminating redundant outbound queries.
 *   - MOVIE_DETAILS_TTL: 604,800 seconds (7 days).
 *     Movie metadata (synopsis, runtime, genre, poster paths) is immutable
 *     once finalized. 7 days preserves bandwidth and insulates against external outages.
 *
 * RESILIENCE:
 *   - Automatic retry with exponential backoff on HTTP 429 (Rate Limit) and 5xx errors.
 *   - Stale cache fallback: Serves existing cache if TMDB experiences downtime.
 *   - Data mapping: Normalizes raw TMDB keys to application-owned Matinee Movie types.
 * ==============================================================================
 */

const redis = require('../../config/redis');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMAGE_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// Cache TTLs in seconds
const TTL_NOW_PLAYING_SECONDS = 86400;   // 24 hours
const TTL_MOVIE_DETAILS_SECONDS = 604800; // 7 days

class TmdbService {
  constructor() {
    this.apiKey = process.env.TMDB_API_KEY;
  }

  /**
   * Fetch now-playing movies with Redis caching and resilience.
   */
  async getNowPlaying(page = 1) {
    const cacheKey = `matinee:tmdb:now_playing:page_${page}`;

    // 1. Check Redis cache first
    const cached = await this._getFromCache(cacheKey);
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    // 2. Fetch from TMDB with retry & backoff
    try {
      const url = `${TMDB_BASE_URL}/movie/now_playing?api_key=${this.apiKey}&page=${page}&language=en-US`;
      const rawData = await this._fetchWithRetry(url);

      // 3. Map into Matinee normalized type
      const normalized = this._normalizeMovieList(rawData);

      // 4. Store in Redis
      await this._saveToCache(cacheKey, normalized, TTL_NOW_PLAYING_SECONDS);

      return { ...normalized, source: 'tmdb' };
    } catch (err) {
      console.error('[TMDB Service] Failed to fetch now-playing movies:', err.message);

      // 5. Fallback: Check if stale cache exists
      const stale = await this._getFromCache(cacheKey, true);
      if (stale) {
        console.warn('[TMDB Service] Serving stale cache during external outage');
        return { ...stale, source: 'stale_cache', isDegraded: true };
      }

      throw err;
    }
  }

  /**
   * Fetch individual movie details with Redis caching and resilience.
   */
  async getMovieDetails(movieId) {
    const cacheKey = `matinee:tmdb:movie:${movieId}`;

    // 1. Check Redis cache first
    const cached = await this._getFromCache(cacheKey);
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    // 2. Fetch from TMDB with retry & backoff
    try {
      const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${this.apiKey}&language=en-US`;
      const rawData = await this._fetchWithRetry(url);

      // 3. Map into Matinee normalized type
      const normalized = this._normalizeMovieDetails(rawData);

      // 4. Store in Redis
      await this._saveToCache(cacheKey, normalized, TTL_MOVIE_DETAILS_SECONDS);

      return { ...normalized, source: 'tmdb' };
    } catch (err) {
      console.error(`[TMDB Service] Failed to fetch movie details for ID ${movieId}:`, err.message);

      const stale = await this._getFromCache(cacheKey, true);
      if (stale) {
        console.warn(`[TMDB Service] Serving stale details for movie ID ${movieId}`);
        return { ...stale, source: 'stale_cache', isDegraded: true };
      }

      throw err;
    }
  }

  // ─── Private Resilience & HTTP Helpers ─────────────────────────────────────

  /**
   * Resilient HTTP fetcher with exponential backoff and jitter.
   */
  async _fetchWithRetry(url, maxRetries = 3) {
    if (!this.apiKey) {
      throw new Error('TMDB_API_KEY is not configured in backend environment.');
    }

    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000) // 8 second network timeout
        });

        // Handle rate limits (HTTP 429) or transient server errors (5xx)
        if (response.status === 429 || response.status >= 500) {
          attempt++;
          if (attempt >= maxRetries) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`TMDB error HTTP ${response.status}: ${errorText}`);
          }

          // Backoff calculation: base delay * 2^attempt + jitter
          const delay = Math.pow(2, attempt) * 300 + Math.random() * 200;
          console.warn(`[TMDB Service] Rate limited or server error (${response.status}). Retrying in ${Math.round(delay)}ms...`);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.status_message || `TMDB API failed with status ${response.status}`);
        }

        return await response.json();
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) throw err;
        const delay = Math.pow(2, attempt) * 300;
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }

  /**
   * Redis cache retrieval with graceful error containment.
   */
  async _getFromCache(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn('[Redis] Cache read failure:', err.message);
      return null;
    }
  }

  /**
   * Redis cache write with graceful error containment.
   */
  async _saveToCache(key, data, ttlSeconds) {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch (err) {
      console.warn('[Redis] Cache write failure:', err.message);
    }
  }

  // ─── Data Normalization Mappers (Matinee Domain Types) ─────────────────────

  /**
   * Maps TMDB's raw movie list response into Matinee's clean Movie list type.
   */
  _normalizeMovieList(tmdbData) {
    return {
      page: tmdbData.page || 1,
      totalPages: tmdbData.total_pages || 1,
      totalResults: tmdbData.total_results || 0,
      movies: (tmdbData.results || []).map(item => this._mapRawMovieToDomain(item))
    };
  }

  /**
   * Maps a single raw TMDB movie object into our application-owned Movie type.
   */
  _mapRawMovieToDomain(raw) {
    return {
      id: String(raw.id),
      tmdbId: raw.id,
      title: raw.title || raw.original_title || 'Untitled Movie',
      synopsis: raw.overview || 'No synopsis available.',
      posterUrl: raw.poster_path ? `${TMDB_IMAGE_BASE_W500}${raw.poster_path}` : null,
      backdropUrl: raw.backdrop_path ? `${TMDB_IMAGE_BASE_ORIGINAL}${raw.backdrop_path}` : null,
      releaseDate: raw.release_date || null,
      rating: typeof raw.vote_average === 'number' ? Number(raw.vote_average.toFixed(1)) : 0,
      voteCount: raw.vote_count || 0,
      popularity: raw.popularity || 0,
      isAdult: Boolean(raw.adult)
    };
  }

  /**
   * Maps TMDB movie details response into our application-owned MovieDetails type.
   */
  _normalizeMovieDetails(raw) {
    const base = this._mapRawMovieToDomain(raw);
    return {
      ...base,
      runtimeMinutes: raw.runtime || 0,
      tagline: raw.tagline || '',
      status: raw.status || 'Released',
      genres: (raw.genres || []).map(g => ({ id: g.id, name: g.name })),
      budget: raw.budget || 0,
      revenue: raw.revenue || 0,
      originalLanguage: raw.original_language || 'en'
    };
  }
}

module.exports = new TmdbService();
