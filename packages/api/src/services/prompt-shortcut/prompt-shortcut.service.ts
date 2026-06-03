import { PrismaClient, UserPromptShortcut } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface CreateShortcutInput {
  label: string;
  prompt: string;
}

export interface UpdateShortcutInput {
  label?: string;
  prompt?: string;
  sortOrder?: number;
}

export interface ShortcutItem {
  id: string;
  label: string;
  prompt: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const FREE_PLAN_LIMIT = 20;

export class PromptShortcutService {
  constructor(private readonly prisma: PrismaClient) {}

  async getShortcuts(userId: string): Promise<ShortcutItem[]> {
    const rows = await this.prisma.userPromptShortcut.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(this.toItem);
  }

  async createShortcut(userId: string, input: CreateShortcutInput): Promise<ShortcutItem> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true },
    });

    if (user?.subscriptionPlan === 'free') {
      const count = await this.prisma.userPromptShortcut.count({ where: { userId } });
      if (count >= FREE_PLAN_LIMIT) {
        const err = new Error('SHORTCUT_LIMIT_REACHED');
        (err as any).limit = FREE_PLAN_LIMIT;
        throw err;
      }
    }

    const maxOrder = await this.prisma.userPromptShortcut.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const row = await this.prisma.userPromptShortcut.create({
      data: { userId, label: input.label, prompt: input.prompt, sortOrder: nextOrder },
    });

    logger.debug('Shortcut created', { userId, id: row.id });
    return this.toItem(row);
  }

  async updateShortcut(userId: string, id: string, input: UpdateShortcutInput): Promise<ShortcutItem> {
    const existing = await this.prisma.userPromptShortcut.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Shortcut not found');

    const row = await this.prisma.userPromptShortcut.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.prompt !== undefined && { prompt: input.prompt }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });
    return this.toItem(row);
  }

  async deleteShortcut(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.userPromptShortcut.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Shortcut not found');

    await this.prisma.userPromptShortcut.delete({ where: { id } });
    logger.debug('Shortcut deleted', { userId, id });
  }

  async reorderShortcuts(userId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.userPromptShortcut.updateMany({
          where: { id, userId },
          data: { sortOrder: index },
        })
      )
    );
  }

  private toItem(row: UserPromptShortcut): ShortcutItem {
    return {
      id: row.id,
      label: row.label,
      prompt: row.prompt,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
