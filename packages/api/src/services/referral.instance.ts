import { prisma } from '../lib/prisma';
import { getStripeClient } from '../config/stripe.config';
import { ReferralService } from './referral.service';

export const referralService = new ReferralService(prisma, getStripeClient());
