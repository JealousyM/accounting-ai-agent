import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

// ============================================
// EMAIL TEMPLATES
// ============================================

interface EmailTemplates {
  subject: string;
  html: string;
}

const getPasswordResetEmailTemplate = (
  resetLink: string,
  locale: string = 'en'
): EmailTemplates => {
  const templates: Record<string, EmailTemplates> = {
    en: {
      subject: 'Password Reset Request',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #f9f9f9; border-radius: 8px; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #2563eb; margin: 0; }
    .content { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .button { display: inline-block; background: #2563eb; color: #fff !important; text-decoration: none; padding: 12px 30px; border-radius: 6px; margin: 20px 0; }
    .button:hover { background: #1d4ed8; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>We received a request to reset your password for your Accounting AI Agent account.</p>
      <p>Click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2563eb;">${resetLink}</p>
      <div class="warning">
        <strong>Important:</strong> This link will expire in 1 hour. If you did not request a password reset, please ignore this email or contact support if you have concerns.
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message from Accounting AI Agent. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    pl: {
      subject: 'Prosby o zresetowanie hasla',
      html: `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resetowanie hasla</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #f9f9f9; border-radius: 8px; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #2563eb; margin: 0; }
    .content { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .button { display: inline-block; background: #2563eb; color: #fff !important; text-decoration: none; padding: 12px 30px; border-radius: 6px; margin: 20px 0; }
    .button:hover { background: #1d4ed8; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Resetowanie hasla</h1>
    </div>
    <div class="content">
      <p>Czesc,</p>
      <p>Otrzymalismy prosbe o zresetowanie hasla do Twojego konta Accounting AI Agent.</p>
      <p>Kliknij przycisk ponizej, aby zresetowac haslo:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Zresetuj haslo</a>
      </p>
      <p>Lub skopiuj i wklej ten link do przegladarki:</p>
      <p style="word-break: break-all; color: #2563eb;">${resetLink}</p>
      <div class="warning">
        <strong>Wazne:</strong> Ten link wygasnie za 1 godzine. Jesli nie prosiles o zresetowanie hasla, zignoruj ten e-mail lub skontaktuj sie z obsluga, jesli masz jakies watpliwosci.
      </div>
    </div>
    <div class="footer">
      <p>To jest automatyczna wiadomosc z Accounting AI Agent. Prosimy nie odpowiadac na tego e-maila.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    ru: {
      subject: 'Запрос на сброс пароля',
      html: `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Сброс пароля</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #f9f9f9; border-radius: 8px; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #2563eb; margin: 0; }
    .content { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .button { display: inline-block; background: #2563eb; color: #fff !important; text-decoration: none; padding: 12px 30px; border-radius: 6px; margin: 20px 0; }
    .button:hover { background: #1d4ed8; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Сброс пароля</h1>
    </div>
    <div class="content">
      <p>Здравствуйте,</p>
      <p>Мы получили запрос на сброс пароля для вашей учётной записи Accounting AI Agent.</p>
      <p>Нажмите кнопку ниже, чтобы сбросить пароль:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Сбросить пароль</a>
      </p>
      <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
      <p style="word-break: break-all; color: #2563eb;">${resetLink}</p>
      <div class="warning">
        <strong>Важно:</strong> Эта ссылка истечёт через 1 час. Если вы не запрашивали сброс пароля, проигнорируйте это письмо или свяжитесь с поддержкой, если у вас есть вопросы.
      </div>
    </div>
    <div class="footer">
      <p>Это автоматическое сообщение от Accounting AI Agent. Пожалуйста, не отвечайте на это письмо.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
  };

  return templates[locale] || templates['en'];
};

// ============================================
// EMAIL SERVICE
// ============================================

export class EmailService {
  private transporter: Transporter | null = null;
  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpUser: string;
  private readonly smtpPass: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  constructor() {
    this.smtpHost = process.env.SMTP_HOST || '';
    this.smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    this.smtpUser = process.env.SMTP_USER || '';
    this.smtpPass = process.env.SMTP_PASS || '';
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@example.com';
    this.fromName = process.env.SMTP_FROM_NAME || 'Accounting AI Agent';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer transporter
   */
  private initializeTransporter(): void {
    if (!this.smtpHost || !this.smtpUser || !this.smtpPass) {
      logger.warn('SMTP configuration is incomplete. Email sending will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpPort === 465,
        auth: {
          user: this.smtpUser,
          pass: this.smtpPass,
        },
      });

      // Verify connection
      this.transporter.verify((error: Error | null) => {
        if (error) {
          logger.error('SMTP connection verification failed', { error: error.message });
        } else {
          logger.info('SMTP server is ready to send emails');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email transporter', { error });
    }
  }

  /**
   * Check if email service is configured and ready
   */
  isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    locale: string = 'en'
  ): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not configured. Cannot send password reset email.', { email });
      // In development, log the reset link instead
      if (process.env.NODE_ENV !== 'production') {
        const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
        logger.info('Password reset link (dev mode)', { email, resetLink });
      }
      return false;
    }

    try {
      const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
      const template = getPasswordResetEmailTemplate(resetLink, locale);

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Password reset email sent successfully', {
        email,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send password reset email', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
