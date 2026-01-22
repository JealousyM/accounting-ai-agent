import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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
