const identityService = require('./identity.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class IdentityController {
  async register(req, res, next) {
    try {
      const { email, password, name, role } = req.body || {};

      if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A valid email address is required'
          }
        });
      }

      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters in length'
          }
        });
      }

      const result = await identityService.register({ email, password, name, role });
      return res.status(201).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          error: {
            code: err.code || 'REGISTRATION_FAILED',
            message: err.message
          }
        });
      }
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          }
        });
      }

      const result = await identityService.login({ email, password });
      return res.status(200).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          error: {
            code: err.code || 'LOGIN_FAILED',
            message: err.message
          }
        });
      }
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const userId = req.user.sub;
      const user = await identityService.getProfile(userId);
      return res.status(200).json({ user });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          error: {
            code: err.code || 'PROFILE_FAILED',
            message: err.message
          }
        });
      }
      next(err);
    }
  }
}

module.exports = new IdentityController();
