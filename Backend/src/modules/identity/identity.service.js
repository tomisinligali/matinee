const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');

class IdentityService {
  async register({ email, password, name, role = 'CUSTOMER' }) {
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

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name ? name.trim() : null,
        firstName,
        middleName,
        lastName,
        passwordHash,
        role: ['CUSTOMER', 'CINEMA_OPERATOR', 'PLATFORM_ADMIN'].includes(role) ? role : 'CUSTOMER'
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });

    const token = this.generateToken(user);

    return { user, token };
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
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

module.exports = new IdentityService();
