import { PrismaClient } from '@prisma/client';
import { CryptoService } from '../crypto.service';
import { EDoreczeniaCertificateService } from './certificate.service';
import { logger } from '../../utils/logger';

export interface ActiveConfig {
  id: string;
  userId: string;
  adeAddress: string | null;
  certPem: string;
  privateKeyPem: string;
  environment: string;
  autoReceive: boolean;
}

export class EDoreczeniaConfigService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly crypto: CryptoService,
    private readonly certService: EDoreczeniaCertificateService,
  ) {}

  /** All active configs with decrypted credentials, for the poller. */
  async getActiveConfigs(): Promise<ActiveConfig[]> {
    const rows = await this.prisma.eDoreczeniaConfig.findMany({ where: { status: 'active' } });
    const out: ActiveConfig[] = [];
    for (const r of rows) {
      if (!r.certificateEnc || !r.privateKeyEnc) continue;
      try {
        out.push({
          id: r.id,
          userId: r.userId,
          adeAddress: r.adeAddress,
          environment: r.environment,
          autoReceive: r.autoReceive,
          certPem: this.crypto.decryptFromString(r.certificateEnc),
          privateKeyPem: this.crypto.decryptFromString(r.privateKeyEnc),
        });
      } catch (e) {
        logger.error('[EDoreczenia] Failed to decrypt config credentials', {
          userId: CryptoService.mask(r.userId), error: (e as Error).message,
        });
      }
    }
    return out;
  }

  /** Store the certificate the user uploaded, derive expiry, activate the config. */
  async storeCertificate(userId: string, certPem: string): Promise<void> {
    const certExpiresAt = this.certService.parseCertificateExpiry(certPem);
    await this.prisma.eDoreczeniaConfig.update({
      where: { userId },
      data: { certificateEnc: this.crypto.encryptToString(certPem), certExpiresAt, status: 'active' },
    });
  }

  async getDecryptedCredentials(userId: string): Promise<{ certPem: string; privateKeyPem: string } | null> {
    const r = await this.prisma.eDoreczeniaConfig.findUnique({ where: { userId } });
    if (!r?.certificateEnc || !r?.privateKeyEnc) return null;
    return {
      certPem: this.crypto.decryptFromString(r.certificateEnc),
      privateKeyPem: this.crypto.decryptFromString(r.privateKeyEnc),
    };
  }

  /** Persist the freshly-generated private key + ADE address, awaiting the cert upload. */
  async storePrivateKeyAndAddress(userId: string, adeAddress: string, privateKeyPem: string): Promise<void> {
    await this.prisma.eDoreczeniaConfig.upsert({
      where: { userId },
      create: { userId, adeAddress, privateKeyEnc: this.crypto.encryptToString(privateKeyPem), status: 'pending_cert' },
      update: { adeAddress, privateKeyEnc: this.crypto.encryptToString(privateKeyPem), status: 'pending_cert' },
    });
  }
}
