import { prisma } from '../lib/prisma';
import { credentialsService } from './credentials.instance';
import { SubscriptionService } from './subscription.service';

export const subscriptionService = new SubscriptionService(prisma, credentialsService);
