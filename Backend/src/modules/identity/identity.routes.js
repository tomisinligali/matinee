const express = require('express');
const identityController = require('./identity.controller');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

router.post('/register', (req, res, next) => identityController.register(req, res, next));
router.post('/login', (req, res, next) => identityController.login(req, res, next));
router.get('/verify-email', (req, res, next) => identityController.verifyEmail(req, res, next));
router.post('/resend-verification', (req, res, next) => identityController.resendVerification(req, res, next));
router.get('/me', requireAuth, (req, res, next) => identityController.getMe(req, res, next));

module.exports = router;
