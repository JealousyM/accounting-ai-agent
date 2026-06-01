import { PrismaClient } from '@prisma/client';
import { helpTopics } from '../../src/data/help-topics.data';

const prisma = new PrismaClient();

async function seedHelpTopics() {
  console.log('Seeding help topics...');

  for (const topic of helpTopics) {
    await prisma.helpTopic.upsert({
      where: { slug: topic.slug },
      update: topic,
      create: topic,
    });
    console.log(`+ ${topic.slug}`);
  }

  console.log(`Seeded ${helpTopics.length} help topics successfully`);
}

seedHelpTopics()
  .catch((error) => {
    console.error('Error seeding help topics:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
