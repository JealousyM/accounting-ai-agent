/**
 * KSeF Contractor Service
 * Manages local contractor records for invoice autocomplete.
 * Sources: 'wfirma' (synced from wFirma API), 'company' (own company), 'local' (created in app)
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { WFirmaServiceFactory } from '../wfirma-integration.factory';

export interface KSeFContractorRecord {
  id: string;
  name: string;
  nip: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
  source: string;
  wfirmaId: string | null;
}

export interface CreateKSeFContractorInput {
  name: string;
  nip?: string;
  email?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
}

export class KSeFContractorService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly wfirmaServiceFactory: WFirmaServiceFactory,
  ) {}

  async listContractors(userId: string, search?: string): Promise<KSeFContractorRecord[]> {
    const where: any = { userId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search } },
      ];
    }
    // Return company first, then wfirma, then local — alphabetically within each group
    const rows = await this.prisma.kSeFContractor.findMany({
      where,
      orderBy: [{ source: 'asc' }, { name: 'asc' }],
    });
    // Re-order: company -> wfirma -> local
    const order = ['company', 'wfirma', 'local'];
    rows.sort((a, b) => {
      const oa = order.indexOf(a.source) >= 0 ? order.indexOf(a.source) : 99;
      const ob = order.indexOf(b.source) >= 0 ? order.indexOf(b.source) : 99;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }

  async createLocalContractor(userId: string, data: CreateKSeFContractorInput): Promise<KSeFContractorRecord> {
    return this.prisma.kSeFContractor.create({
      data: {
        userId,
        name: data.name,
        nip: data.nip ?? null,
        email: data.email ?? null,
        street: data.street ?? null,
        city: data.city ?? null,
        zip: data.zip ?? null,
        country: data.country ?? 'PL',
        source: 'local',
        wfirmaId: null,
      },
    });
  }

  async updateLocalContractor(userId: string, id: string, data: CreateKSeFContractorInput): Promise<KSeFContractorRecord> {
    const contractor = await this.prisma.kSeFContractor.findFirst({
      where: { id, userId },
    });
    if (!contractor) {
      const err = new Error('Contractor not found');
      (err as any).statusCode = 404;
      throw err;
    }
    if (contractor.source !== 'local') {
      const err = new Error('Cannot update wFirma or company contractors');
      (err as any).statusCode = 403;
      throw err;
    }
    return this.prisma.kSeFContractor.update({
      where: { id },
      data: {
        name: data.name,
        nip: data.nip ?? null,
        email: data.email ?? null,
        street: data.street ?? null,
        city: data.city ?? null,
        zip: data.zip ?? null,
        country: data.country ?? 'PL',
      },
    });
  }

  async deleteLocalContractor(userId: string, id: string): Promise<void> {
    const contractor = await this.prisma.kSeFContractor.findFirst({
      where: { id, userId },
    });
    if (!contractor) {
      const err = new Error('Contractor not found');
      (err as any).statusCode = 404;
      throw err;
    }
    if (contractor.source !== 'local') {
      const err = new Error('Cannot delete wFirma or company contractors');
      (err as any).statusCode = 403;
      throw err;
    }
    await this.prisma.kSeFContractor.delete({ where: { id } });
  }

  async syncFromWFirma(userId: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    const wfirmaService = await this.wfirmaServiceFactory.getServiceForUser(userId);

    const [contractorsResult, companyResult] = await Promise.allSettled([
      wfirmaService.getContractors(),
      wfirmaService.getCompanyData(),
    ]);

    // Sync contractors
    if (contractorsResult.status === 'fulfilled') {
      const contractors = contractorsResult.value;
      for (const c of contractors) {
        try {
          if (!c.id) continue;
          await this.prisma.kSeFContractor.upsert({
            where: { userId_wfirmaId: { userId, wfirmaId: String(c.id) } },
            create: {
              userId,
              name: c.name,
              nip: c.nip ?? null,
              email: c.email ?? null,
              street: c.address?.street ?? null,
              city: c.address?.city ?? null,
              zip: c.address?.zip ?? null,
              country: c.address?.country ?? 'PL',
              source: 'wfirma',
              wfirmaId: String(c.id),
            },
            update: {
              name: c.name,
              nip: c.nip ?? null,
              email: c.email ?? null,
              street: c.address?.street ?? null,
              city: c.address?.city ?? null,
              zip: c.address?.zip ?? null,
              country: c.address?.country ?? 'PL',
            },
          });
          synced++;
        } catch (err) {
          errors.push(`Contractor ${c.name}: ${(err as Error).message}`);
        }
      }
    } else {
      errors.push(`Contractors sync failed: ${(contractorsResult.reason as Error).message}`);
    }

    // Sync company as source='company'
    if (companyResult.status === 'fulfilled') {
      const company = companyResult.value;
      try {
        const companyWfirmaId = `company-${company.id}`;
        await this.prisma.kSeFContractor.upsert({
          where: { userId_wfirmaId: { userId, wfirmaId: companyWfirmaId } },
          create: {
            userId,
            name: company.name,
            nip: company.nip ?? null,
            street: company.address?.street ?? null,
            city: company.address?.city ?? null,
            zip: company.address?.zip ?? null,
            country: company.address?.country ?? 'PL',
            source: 'company',
            wfirmaId: companyWfirmaId,
          },
          update: {
            name: company.name,
            nip: company.nip ?? null,
            street: company.address?.street ?? null,
            city: company.address?.city ?? null,
            zip: company.address?.zip ?? null,
            country: company.address?.country ?? 'PL',
          },
        });
        synced++;
      } catch (err) {
        errors.push(`Company sync failed: ${(err as Error).message}`);
      }
    } else {
      errors.push(`Company sync failed: ${(companyResult.reason as Error).message}`);
    }

    logger.info('KSeF contractor sync completed', { userId, synced, errorCount: errors.length });
    return { synced, errors };
  }

  async getCompanyEntry(userId: string): Promise<KSeFContractorRecord | null> {
    return this.prisma.kSeFContractor.findFirst({
      where: { userId, source: 'company' },
    });
  }
}
