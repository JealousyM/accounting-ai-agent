import { prisma } from '../../lib/prisma';
import { cryptoService } from '../crypto.instance';
import { telegramBotService } from '../telegram-bot/telegram-bot.instance';
import { EDoreczeniaCertificateService } from './certificate.service';
import { EDoreczeniaConfigService, ActiveConfig } from './config.service';
import { EDoreczeniaDeadlineService } from './deadline.service';
import { LetterAnalysisService, LetterAnalysisSchema } from './letter-analysis.service';
import { MailboxPollerService } from './mailbox-poller.service';
import { EDoreczeniaReminderService } from './edoreczenia-reminder.service';
import { EDoreczeniaService } from './edoreczenia.service';
import { UAApiClient } from './ua-api-client';

const certService = new EDoreczeniaCertificateService();
const configService = new EDoreczeniaConfigService(prisma, cryptoService, certService);
const deadlineService = new EDoreczeniaDeadlineService(prisma);

// Structured-output model factory. Reuses the runner's public static
// `LangGraphAgentRunner.createModel` + the user's stored LLM credentials.
// Both dependencies are pulled in with a DYNAMIC import (resolved at call
// time, not module load) to break the load-time cycle
// runner → edoreczenia.instance → telegram-bot.instance → ai-chat.instance → runner.
const analysisService = new LetterAnalysisService(async (userId: string) => {
  const { credentialsService } = await import('../credentials.instance');
  const { LangGraphAgentRunner } = await import('../ai-chat/langgraph-agent-runner');
  const creds = await credentialsService.getLLMCredentials(userId);
  if (!creds?.apiKey) throw new Error('No LLM API key configured');
  const model = LangGraphAgentRunner.createModel(creds.provider, creds.apiKey, creds.model);
  return (model as unknown as { withStructuredOutput: (s: unknown) => { invoke: (m: unknown) => Promise<never> } })
    .withStructuredOutput(LetterAnalysisSchema);
});

export const edoreczeniaReminderService = new EDoreczeniaReminderService(telegramBotService);

const UA_BASE_URL = process.env.EDORECZENIA_UA_BASE_URL ?? 'https://int-ua.edoreczenia.gov.pl';

export const mailboxPoller = new MailboxPollerService({
  prisma,
  configService,
  clientFactory: (cfg: ActiveConfig) => new UAApiClient({ baseUrl: UA_BASE_URL, certPem: cfg.certPem, privateKeyPem: cfg.privateKeyPem }),
  analysisService,
  deadlineService,
  onNewLetter: (userId, letterId) => edoreczeniaReminderService.alertNewLetter(userId, letterId),
});

export const edoreczeniaService = new EDoreczeniaService({ prisma, configService, certService, deadlineService });
