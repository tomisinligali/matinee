const express = require('express');
const movieController = require('./movie.controller');
const { searchLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.get('/now-playing', searchLimiter, (req, res, next) => movieController.getNowPlaying(req, res, next));
router.get('/:id', searchLimiter, (req, res, next) => movieController.getMovieDetails(req, res, next));

module.exports = router;

