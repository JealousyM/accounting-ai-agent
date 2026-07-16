import { PrismaClient } from '@prisma/client';
import { EDoreczeniaConfigService } from './config.service';
import { EDoreczeniaCertificateService } from './certificate.service';
import { EDoreczeniaDeadlineService } from './deadline.service';

export type LetterFilter = 'all' | 'needs_action' | 'done';

export interface EDoreczeniaServiceDeps {
  prisma: PrismaClient;
  configService: EDoreczeniaConfigService;
  certService: EDoreczeniaCertificateService;
  deadlineService: EDoreczeniaDeadlineService;
}

export class EDoreczeniaService {
  constructor(private readonly deps: EDoreczeniaServiceDeps) {}

  getLetters(userId: string, filter: LetterFilter = 'all') {
    const where: Record<string, unknown> = { userId };
    if (filter === 'needs_action') where.status = 'needs_action';
    else if (filter === 'done') where.status = 'done';
    return this.deps.prisma.eDoreczeniaLetter.findMany({
      where, orderBy: { receivedAt: 'desc' }, include: { deadlines: true },
    });
  }

  getLetterById(userId: string, letterId: string) {
    return this.deps.prisma.eDoreczeniaLetter.findFirst({ where: { id: letterId, userId }, include: { deadlines: true } });
  }

  async markLetterDone(userId: string, letterId: string): Promise<void> {
    await this.deps.prisma.eDoreczeniaLetter.updateMany({ where: { id: letterId, userId }, data: { status: 'done' } });
  }

  getActiveDeadlines(userId: string) {
    return this.deps.prisma.eDoreczeniaDeadline.findMany({
      where: { userId, status: 'active' }, orderBy: { dueDate: 'asc' }, include: { letter: { select: { senderName: true, subject: true } } },
    });
  }

  async beginOnboarding(userId: string, commonName: string): Promise<{ csrPem: string }> {
    const { privateKeyPem, csrPem } = this.deps.certService.generateKeyPairAndCsr({ commonName });
    await this.deps.configService.storePrivateKeyAndAddress(userId, commonName, privateKeyPem);
    return { csrPem };
  }

  async completeOnboarding(userId: string, certPem: string): Promise<void> {
    await this.deps.configService.storeCertificate(userId, certPem);
  }
}
