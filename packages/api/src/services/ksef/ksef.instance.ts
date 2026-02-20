/**
 * KSeF Service Singleton Instance
 *
 * Wires the WFirmaKSeFAdapter with the shared Prisma client and
 * the global WFirmaIntegrationService singleton.
 */

import { KSeFService } from './ksef.service';
import { WFirmaKSeFAdapter } from './adapters/wfirma-adapter';
import { DirectKSeFAdapter } from './adapters/direct-adapter';
import { KSeFCertificateService } from './certificate.service';
import { prisma } from '../../lib/prisma';
import { wfirmaIntegrationService } from '../wfirma-integration.instance';

const wfirmaAdapter = new WFirmaKSeFAdapter(prisma, wfirmaIntegrationService);
const certificateService = new KSeFCertificateService(prisma);
const directAdapter = new DirectKSeFAdapter(prisma, wfirmaIntegrationService, certificateService);

export const ksefService = new KSeFService(prisma, wfirmaAdapter, directAdapter);
