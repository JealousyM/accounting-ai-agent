/**
 * KSeF Status Poller Singleton Instance
 */

import { KSeFStatusPoller } from './status-poller.service';
import { prisma } from '../../lib/prisma';
import { ksefService } from './ksef.instance';

const pollIntervalMs = parseInt(process.env.KSEF_POLL_INTERVAL_MS || '60000', 10);

export const ksefStatusPoller = new KSeFStatusPoller(prisma, ksefService, pollIntervalMs);
