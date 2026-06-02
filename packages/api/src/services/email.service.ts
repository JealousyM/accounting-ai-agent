import * as fs from 'fs';
import * as path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

// ============================================
// TEMPLATE LOADER
// ============================================

const TEMPLATES_DIR = path.resolve(__dirname, '../../templates/email');
const templateCache = new Map<string, string>();

function loadTemplate(name: string, locale: string, vars: Record<string, string>): string {
  const key = `${name}.${locale}`;
  let tpl = templateCache.get(key);
  if (!tpl) {
    const filepath = path.join(TEMPLATES_DIR, `${key}.html`);
    tpl = fs.readFileSync(filepath, 'utf-8');
    templateCache.set(key, tpl);
  }
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
}

// ============================================
// TEMPLATE SUBJECTS
// ============================================

const welcomeSubjects: Record<string, string> = {
  en: 'Welcome to Accounting AI Agent!',
  pl: 'Witamy w Accounting AI Agent!',
  ru: 'Добро пожаловать в Accounting AI Agent!',
};

const passwordResetSubjects: Record<string, string> = {
  en: 'Password Reset Request',
  pl: 'Prosby o zresetowanie hasla',
  ru: 'Запрос на сброс пароля',
};

// ============================================
// KSeF NOTIFICATION INTERFACE + HELPERS
// ============================================

export interface KSeFNotificationParams {
  invoiceNumber: string;
  status: 'accepted' | 'rejected';
  referenceNumber?: string;
  errorCode?: string;
  errorMessage?: string;
  dashboardLink: string;
}

function buildKSeFLocale(locale: string, params: KSeFNotificationParams) {
  const { invoiceNumber, status, referenceNumber, errorCode, errorMessage } = params;
  const isAccepted = status === 'accepted';

  const labels = {
    invoiceNumber: locale === 'pl' ? 'Numer faktury' : locale === 'ru' ? 'Номер счёта' : 'Invoice number',
    ksefRef: locale === 'pl' ? 'Numer referencyjny KSeF' : locale === 'ru' ? 'Референс KSeF' : 'KSeF reference',
    errorCode: locale === 'pl' ? 'Kod bledu' : locale === 'ru' ? 'Код ошибки' : 'Error code',
    reason: locale === 'pl' ? 'Przyczyna' : locale === 'ru' ? 'Причина' : 'Reason',
  };

  const detailsHtml = `
    <div class="details">
      <p><strong>${labels.invoiceNumber}:</strong> ${invoiceNumber}</p>
      ${referenceNumber ? `<p><strong>${labels.ksefRef}:</strong> ${referenceNumber}</p>` : ''}
      ${!isAccepted && errorCode ? `<p><strong>${labels.errorCode}:</strong> ${errorCode}</p>` : ''}
      ${!isAccepted && errorMessage ? `<p><strong>${labels.reason}:</strong> ${errorMessage}</p>` : ''}
    </div>`;

  const subjects: Record<string, { accepted: string; rejected: string }> = {
    en: { accepted: `KSeF: Invoice ${invoiceNumber} accepted`, rejected: `KSeF: Invoice ${invoiceNumber} rejected` },
    pl: { accepted: `KSeF: Faktura ${invoiceNumber} zaakceptowana`, rejected: `KSeF: Faktura ${invoiceNumber} odrzucona` },
    ru: { accepted: `KSeF: Счёт ${invoiceNumber} принят`, rejected: `KSeF: Счёт ${invoiceNumber} отклонён` },
  };

  const titles: Record<string, { accepted: string; rejected: string }> = {
    en: { accepted: 'Invoice Accepted', rejected: 'Invoice Rejected' },
    pl: { accepted: 'Faktura zaakceptowana', rejected: 'Faktura odrzucona' },
    ru: { accepted: 'Счёт принят', rejected: 'Счёт отклонён' },
  };

  const descriptions: Record<string, { accepted: string; rejected: string }> = {
    en: { accepted: `Your invoice <strong>${invoiceNumber}</strong> has been <strong>accepted</strong> by KSeF.`, rejected: `Your invoice <strong>${invoiceNumber}</strong> has been <strong>rejected</strong> by KSeF.` },
    pl: { accepted: `Twoja faktura <strong>${invoiceNumber}</strong> zostala <strong>zaakceptowana</strong> przez KSeF.`, rejected: `Twoja faktura <strong>${invoiceNumber}</strong> zostala <strong>odrzucona</strong> przez KSeF.` },
    ru: { accepted: `Ваш счёт <strong>${invoiceNumber}</strong> был <strong>принят</strong> системой KSeF.`, rejected: `Ваш счёт <strong>${invoiceNumber}</strong> был <strong>отклонён</strong> системой KSeF.` },
  };

  const lang = subjects[locale] ? locale : 'en';
  const key = isAccepted ? 'accepted' : 'rejected';

  return {
    subject: subjects[lang][key],
    statusClass: isAccepted ? 'success' : 'error',
    statusTitle: titles[lang][key],
    statusDescription: descriptions[lang][key],
    detailsHtml,
  };
}

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

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    locale: string = 'en'
  ): Promise<{ sent: boolean; reason?: string }> {
    if (!this.transporter) {
      const reason = 'SMTP not configured — check SMTP_HOST, SMTP_USER, SMTP_PASS env vars';
      logger.warn(reason, { email });
      if (process.env.NODE_ENV !== 'production') {
        const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
        logger.info('Password reset link (dev mode)', { email, resetLink });
      }
      return { sent: false, reason };
    }

    try {
      const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
      const lang = passwordResetSubjects[locale] ? locale : 'en';
      const html = loadTemplate('password-reset', lang, { resetLink });

      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject: passwordResetSubjects[lang],
        html,
      });

      logger.info('Password reset email sent successfully', { email, messageId: result.messageId });
      return { sent: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown SMTP error';
      logger.error('Failed to send password reset email', { email, error: reason });
      return { sent: false, reason };
    }
  }

  async sendWelcomeEmail(
    email: string,
    firstName: string,
    locale: string = 'en'
  ): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not configured. Cannot send welcome email.', { email });
      return false;
    }

    try {
      const loginLink = `${this.frontendUrl}/chat`;
      const lang = welcomeSubjects[locale] ? locale : 'en';
      const html = loadTemplate('welcome', lang, { firstName, loginLink });

      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject: welcomeSubjects[lang],
        html,
      });

      logger.info('Welcome email sent successfully', { email, messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send welcome email', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async sendKSeFNotification(
    email: string,
    params: KSeFNotificationParams,
    locale: string = 'en'
  ): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not configured. Cannot send KSeF notification.', { email });
      return false;
    }

    try {
      const lang = ['en', 'pl', 'ru'].includes(locale) ? locale : 'en';
      const { subject, statusClass, statusTitle, statusDescription, detailsHtml } =
        buildKSeFLocale(lang, params);
      const html = loadTemplate('ksef-notification', lang, {
        statusClass,
        statusTitle,
        statusDescription,
        detailsHtml,
        dashboardLink: params.dashboardLink,
      });

      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: email,
        subject,
        html,
      });

      logger.info('KSeF notification email sent', {
        email,
        invoiceNumber: params.invoiceNumber,
        status: params.status,
        messageId: result.messageId,
      });
      return true;
    } catch (error) {
      logger.error('Failed to send KSeF notification email', {
        email,
        invoiceNumber: params.invoiceNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

export const emailService = new EmailService();
