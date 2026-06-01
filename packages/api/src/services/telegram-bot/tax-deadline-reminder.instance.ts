/**
 * Tax Deadline Reminder Service - Singleton Instance
 */

import { TaxDeadlineReminderService } from './tax-deadline-reminder.service';
import { telegramBotService } from './telegram-bot.instance';

export const taxDeadlineReminderService = new TaxDeadlineReminderService(telegramBotService);
