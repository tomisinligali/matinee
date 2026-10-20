const identityService = require('./identity.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_LETTERS_ONLY_REGEX = /^[a-zA-Z\s]+$/;

class IdentityController {
  async register(req, res, next) {
    try {
      const { email, password, name, role } = req.body || {};

      // 1. Full Name Validation (Server-Side)
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'name',
            message: 'Full Name field cannot be empty'
          }
        });
      }

      const trimmedName = name.trim();

      if (!NAME_LETTERS_ONLY_REGEX.test(trimmedName)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'name',
            message: 'Name Must Use Only Letters'
          }
        });
      }

      const nameWords = trimmedName.split(/\s+/).filter(Boolean);
      if (nameWords.length < 2) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'name',
            message: 'Please enter at least 2 words (e.g. First and Last name)'
          }
        });
      }

      // 2. Email Address Validation (Server-Side)
      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'email',
            message: 'Email Address field cannot be empty'
          }
        });
      }

      const trimmedEmail = email.trim().toLowerCase();
      const emailParts = trimmedEmail.split('@');
      const hasDomainAfterAt = emailParts.length > 1 && emailParts[1].length > 0 && emailParts[1].includes('.') && emailParts[1].split('.')[1]?.length >= 2;

      if (!EMAIL_REGEX.test(trimmedEmail) || !hasDomainAfterAt) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'email',
            message: 'Enter A Valid Email Address'
          }
        });
      }

      // 3. Password Validation (Server-Side): [8 min, 64 max]
      if (!password || typeof password !== 'string' || !password.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'password',
            message: 'Password field cannot be empty'
          }
        });
      }

      const trimmedPassword = password.trim();

      if (trimmedPassword.length < 8 || trimmedPassword.length > 64) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'password',
            message: 'Password must be between 8 and 64 characters in length'
          }
        });
      }

      const result = await identityService.register({
        email: trimmedEmail,
        password: trimmedPassword,
        name: trimmedName,
        role
      });
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

      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'email',
            message: 'Email Address field cannot be empty'
          }
        });
      }

      if (!password || typeof password !== 'string' || !password.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'password',
            message: 'Password field cannot be empty'
          }
        });
      }

      const trimmedPassword = password.trim();
      if (trimmedPassword.length < 8 || trimmedPassword.length > 64) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'password',
            message: 'Password must be between 8 and 64 characters in length'
          }
        });
      }

      const result = await identityService.login({
        email: email.trim().toLowerCase(),
        password: trimmedPassword
      });
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
