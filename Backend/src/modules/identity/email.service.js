const nodemailer = require('nodemailer');
const { logger } = require('../../config/logger');

/**
 * Matinee Email Service
 * 
 * Architecture:
 * - Default Free Provider: Nodemailer (SMTP or automated zero-cost Ethereal sandbox)
 * - Scaled Provider: Resend (seamlessly activates when RESEND_API_KEY is configured)
 */
class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'nodemailer');
    this.transporter = null;
    this.isInitialized = false;
  }

  /**
   * Initializes Nodemailer transporter.
   * If custom SMTP env vars are absent, uses Ethereal test account for 100% free sandbox delivery.
   */
  async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      logger.info('EmailService: Initialized Nodemailer with custom SMTP', { host, port, user });
    } else {
      // Free development sandbox via Ethereal or test mock
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      logger.info('EmailService: Initialized Nodemailer with free Ethereal sandbox', {
        user: testAccount.user
      });
    }

    return this.transporter;
  }

  /**
   * Send email using Resend API (HTTP-based, zero SMTP overhead)
   */
  async sendWithResend({ to, subject, html, text }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured in environment');
    }

    const from = process.env.EMAIL_FROM || 'Matinee <noreply@matinee.app>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text
      })
    });

    const data = await response.json();
    if (!response.ok) {
      logger.error('EmailService: Resend API error', { error: data });
      throw new Error(data.message || 'Failed to send email via Resend');
    }

    logger.info('EmailService: Email sent successfully via Resend', { id: data.id, to });
    return { provider: 'resend', id: data.id };
  }

  /**
   * Send email using Nodemailer (Free SMTP or Ethereal)
   */
  async sendWithNodemailer({ to, subject, html, text }) {
    const transporter = await this.getTransporter();
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || '"Matinee Cinema" <noreply@matinee.app>';

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info('EmailService: Verification email dispatched via Nodemailer', {
      messageId: info.messageId,
      to,
      previewUrl: previewUrl || 'Standard SMTP delivered'
    });

    return {
      provider: 'nodemailer',
      messageId: info.messageId,
      previewUrl
    };
  }

  /**
   * Unified send method that selects between Nodemailer and Resend based on configuration
   */
  async sendEmail({ to, subject, html, text }) {
    // If Resend API key is present and configured, use Resend
    if (this.provider === 'resend' || (process.env.RESEND_API_KEY && process.env.EMAIL_PROVIDER !== 'nodemailer')) {
      try {
        return await this.sendWithResend({ to, subject, html, text });
      } catch (err) {
        logger.warn('EmailService: Resend failed, falling back to Nodemailer', { error: err.message });
        return await this.sendWithNodemailer({ to, subject, html, text });
      }
    }

    // Default: Nodemailer (Free)
    return await this.sendWithNodemailer({ to, subject, html, text });
  }

  /**
   * Sends a one-time verification link to the user
   */
  async sendVerificationEmail({ to, name = 'Moviegoer', verificationUrl, token }) {
    const subject = 'Verify your Matinee email address';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Matinee Account</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0B0E14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      background-color: #121824;
      border: 1px solid #1E293B;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px;
      background: linear-gradient(180deg, #1A2234 0%, #121824 100%);
      text-align: center;
      border-bottom: 1px solid #1E293B;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #E5A93C;
      text-transform: uppercase;
      margin: 0;
    }
    .content {
      padding: 36px 32px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #F8FAFC;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #94A3B8;
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #E5A93C;
      color: #000000 !important;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(229, 169, 60, 0.3);
      transition: background-color 0.2s ease;
    }
    .notice {
      background-color: #0B0E14;
      border-left: 3px solid #E5A93C;
      padding: 14px 16px;
      border-radius: 4px;
      font-size: 13px;
      color: #CBD5E1;
      margin-bottom: 24px;
    }
    .link-alt {
      font-size: 12px;
      color: #64748B;
      word-break: break-all;
    }
    .link-alt a {
      color: #E5A93C;
      text-decoration: underline;
    }
    .footer {
      padding: 24px 32px;
      background-color: #0A0D14;
      border-top: 1px solid #1E293B;
      text-align: center;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MATINEE</div>
    </div>
    <div class="content">
      <h1>Confirm Your Email Address</h1>
      <p>Hello ${name},</p>
      <p>Welcome to Matinee! To complete your registration and activate your account, please verify your email address by clicking the button below.</p>
      
      <div class="btn-container">
        <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
      </div>

      <div class="notice">
        <strong>Important:</strong> This verification link is valid for <strong>24 hours</strong> and can only be used once. If you did not create a Matinee account, you can safely ignore this email.
      </div>

      <p class="link-alt">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="${verificationUrl}">${verificationUrl}</a>
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Matinee Cinema Technologies. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Hello ${name},

Welcome to Matinee! Please verify your email address by clicking the link below:

${verificationUrl}

This link is valid for 24 hours and can only be used once.

If you did not sign up for Matinee, you can safely ignore this message.

— The Matinee Team
    `.trim();

    return this.sendEmail({ to, subject, html, text });
  }
}

module.exports = new EmailService();
