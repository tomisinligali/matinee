const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const emailService = require('./email.service');
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

    // Generate cryptographically secure one-time verification token (24-hour expiry)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
        verificationToken,
        verificationTokenExpiresAt
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

    // Dispatch verification email via Nodemailer (or Resend when configured)
    try {
      await emailService.sendVerificationEmail({
        to: user.email,
        name: user.name || user.firstName || 'Moviegoer',
        verificationUrl,
        token: verificationToken
      });
    } catch (emailErr) {
      logger.error('IdentityService: Failed to dispatch verification email during registration', {
        error: emailErr.message,
        userId: user.id,
        email: user.email
      });
    }

    const token = this.generateToken(user);

    return { user, token, verificationToken };
  }

  /**
   * Verify email using a one-time cryptographic link/token
   * Once used, token is cleared atomically, ensuring it cannot be used again
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

    // Atomic update: Mark verified and invalidate token (one-time link guarantee)
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
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

    logger.info('IdentityService: Email successfully verified', { userId: updated.id, email: updated.email });

    return updated;
  }

  /**
   * Resend a fresh one-time verification link
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

    // Generate fresh one-time token and 24-hour expiry
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiresAt
      }
    });

    const appBaseUrl = baseUrl || process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;
    const verificationUrl = `${appBaseUrl}/api/v1/auth/verify-email?token=${verificationToken}`;

    await emailService.sendVerificationEmail({
      to: user.email,
      name: user.name || user.firstName || 'Moviegoer',
      verificationUrl,
      token: verificationToken
    });

    logger.info('IdentityService: Fresh verification link dispatched', { email: user.email });

    return {
      success: true,
      message: 'A new one-time verification link has been sent to your email address.'
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
