import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { helpTopics } from '../data/help-topics.data';

export async function seedHelpTopicsIfEmpty(): Promise<void> {
  try {
    const existingCount = await prisma.helpTopic.count();

    logger.info(`Syncing help topics (existing: ${existingCount}, defined: ${helpTopics.length})...`);

    let created = 0;
    let updated = 0;

    for (const topic of helpTopics) {
      const existing = await prisma.helpTopic.findUnique({
        where: { slug: topic.slug },
      });

      await prisma.helpTopic.upsert({
        where: { slug: topic.slug },
        update: topic,
        create: topic,
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    if (created > 0 || updated > 0) {
      logger.info(`Help topics synced: ${created} created, ${updated} updated`);
    } else {
      logger.info('Help topics already up to date');
    }
  } catch (error) {
    logger.error('Failed to seed help topics:', error);
  }
}
