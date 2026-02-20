/**
 * KSeF Certificate Service
 * Manages digital certificates used for KSeF session authentication.
 * Certificates are stored per user in the KSeFCertificate model.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { KSeFCertificateError } from './errors';

export class KSeFCertificateService {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================
  // UPLOAD
  // ============================================

  /**
   * Upload and store a KSeF certificate for a user.
   * Validates that the certificate has not expired.
   * If isDefault is set, unsets any existing default certificate.
   */
  async uploadCertificate(
    userId: string,
    data: {
      certificateData: string; // Base64-encoded or encrypted certificate
      password?: string;
      subject: string;
      issuer: string;
      serialNumber: string;
      validFrom: Date;
      validUntil: Date;
      isDefault?: boolean;
    }
  ) {
    logger.info('Uploading KSeF certificate', {
      userId,
      subject: data.subject,
      serialNumber: data.serialNumber,
    });

    // Validate that certificate has not expired
    if (data.validUntil < new Date()) {
      throw new KSeFCertificateError('Certificate has expired');
    }

    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await this.prisma.kSeFCertificate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const cert = await this.prisma.kSeFCertificate.create({
      data: {
        userId,
        certificateData: data.certificateData,
        password: data.password,
        subject: data.subject,
        issuer: data.issuer,
        serialNumber: data.serialNumber,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        isDefault: data.isDefault || false,
      },
    });

    logger.info('KSeF certificate uploaded', { userId, certId: cert.id });
    return cert;
  }

  // ============================================
  // LIST
  // ============================================

  /**
   * Get all active certificates for a user.
   * Returns metadata only (not the certificate data itself).
   */
  async getCertificates(userId: string) {
    return this.prisma.kSeFCertificate.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        subject: true,
        issuer: true,
        serialNumber: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
      },
    });
  }

  // ============================================
  // GET DEFAULT
  // ============================================

  /**
   * Get the default, active, non-expired certificate for a user.
   * Returns full certificate data (including encrypted content) for signing operations.
   */
  async getDefaultCertificate(userId: string) {
    return this.prisma.kSeFCertificate.findFirst({
      where: {
        userId,
        isActive: true,
        isDefault: true,
        validUntil: { gt: new Date() },
      },
    });
  }

  // ============================================
  // DELETE (SOFT)
  // ============================================

  /**
   * Soft-delete a certificate by marking it as inactive.
   * Verifies that the certificate belongs to the requesting user.
   */
  async deleteCertificate(userId: string, certId: string) {
    const cert = await this.prisma.kSeFCertificate.findFirst({
      where: { id: certId, userId },
    });

    if (!cert) {
      throw new KSeFCertificateError('Certificate not found');
    }

    await this.prisma.kSeFCertificate.update({
      where: { id: certId },
      data: { isActive: false },
    });

    logger.info('KSeF certificate deactivated', { userId, certId });
  }

  // ============================================
  // SET DEFAULT
  // ============================================

  /**
   * Set a specific certificate as the default for a user.
   * Unsets any other default certificate in a transaction.
   */
  async setDefault(userId: string, certId: string) {
    const cert = await this.prisma.kSeFCertificate.findFirst({
      where: { id: certId, userId, isActive: true },
    });

    if (!cert) {
      throw new KSeFCertificateError('Certificate not found');
    }

    await this.prisma.$transaction([
      this.prisma.kSeFCertificate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.kSeFCertificate.update({
        where: { id: certId },
        data: { isDefault: true },
      }),
    ]);

    logger.info('KSeF default certificate set', { userId, certId });
  }
}
