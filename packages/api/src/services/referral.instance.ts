import { prisma } from '../lib/prisma';
import { ReferralService } from './referral.service';

export const referralService = new ReferralService(prisma);
