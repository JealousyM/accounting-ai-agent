import { prisma } from '../../lib/prisma';
import { PromptShortcutService } from './prompt-shortcut.service';

export const promptShortcutService = new PromptShortcutService(prisma);
