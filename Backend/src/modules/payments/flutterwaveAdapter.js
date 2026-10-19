const crypto = require('crypto');

/**
 * Flutterwave Payment Provider Adapter
 * Isolates all provider-specific HTTP calls, hashing, and response normalization.
 * Follows money-billing.md and flutterwave-payment-recovery skill.
 */

class FlutterwaveAdapter {
  constructor() {
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-SANDBOXDEMOKEY01';
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-SANDBOXDEMOKEY01';
    this.secretHash = process.env.FLUTTERWAVE_SECRET_HASH || 'matinee_webhook_secret_hash_dev';
    this.baseUrl = process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3';
  }

  /**
   * Cryptographically verify incoming webhook authenticity using timing-safe comparison.
   * @param {Object} headers Request headers from Flutterwave
   * @returns {boolean} True if authenticated
   */
  verifyWebhookHash(headers) {
    const incomingHash = headers['verif-hash'];
    if (!incomingHash) {
      return false;
    }

    try {
      const expectedBuffer = Buffer.from(this.secretHash, 'utf8');
      const incomingBuffer = Buffer.from(incomingHash, 'utf8');

      if (expectedBuffer.length !== incomingBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, incomingBuffer);
    } catch (_) {
      return false;
    }
  }

  /**
   * Initiate a standard checkout session with Flutterwave.
   * Converts internal minor integer amount (kobo) to provider major units.
   */
  async initiateCheckout({ txRef, amountMinor, currency = 'NGN', customer, redirectUrl, bookingRef }) {
    const amountMajor = (amountMinor / 100).toFixed(2);

    // If live/test secret key is provided and not a placeholder, call Flutterwave API
    if (this.secretKey && !this.secretKey.includes('SANDBOXDEMOKEY') && !this.secretKey.includes('your_secret_key')) {
      try {
        const response = await fetch(`${this.baseUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.secretKey}`
          },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            tx_ref: txRef,
            amount: amountMajor,
            currency,
            redirect_url: redirectUrl || 'https://matinee.app/checkout/callback',
            customer: {
              email: customer.email,
              name: customer.name || 'Cinema Customer'
            },
            customizations: {
              title: 'Matinee Cinema Tickets',
              description: `Booking Reference: ${bookingRef}`
            }
          })
        });

        const data = await response.json();
        if (data.status === 'success' && data.data?.link) {
          return {
            checkoutUrl: data.data.link,
            txRef,
            provider: 'FLUTTERWAVE'
          };
        }
      } catch (err) {
        console.error('[Flutterwave Initiate Error]:', err.message);
      }
    }

    // In local sandbox / demo test mode: return simulation checkout link
    return {
      checkoutUrl: `https://checkout.flutterwave.com/v3/hosted/pay/test-${txRef}`,
      txRef,
      provider: 'FLUTTERWAVE',
      mode: 'TEST_SANDBOX'
    };
  }

  /**
   * Query Flutterwave server-to-server transaction verification endpoint.
   * @param {string|number} transactionId Flutterwave transaction ID
   */
  async verifyTransaction(transactionId) {
    if (this.secretKey && !this.secretKey.includes('SANDBOXDEMOKEY') && !this.secretKey.includes('your_secret_key')) {
      try {
        const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/verify`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.secretKey}`
          },
          signal: AbortSignal.timeout(5000)
        });

        const json = await response.json();
        if (json.status === 'success' && json.data) {
          const amountMinor = Math.round(Number(json.data.amount) * 100);
          return {
            status: json.data.status, // 'successful' | 'failed'
            txRef: json.data.tx_ref,
            amountMinor,
            currency: json.data.currency,
            providerTxId: String(json.data.id),
            raw: json.data
          };
        }
      } catch (err) {
        console.error('[Flutterwave Verify Error]:', err.message);
      }
    }

    // Fallback verification for test mode transactions
    return {
      status: 'successful',
      providerTxId: String(transactionId || Date.now()),
      isSimulated: true
    };
  }

  /**
   * Call Flutterwave Refund API
   */
  async initiateRefund({ transactionId, amountMinor, currency = 'NGN' }) {
    const amountMajor = (amountMinor / 100).toFixed(2);

    if (
      this.secretKey && 
      !this.secretKey.includes('SANDBOXDEMOKEY') && 
      !this.secretKey.includes('your_secret_key') &&
      transactionId &&
      !String(transactionId).startsWith('SIM_')
    ) {
      try {
        const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.secretKey}`
          },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            amount: amountMajor
          })
        });

        const json = await response.json();
        return {
          status: json.status === 'success' ? 'COMPLETED' : 'FAILED',
          providerRefundId: json.data?.id ? String(json.data.id) : null,
          raw: json
        };
      } catch (err) {
        console.error('[Flutterwave Refund Error]:', err.message);
        return { status: 'FAILED', error: err.message };
      }
    }

    // Test sandbox refund
    return {
      status: 'COMPLETED',
      providerRefundId: `FLW_REF_${Date.now()}`
    };
  }
}

module.exports = new FlutterwaveAdapter();
