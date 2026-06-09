import { prisma } from '../../lib/prisma';
import { OrgPromptShortcutService } from './org-prompt-shortcut.service';

export const orgPromptShortcutService = new OrgPromptShortcutService(prisma);
