const tmdbService = require('./tmdb.service');

class MovieController {
  async getNowPlaying(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const data = await tmdbService.getNowPlaying(page);
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

      const data = await tmdbService.getMovieDetails(id);
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
