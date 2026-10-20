const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const verificationCodeService = require('./verificationCode.service');
const { enqueueJob } = require('../jobs/jobWorker');
const { logger } = require('../../config/logger');

class IdentityService {
  async register({ email, password, name, role = 'CUSTOMER', baseUrl }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      const error = new Error('A user with this email address already exists');
      error.code = 'EMAIL_ALREADY_EXISTS';
      error.status = 409;
      throw error;
    }

    // Cryptographic Salting & Hashing: bcrypt with cost factor 12 (2^12 = 4096 rounds)
    // Guarantees unique 128-bit salt per user; plaintext password is NEVER stored
    const BCRYPT_COST_FACTOR = 12;
    const salt = await bcrypt.genSalt(BCRYPT_COST_FACTOR);
    const passwordHash = await bcrypt.hash(password, salt);

    // Parse name components (handling 1, 2, 3, or more words)
    let firstName = null;
    let middleName = null;
    let lastName = null;

    if (name) {
      const words = name.trim().split(/\s+/).filter(Boolean);
      if (words.length === 1) {
        firstName = words[0];
      } else if (words.length === 2) {
        firstName = words[0];
        lastName = words[1];
      } else if (words.length >= 3) {
        firstName = words[0];
        lastName = words[words.length - 1];
        middleName = words.slice(1, -1).join(' '); // Handles compound/multiple middle names
      }
    }

    // Generate cryptographically secure verification code using crypto.randomBytes(32)
    // Strictly zero Math.random() or crypto.randomInt()
    const verificationCode = verificationCodeService.generateCode();
    const verificationToken = verificationCodeService.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name ? name.trim() : null,
        firstName,
        middleName,
        lastName,
        passwordHash,
        role: ['CUSTOMER', 'CINEMA_OPERATOR', 'PLATFORM_ADMIN'].includes(role) ? role : 'CUSTOMER',
        emailVerified: false,
        verificationCode,
        verificationCodeExpiresAt: expiresAt,
        verificationToken,
        verificationTokenExpiresAt: expiresAt
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // Build one-time verification link
    const appBaseUrl = baseUrl || process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;
    const verificationUrl = `${appBaseUrl}/api/v1/auth/verify-email?token=${verificationToken}`;

    // Enqueue durable background job to send email via Nodemailer
    try {
      await enqueueJob({
        queueName: 'email_notifications',
        jobType: 'SEND_VERIFICATION_EMAIL',
        payload: {
          to: user.email,
          name: user.name || user.firstName || 'Moviegoer',
          verificationCode,
          verificationUrl,
          token: verificationToken
        },
        correlationId: user.id
      });
      logger.info('IdentityService: Enqueued SEND_VERIFICATION_EMAIL background job', {
        userId: user.id,
        email: user.email
      });
    } catch (jobErr) {
      logger.error('IdentityService: Failed to enqueue verification email background job', {
        error: jobErr.message,
        userId: user.id
      });
    }

    const token = this.generateToken(user);

    return { user, token, verificationCode, verificationToken };
  }

  /**
   * Verify email using 6-digit verification code entered by user in mobile app form
   */
  async verifyCode({ email, code }) {
    if (!email || typeof email !== 'string') {
      const error = new Error('Email address is required');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    if (!code || typeof code !== 'string') {
      const error = new Error('Verification code is required');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      throw error;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      const error = new Error('No account found with this email address');
      error.code = 'USER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (user.emailVerified) {
      const token = this.generateToken(user);
      return {
        success: true,
        message: 'Email is already verified.',
        emailVerified: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: true
        },
        token
      };
    }

    if (!user.verificationCode || user.verificationCode !== normalizedCode) {
      const error = new Error('Invalid verification code. Please check your email or request a new code.');
      error.code = 'INVALID_VERIFICATION_CODE';
      error.status = 400;
      throw error;
    }

    // Check expiration
    if (user.verificationCodeExpiresAt && new Date(user.verificationCodeExpiresAt) < new Date()) {
      const error = new Error('Verification code has expired. Please request a new code.');
      error.code = 'VERIFICATION_CODE_EXPIRED';
      error.status = 400;
      throw error;
    }

    // Atomic update: Mark verified and invalidate one-time code & token
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationCode: null,
        verificationCodeExpiresAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        emailVerifiedAt: true
      }
    });

    logger.info('IdentityService: Verification code confirmed successfully', { userId: updated.id, email: updated.email });

    const token = this.generateToken(updated);

    return {
      success: true,
      message: 'Email address verified successfully!',
      user: updated,
      token
    };
  }

  /**
   * Verify email using a one-time cryptographic link/token
   * Once used, token and code are cleared atomically, ensuring it cannot be used again
   */
  async verifyEmail(token) {
    if (!token || typeof token !== 'string') {
      const error = new Error('Verification token is required');
      error.code = 'INVALID_VERIFICATION_TOKEN';
      error.status = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { verificationToken: token }
    });

    if (!user) {
      const error = new Error('Invalid or expired verification link. This one-time link may have already been used.');
      error.code = 'INVALID_VERIFICATION_TOKEN';
      error.status = 400;
      throw error;
    }

    // Check expiration
    if (user.verificationTokenExpiresAt && new Date(user.verificationTokenExpiresAt) < new Date()) {
      const error = new Error('Verification link has expired. Please request a new verification link.');
      error.code = 'VERIFICATION_TOKEN_EXPIRED';
      error.status = 400;
      throw error;
    }

    // Atomic update: Mark verified and invalidate token and code (one-time guarantee)
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationCode: null,
        verificationCodeExpiresAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        emailVerifiedAt: true
      }
    });

    logger.info('IdentityService: Email successfully verified via link', { userId: updated.id, email: updated.email });

    return updated;
  }

  /**
   * Resend a fresh one-time verification code and link via background job
   */
  async resendVerification({ email, baseUrl }) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      const error = new Error('No account found with this email address');
      error.code = 'USER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (user.emailVerified) {
      return {
        alreadyVerified: true,
        message: 'This email address is already verified.'
      };
    }

    // Generate fresh one-time code and token using crypto.randomBytes(32)
    const verificationCode = verificationCodeService.generateCode();
    const verificationToken = verificationCodeService.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationCodeExpiresAt: expiresAt,
        verificationToken,
        verificationTokenExpiresAt: expiresAt
      }
    });

    const appBaseUrl = baseUrl || process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;
    const verificationUrl = `${appBaseUrl}/api/v1/auth/verify-email?token=${verificationToken}`;

    // Enqueue durable background job to dispatch email
    await enqueueJob({
      queueName: 'email_notifications',
      jobType: 'SEND_VERIFICATION_EMAIL',
      payload: {
        to: user.email,
        name: user.name || user.firstName || 'Moviegoer',
        verificationCode,
        verificationUrl,
        token: verificationToken
      },
      correlationId: user.id
    });

    logger.info('IdentityService: Enqueued fresh verification email background job', { email: user.email });

    return {
      success: true,
      verificationCode, // Exposed for development/testing convenience
      message: 'A new 6-digit verification code has been sent to your email address.'
    };
  }

  async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      const error = new Error('Invalid email or password');
      error.code = 'INVALID_CREDENTIALS';
      error.status = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.code = 'INVALID_CREDENTIALS';
      error.status = 401;
      throw error;
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    };

    const token = this.generateToken(safeUser);

    return { user: safeUser, token };
  }

  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    return user;
  }

  generateToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

module.exports = new IdentityService();
