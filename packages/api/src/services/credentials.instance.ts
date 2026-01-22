import { prisma } from '../lib/prisma';
import { cryptoService } from './crypto.instance';
import { CredentialsService } from './credentials.service';

export const credentialsService = new CredentialsService(prisma, cryptoService);
