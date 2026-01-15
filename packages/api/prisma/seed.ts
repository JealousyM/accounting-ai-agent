import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

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

  console.log('✅ Created user:', user.email);

  // Create test customer
  const customer = await prisma.wFirmaCustomer.create({
    data: {
      userId: user.id,
      customerIdWFirma: 'wfirma-customer-1',
      name: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: '+48123456789',
      nip: '1234567890',
      address: {
        street: 'ul. Testowa 1',
        city: 'Warszawa',
        postalCode: '00-001',
        country: 'Poland',
      },
      totalRevenue: 50000,
      totalInvoices: 10,
    },
  });

  console.log('✅ Created customer:', customer.name);

  // Create test invoices
  const invoice1 = await prisma.wFirmaInvoice.create({
    data: {
      userId: user.id,
      customerId: customer.id,
      invoiceNumber: 'FV/2024/001',
      invoiceIdWFirma: 'wfirma-invoice-1',
      customerName: customer.name,
      customerEmail: customer.email,
      customerNip: customer.nip,
      amount: 10000,
      vat: 2300,
      total: 12300,
      issueDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      status: 'ISSUED',
      items: [
        {
          name: 'Usługa konsultingowa',
          quantity: 1,
          price: 10000,
          vat: 23,
        },
      ],
    },
  });

  console.log('✅ Created invoice:', invoice1.invoiceNumber);

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

  console.log('✅ Created conversation:', conversation.title);

  // Create AI recommendations
  const recommendation = await prisma.aIRecommendation.create({
    data: {
      userId: user.id,
      conversationId: conversation.id,
      category: 'TAX_OPTIMIZATION',
      title: 'Rozlicz koszty home office',
      description:
        'Na podstawie analizy Twoich faktur, możesz rozliczyć dodatkowe koszty związane z pracą zdalną, co może obniżyć podstawę opodatkowania o około 15%.',
      impactScore: 85.5,
      confidenceScore: 92.0,
      status: 'PENDING',
      metadata: {
        estimatedSavings: 5000,
        requiredDocuments: ['Umowa najmu', 'Rachunki za media'],
        deadline: '2024-03-31',
      },
    },
  });

  console.log('✅ Created recommendation:', recommendation.title);

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
