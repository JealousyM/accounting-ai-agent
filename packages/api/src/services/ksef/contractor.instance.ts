import { KSeFContractorService } from './contractor.service';
import { prisma } from '../../lib/prisma';
import { wfirmaServiceFactory } from '../wfirma-integration-factory.instance';

export const ksefContractorService = new KSeFContractorService(prisma, wfirmaServiceFactory);
