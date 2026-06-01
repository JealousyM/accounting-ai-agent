import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { helpTopics } from '../src/data/help-topics.data';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash,
      firstName: 'Jan',
      lastName: 'Kowalski',
      referralCode: 'a1b2c3d4',
      wfirmaConfig: {
        apiKey: 'test-api-key',
        companyId: 'test-company-id',
      },
    },
  });

  console.log('Created user:', user.email);

  // Create AI conversation
  const conversation = await prisma.aIConversation.create({
    data: {
      userId: user.id,
      title: 'Optymalizacja podatkowa Q1 2024',
      topic: 'tax_optimization',
      messages: [
        {
          role: 'user',
          content: 'Jak mogę zoptymalizować podatki w Q1?',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: 'Przeanalizuję Twoje faktury i zaproponuję rozwiązania...',
          timestamp: new Date().toISOString(),
        },
      ],
      graphState: {
        currentNode: 'analysis',
        completedSteps: ['data_collection'],
      },
    },
  });

  console.log('Created conversation:', conversation.title);

  // Seed help topics
  console.log('Seeding help topics...');
  for (const topic of helpTopics) {
    await prisma.helpTopic.upsert({
      where: { slug: topic.slug },
      update: topic,
      create: topic,
    });
  }

  console.log(`Seeded ${helpTopics.length} help topics`);

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
