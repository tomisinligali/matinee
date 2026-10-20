const identityService = require('./identity.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_LETTERS_ONLY_REGEX = /^[a-zA-Z\s]+$/;

function renderVerificationHtml({ success, title, message, subtext }) {
  const accentColor = success ? '#E5A93C' : '#EF4444';
  const iconSvg = success
    ? `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#E5A93C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Matinee</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0B0E14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background-color: #121824;
      border: 1px solid #1E293B;
      border-radius: 20px;
      padding: 48px 36px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
    }
    .logo {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #E5A93C;
      margin-bottom: 32px;
      text-transform: uppercase;
    }
    .icon {
      margin-bottom: 24px;
      display: flex;
      justify-content: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 0 0 16px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #94A3B8;
      margin: 0 0 24px;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 9999px;
      background-color: rgba(229, 169, 60, 0.1);
      border: 1px solid rgba(229, 169, 60, 0.3);
      color: #E5A93C;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .subtext {
      font-size: 13px;
      color: #64748B;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">MATINEE</div>
    <div class="icon">${iconSvg}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${success ? '<div class="badge">Verified &amp; Activated</div>' : ''}
    <div class="subtext">${subtext}</div>
  </div>
</body>
</html>
  `;
}

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

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const result = await identityService.register({
        email: trimmedEmail,
        password: trimmedPassword,
        name: trimmedName,
        role,
        baseUrl
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

  async verifyEmail(req, res, next) {
    const isHtmlPreferred = req.headers.accept && req.headers.accept.includes('text/html') && req.query.format !== 'json';

    try {
      const { token } = req.query;

      if (!token) {
        if (isHtmlPreferred) {
          return res.status(400).send(renderVerificationHtml({
            success: false,
            title: 'Verification Failed',
            message: 'No verification token was provided in the link.',
            subtext: 'Please check the link in your email or request a new one.'
          }));
        }
        return res.status(400).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Verification token is required in query parameter'
          }
        });
      }

      const user = await identityService.verifyEmail(token);

      if (isHtmlPreferred) {
        return res.status(200).send(renderVerificationHtml({
          success: true,
          title: 'Email Verified Successfully!',
          message: `Your email (${user.email}) has been verified. Your Matinee account is now active and ready for ticket bookings.`,
          subtext: 'You may now return to the Matinee app and continue.'
        }));
      }

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        user
      });
    } catch (err) {
      const status = err.status || 500;
      const message = err.message || 'Email verification failed';

      if (isHtmlPreferred) {
        return res.status(status).send(renderVerificationHtml({
          success: false,
          title: 'Verification Link Expired or Invalid',
          message,
          subtext: 'Each verification link is single-use only. If you already verified your account, you can return to the app.'
        }));
      }

      return res.status(status).json({
        error: {
          code: err.code || 'VERIFICATION_FAILED',
          message
        }
      });
    }
  }

  async resendVerification(req, res, next) {
    try {
      const { email } = req.body || {};

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
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: 'email',
            message: 'Enter A Valid Email Address'
          }
        });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const result = await identityService.resendVerification({ email: trimmedEmail, baseUrl });

      return res.status(200).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          error: {
            code: err.code || 'RESEND_FAILED',
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
