const express = require('express');
const movieController = require('./movie.controller');

const router = express.Router();

router.get('/now-playing', (req, res, next) => movieController.getNowPlaying(req, res, next));
router.get('/:id', (req, res, next) => movieController.getMovieDetails(req, res, next));

module.exports = router;
