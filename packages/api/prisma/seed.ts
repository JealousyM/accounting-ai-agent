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
  const customer = await prisma.wFirmaCustomer.upsert({
    where: { customerIdWFirma: 'wfirma-customer-1' },
    update: {},
    create: {
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
  const invoice1 = await prisma.wFirmaInvoice.upsert({
    where: { invoiceIdWFirma: 'wfirma-invoice-1' },
    update: {},
    create: {
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

  // Create Uchwała templates
  const templateZarzadu = await prisma.uchwalaTemplate.upsert({
    where: { 
      type_locale_version: {
        type: 'ZARZADU',
        locale: 'pl',
        version: '1.0.0'
      }
    },
    update: {},
    create: {
      type: 'ZARZADU',
      locale: 'pl',
      name: 'Uchwała o wynagrodzeniu Zarządu',
      description: 'Standardowy szablon uchwały o wynagrodzeniu członków Zarządu',
      content: `
UCHWAŁA NR {{number}}
Rady Nadzorczej {{companyName}}
z dnia {{decisionDate}}

w sprawie wynagrodzenia Prezesa Zarządu

Na podstawie art. 392 § 1 Kodeksu spółek handlowych, Rada Nadzorcza {{companyName}} postanawia:

§ 1
Ustala się wynagrodzenie Prezesa Zarządu {{ceoName}} w wysokości {{baseSalary}} PLN brutto miesięcznie.

§ 2
Wynagrodzenie obejmuje:
- Wynagrodzenie zasadnicze: {{baseSalary}} PLN brutto
- Składki ZUS pracodawcy: {{zusEmployerAmount}} PLN
- Całkowity koszt dla spółki: {{totalCost}} PLN miesięcznie

§ 3
Wynagrodzenie będzie wypłacane do {{paymentDay}} dnia każdego miesiąca.

§ 4
Uchwała wchodzi w życie z dniem {{entryDate}}.

Podpisy:
_______________________
Przewodniczący Rady Nadzorczej
      `,
      requiredFields: ['number', 'companyName', 'decisionDate', 'ceoName', 'baseSalary', 'zusEmployerAmount', 'totalCost', 'paymentDay', 'entryDate'],
      version: '1.0.0',
      isActive: true,
    },
  });

  console.log('✅ Created template:', templateZarzadu.name);

  const templateDywidenda = await prisma.uchwalaTemplate.upsert({
    where: {
      type_locale_version: {
        type: 'DYWIDENDA',
        locale: 'pl',
        version: '1.0.0'
      }
    },
    update: {},
    create: {
      type: 'DYWIDENDA',
      locale: 'pl',
      name: 'Uchwała o wypłacie dywidendy',
      description: 'Standardowy szablon uchwały o wypłacie dywidendy',
      content: `
UCHWAŁA NR {{number}}
Zwyczajnego Zgromadzenia Wspólników {{companyName}}
z dnia {{decisionDate}}

w sprawie podziału zysku za rok {{year}}

Na podstawie art. 231 § 2 pkt 2 Kodeksu spółek handlowych, Zgromadzenie Wspólników {{companyName}} postanawia:

§ 1
Zysk netto za rok {{year}} w wysokości {{grossProfit}} PLN podzielić w następujący sposób:
- {{dividendPercentage}}% na dywidendę dla wspólników: {{dividendAmount}} PLN
- pozostała część na kapitał zapasowy

§ 2
Dywidenda będzie wypłacona wspólnikom proporcjonalnie do posiadanych udziałów, po potrąceniu 19% podatku u źródła.

§ 3
Dzień dywidendy ustala się na {{dividendDate}}.

§ 4
Uchwała wchodzi w życie z dniem podjęcia.

Podpisy Wspólników:
_______________________
      `,
      requiredFields: ['number', 'companyName', 'decisionDate', 'year', 'grossProfit', 'dividendPercentage', 'dividendAmount', 'dividendDate'],
      version: '1.0.0',
      isActive: true,
    },
  });

  console.log('✅ Created template:', templateDywidenda.name);

  // Create test Uchwała
  const uchwala = await prisma.uchwala.upsert({
    where: { number: 'UCH/2024/001' },
    update: {},
    create: {
      userId: user.id,
      type: 'ZARZADU',
      number: 'UCH/2024/001',
      title: 'Uchwała o wynagrodzeniu Prezesa Zarządu - Jan Kowalski',
      status: 'DRAFT',
      wfirmaCompanyId: 'test-company-id',
      data: {
        companyName: 'Test Sp. z o.o.',
        companyNip: '1234567890',
        ceoName: 'Jan Kowalski',
        baseSalary: 10000,
        bonusPercent: 20,
        bonusThreshold: 100000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        decisionDate: '2024-01-15',
        entryDate: '2024-02-01',
        paymentDay: 10,
      },
      taxCalculation: {
        gross: 10000,
        pitRate: 0.12,
        pitAmount: 1200,
        zusEmployeeRate: 0.1952,
        zusEmployeeAmount: 1952,
        zusEmployerRate: 0.1952,
        zusEmployerAmount: 1952,
        net: 6848,
        totalCost: 11952,
        annualCost: 143424,
      },
      version: 1,
    },
  });

  console.log('✅ Created uchwała:', uchwala.number);

  // Create test Payment
  const payment = await prisma.payment.create({
    data: {
      uchwalaId: uchwala.id,
      recipientName: 'Jan Kowalski',
      recipientAccount: 'PL61109010140000071219812874',
      recipientNip: '9876543210',
      amountGross: 10000,
      amountNet: 6848,
      taxAmount: 1200,
      zusAmount: 1952,
      status: 'PENDING',
      scheduledDate: new Date('2024-02-10'),
    },
  });

  console.log('✅ Created payment:', payment.id);

  // Create test Audit Log
  const auditLog = await prisma.auditLog.create({
    data: {
      uchwalaId: uchwala.id,
      userId: user.id,
      action: 'CREATE',
      entityType: 'Uchwala',
      entityId: uchwala.id,
      newData: {
        type: uchwala.type,
        number: uchwala.number,
        status: uchwala.status,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test Seed Script)',
    },
  });

  console.log('✅ Created audit log:', auditLog.id);

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
