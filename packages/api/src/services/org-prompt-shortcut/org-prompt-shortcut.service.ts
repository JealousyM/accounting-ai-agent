import { PrismaClient, OrgPromptShortcut } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface OrgShortcutItem {
  id: string;
  label: string;
  prompt: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ORG_SHORTCUT_LIMIT = 20;

export class OrgPromptShortcutService {
  constructor(private readonly prisma: PrismaClient) {}

  async getShortcuts(organizationId: string): Promise<OrgShortcutItem[]> {
    const rows = await this.prisma.orgPromptShortcut.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(this.toItem);
  }

  async createShortcut(
    organizationId: string,
    userId: string,
    input: { label: string; prompt: string }
  ): Promise<OrgShortcutItem> {
    await this.requireAdmin(userId, organizationId);

    const count = await this.prisma.orgPromptShortcut.count({ where: { organizationId } });
    if (count >= ORG_SHORTCUT_LIMIT) {
      const err = new Error('ORG_SHORTCUT_LIMIT_REACHED');
      (err as any).limit = ORG_SHORTCUT_LIMIT;
      throw err;
    }

    const maxOrder = await this.prisma.orgPromptShortcut.aggregate({
      where: { organizationId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const row = await this.prisma.orgPromptShortcut.create({
      data: {
        organizationId,
        createdBy: userId,
        label: input.label,
        prompt: input.prompt,
        sortOrder: nextOrder,
      },
    });

    logger.debug('Org shortcut created', { organizationId, userId, id: row.id });
    return this.toItem(row);
  }

  async updateShortcut(
    organizationId: string,
    userId: string,
    id: string,
    input: { label?: string; prompt?: string; sortOrder?: number }
  ): Promise<OrgShortcutItem> {
    await this.requireAdmin(userId, organizationId);

    const existing = await this.prisma.orgPromptShortcut.findFirst({ where: { id, organizationId } });
    if (!existing) throw new Error('Shortcut not found');

    const row = await this.prisma.orgPromptShortcut.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.prompt !== undefined && { prompt: input.prompt }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });
    return this.toItem(row);
  }

  async deleteShortcut(organizationId: string, userId: string, id: string): Promise<void> {
    await this.requireAdmin(userId, organizationId);

    const existing = await this.prisma.orgPromptShortcut.findFirst({ where: { id, organizationId } });
    if (!existing) throw new Error('Shortcut not found');

    await this.prisma.orgPromptShortcut.delete({ where: { id } });
    logger.debug('Org shortcut deleted', { organizationId, userId, id });
  }

  private async requireAdmin(userId: string, organizationId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, orgRole: true, orgMembershipStatus: true },
    });
    if (
      !user ||
      user.organizationId !== organizationId ||
      user.orgRole !== 'admin' ||
      user.orgMembershipStatus !== 'active'
    ) {
      throw new Error('NOT_ORG_ADMIN');
    }
  }

  private toItem(row: OrgPromptShortcut): OrgShortcutItem {
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
