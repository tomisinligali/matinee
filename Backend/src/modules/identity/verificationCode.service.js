const crypto = require('crypto');

/**
 * Verification Code Service
 * 
 * Cryptographic Invariants:
 * 1. Uses crypto.randomBytes(32) as the authoritative source of entropy.
 * 2. Strictly NEVER uses Math.random().
 * 3. Strictly NEVER uses crypto.randomInt().
 * 4. Applies rejection sampling on the 32-bit unsigned integer extracted from the 32-byte
 *    buffer to eliminate modulo bias, ensuring every 6-digit code has identical probability.
 */
class VerificationCodeService {
  /**
   * Generates a 6-digit verification code using crypto.randomBytes(32)
   * @returns {string} 6-digit numeric verification code (e.g. "482091")
   */
  generateCode() {
    // 32 bytes (256 bits) of cryptographically secure random entropy
    const buffer = crypto.randomBytes(32);

    // Range: 100,000 to 999,999 (900,000 possibilities)
    const range = 900000;
    // Calculate largest multiple of range that fits in 32-bit unsigned integer (2^32 - 1 = 4,294,967,295)
    const maxUint32 = 0xFFFFFFFF;
    const maxValid = maxUint32 - (maxUint32 % range);

    let offset = 0;
    let uint32 = buffer.readUInt32BE(offset);

    // Rejection sampling: discard any value in the biased remainder zone
    while (uint32 >= maxValid && offset + 4 <= 28) {
      offset += 4;
      uint32 = buffer.readUInt32BE(offset);
    }

    // Uniformly map to [100000, 999999]
    const numericCode = 100000 + (uint32 % range);
    return numericCode.toString();
  }

  /**
   * Generates a hex verification token from the same 32 bytes of entropy
   * @returns {string} 64-character hex token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new VerificationCodeService();
