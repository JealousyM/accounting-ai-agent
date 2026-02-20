/**
 * KSeF Auto-Send Service Singleton Instance
 */

import { KSeFAutoSendService } from './auto-send.service';
import { prisma } from '../../lib/prisma';
import { ksefService } from './ksef.instance';

export const ksefAutoSendService = new KSeFAutoSendService(prisma, ksefService);
