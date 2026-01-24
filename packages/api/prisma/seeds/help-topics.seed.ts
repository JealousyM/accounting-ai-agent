/**
 * Help Topics Seed Script
 * Seeds the database with multilingual help topics
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const helpTopics = [
  // ========================================
  // Getting Started Category
  // ========================================
  {
    slug: 'getting-started-welcome',
    category: 'gettingStarted',
    titlePl: 'Witamy w Accounting AI Agent',
    titleEn: 'Welcome to Accounting AI Agent',
    titleRu: 'Добро пожаловать в Accounting AI Agent',
    contentPl: `Accounting AI Agent to inteligentny asystent księgowy, który pomaga w zarządzaniu finansami i podatkami dla firm IT w Polsce.

**Co możesz zrobić:**
- Zadawać pytania o podatki (VAT, PIT, CIT, ZUS)
- Zarządzać fakturami i kontrahentami przez wFirma
- Otrzymywać personalizowane porady podatkowe
- Automatyzować obliczenia księgowe

**Jak zacząć:**
1. Połącz swoje konto wFirma w Ustawieniach
2. Zadaj pierwsze pytanie w czacie AI
3. Eksploruj dostępne funkcje i możliwości`,
    contentEn: `Accounting AI Agent is an intelligent accounting assistant that helps with financial and tax management for IT companies in Poland.

**What you can do:**
- Ask questions about taxes (VAT, PIT, CIT, ZUS)
- Manage invoices and contractors through wFirma
- Get personalized tax advice
- Automate accounting calculations

**Getting started:**
1. Connect your wFirma account in Settings
2. Ask your first question in AI chat
3. Explore available features and capabilities`,
    contentRu: `Accounting AI Agent - это интеллектуальный бухгалтерский ассистент, который помогает в управлении финансами и налогами для IT-компаний в Польше.

**Что вы можете делать:**
- Задавать вопросы о налогах (VAT, PIT, CIT, ZUS)
- Управлять счетами и контрагентами через wFirma
- Получать персонализированные налоговые советы
- Автоматизировать бухгалтерские расчеты

**Начало работы:**
1. Подключите аккаунт wFirma в Настройках
2. Задайте первый вопрос в AI чате
3. Изучите доступные функции и возможности`,
    searchKeywordsPl: ['start', 'wprowadzenie', 'początek', 'pierwsze kroki', 'witaj'],
    searchKeywordsEn: ['start', 'introduction', 'beginning', 'first steps', 'welcome'],
    searchKeywordsRu: ['старт', 'введение', 'начало', 'первые шаги', 'приветствие'],
    order: 1,
    isFeatured: true,
  },

  // ========================================
  // AI Chat Category
  // ========================================
  {
    slug: 'ai-chat-how-to-use',
    category: 'aiChat',
    titlePl: 'Jak korzystać z czatu AI',
    titleEn: 'How to use AI Chat',
    titleRu: 'Как использовать AI чат',
    contentPl: `Czat AI rozumie pytania w języku naturalnym po polsku, angielsku i rosyjsku.

**Przykłady pytań:**
- "Ile wynosi VAT od 1000 PLN?"
- "Pokaż faktury z grudnia 2025"
- "Jakie są terminy płatności ZUS?"
- "Dodaj nowego kontrahenta ABC Sp. z o.o."

**Wskazówki:**
- Zadawaj konkretne pytania
- Możesz łączyć pytania (np. "pokaż faktury i oblicz VAT")
- AI automatycznie wykrywa twój język
- Możesz prosić o szczegóły lub wyjaśnienia
- AI ma dostęp do twoich danych z wFirma (faktury, kontrahenci, płatności)`,
    contentEn: `AI Chat understands natural language questions in Polish, English, and Russian.

**Example questions:**
- "How much is VAT on 1000 PLN?"
- "Show invoices from December 2025"
- "What are ZUS payment deadlines?"
- "Add new contractor ABC Sp. z o.o."

**Tips:**
- Ask specific questions
- You can combine questions (e.g. "show invoices and calculate VAT")
- AI automatically detects your language
- You can ask for details or explanations
- AI has access to your wFirma data (invoices, contractors, payments)`,
    contentRu: `AI чат понимает вопросы на естественном языке на польском, английском и русском.

**Примеры вопросов:**
- "Сколько составляет НДС от 1000 PLN?"
- "Покажи счета за декабрь 2025"
- "Какие сроки оплаты ZUS?"
- "Добавь нового контрагента ABC Sp. z o.o."

**Советы:**
- Задавайте конкретные вопросы
- Можно комбинировать вопросы (напр. "покажи счета и рассчитай НДС")
- AI автоматически определяет ваш язык
- Можете просить детали или объяснения
- AI имеет доступ к вашим данным wFirma (счета, контрагенты, платежи)`,
    searchKeywordsPl: ['czat', 'pytania', 'jak używać', 'przykłady', 'ai', 'asystent'],
    searchKeywordsEn: ['chat', 'questions', 'how to use', 'examples', 'ai', 'assistant'],
    searchKeywordsRu: ['чат', 'вопросы', 'как использовать', 'примеры', 'ai', 'ассистент'],
    order: 1,
    isFeatured: true,
  },

  // ========================================
  // FAQ Category
  // ========================================
  {
    slug: 'faq-wfirma-connection',
    category: 'faq',
    titlePl: 'Jak połączyć konto wFirma?',
    titleEn: 'How to connect wFirma account?',
    titleRu: 'Как подключить аккаунт wFirma?',
    contentPl: `Aby połączyć konto wFirma:

1. Przejdź do **Ustawień** → **Integracje** (kliknij ikonę użytkownika w prawym górnym rogu)
2. Znajdź sekcję "wFirma Integration"
3. Wpisz swoje dane dostępowe:
   - Access Key (klucz dostępu)
   - Secret Key (klucz tajny)
   - Company ID (ID firmy)
4. Kliknij "Zapisz"

**Gdzie znaleźć dane dostępowe wFirma:**
- Zaloguj się do wFirma.pl
- Przejdź do Ustawienia → API
- Wygeneruj nowe klucze dostępu jeśli jeszcze ich nie masz

Po połączeniu AI będzie miał dostęp do:
- Faktur i ich statusów
- Kontrahentów i ich danych
- Płatności i rozliczeń
- Dokumentów księgowych`,
    contentEn: `To connect your wFirma account:

1. Go to **Settings** → **Integrations** (click user icon in top right corner)
2. Find the "wFirma Integration" section
3. Enter your credentials:
   - Access Key
   - Secret Key
   - Company ID
4. Click "Save"

**Where to find wFirma credentials:**
- Log in to wFirma.pl
- Go to Settings → API
- Generate new access keys if you don't have them yet

After connecting, AI will have access to:
- Invoices and their statuses
- Contractors and their data
- Payments and settlements
- Accounting documents`,
    contentRu: `Чтобы подключить аккаунт wFirma:

1. Перейдите в **Настройки** → **Интеграции** (кликните на иконку пользователя в правом верхнем углу)
2. Найдите секцию "wFirma Integration"
3. Введите данные:
   - Access Key (ключ доступа)
   - Secret Key (секретный ключ)
   - Company ID (ID компании)
4. Нажмите "Сохранить"

**Где найти данные wFirma:**
- Войдите на wFirma.pl
- Перейдите в Настройки → API
- Сгенерируйте новые ключи доступа если их еще нет

После подключения AI получит доступ к:
- Счетам и их статусам
- Контрагентам и их данным
- Платежам и расчетам
- Бухгалтерским документам`,
    searchKeywordsPl: ['wfirma', 'połączenie', 'integracja', 'konfiguracja', 'api', 'klucze'],
    searchKeywordsEn: ['wfirma', 'connection', 'integration', 'setup', 'api', 'keys'],
    searchKeywordsRu: ['wfirma', 'подключение', 'интеграция', 'настройка', 'api', 'ключи'],
    order: 1,
    isFeatured: true,
  },

  // ========================================
  // wFirma Category - QUERY EXAMPLES (IMPORTANT!)
  // ========================================
  {
    slug: 'wfirma-query-examples',
    category: 'wfirma',
    titlePl: 'Przykładowe pytania o dane wFirma',
    titleEn: 'Example wFirma Data Queries',
    titleRu: 'Примеры запросов к данным wFirma',
    contentPl: `Możesz zadawać AI pytania o swoje dane z wFirma w naturalnym języku. Oto przykłady:

## Faktury (Invoices)

**Wyświetlanie faktur:**
- "Pokaż wszystkie faktury z grudnia 2025"
- "Pokaż faktury wystawione w tym miesiącu"
- "Jakie faktury są nieopłacone?"
- "Pokaż fakturę numer FV/2025/12/001"
- "Ile faktur wystawiłem w tym roku?"

**Filtrowanie faktur:**
- "Pokaż faktury dla kontrahenta ABC Sp. z o.o."
- "Pokaż faktury powyżej 10 000 PLN"
- "Które faktury są przeterminowane?"
- "Pokaż faktury ze statusem 'zapłacona'"

**Analiza faktur:**
- "Jaka jest suma wszystkich faktur z grudnia?"
- "Oblicz VAT z faktur z tego miesiąca"
- "Która faktura ma najwyższą wartość?"
- "Ile wynosi średnia wartość faktury?"

## Kontrahenci (Contractors)

**Wyszukiwanie kontrahentów:**
- "Pokaż wszystkich kontrahentów"
- "Znajdź kontrahenta o nazwie XYZ"
- "Pokaż kontrahenta z NIP 1234567890"
- "Ile kontrahentów mam w bazie?"

**Informacje o kontrahencie:**
- "Pokaż szczegóły kontrahenta ABC"
- "Jakie faktury wystawiłem dla kontrahenta XYZ?"
- "Jakie są dane kontaktowe kontrahenta ABC?"

**Operacje na kontrahentach:**
- "Dodaj nowego kontrahenta: nazwa 'Test Sp. z o.o.', NIP 1234567890"
- "Zaktualizuj email kontrahenta ABC na nowy@email.com"

## Płatności (Payments)

**Statusy płatności:**
- "Które faktury czekają na płatność?"
- "Pokaż opłacone faktury z ostatniego miesiąca"
- "Jakie płatności otrzymałem w tym tygodniu?"

**Kwoty i terminy:**
- "Ile pieniędzy oczekuję na wpływy?"
- "Które faktury są po terminie płatności?"
- "Kiedy przypada termin płatności faktury FV/2025/12/001?"

## Wydatki (Expenses)

- "Pokaż wszystkie wydatki z grudnia"
- "Jakie wydatki poniosłem w kategorii 'Oprogramowanie'?"
- "Jaka jest suma wydatków w tym roku?"
- "Dodaj nowy wydatek: opis 'Hosting', kwota 100 PLN, data 2025-12-15"

## Informacje o firmie (Company Info)

- "Jakie są dane mojej firmy?"
- "Jaki mam NIP?"
- "Pokaż mój adres firmy"
- "Jakie mam ustawienia wFirma?"

## Wskazówki:
- Używaj języka naturalnego - AI zrozumie Twoje pytanie
- Możesz łączyć pytania: "Pokaż faktury z grudnia i oblicz VAT"
- Możesz prosić o szczegóły: "Wyjaśnij co to znaczy", "Pokaż więcej informacji"
- AI automatycznie wykrywa Twój język (polski, angielski, rosyjski)
- Jeśli nie jesteś pewien jak zadać pytanie, po prostu spróbuj - AI jest bardzo elastyczny!`,

    contentEn: `You can ask AI questions about your wFirma data in natural language. Here are examples:

## Invoices

**Displaying invoices:**
- "Show all invoices from December 2025"
- "Show invoices issued this month"
- "Which invoices are unpaid?"
- "Show invoice number FV/2025/12/001"
- "How many invoices did I issue this year?"

**Filtering invoices:**
- "Show invoices for contractor ABC Ltd."
- "Show invoices above 10,000 PLN"
- "Which invoices are overdue?"
- "Show invoices with status 'paid'"

**Invoice analysis:**
- "What's the total of all invoices from December?"
- "Calculate VAT from this month's invoices"
- "Which invoice has the highest value?"
- "What's the average invoice value?"

## Contractors

**Searching contractors:**
- "Show all contractors"
- "Find contractor named XYZ"
- "Show contractor with NIP 1234567890"
- "How many contractors do I have?"

**Contractor information:**
- "Show details for contractor ABC"
- "What invoices did I issue for contractor XYZ?"
- "What are the contact details for contractor ABC?"

**Contractor operations:**
- "Add new contractor: name 'Test Ltd.', NIP 1234567890"
- "Update contractor ABC email to new@email.com"

## Payments

**Payment statuses:**
- "Which invoices are awaiting payment?"
- "Show paid invoices from last month"
- "What payments did I receive this week?"

**Amounts and deadlines:**
- "How much money am I expecting in receivables?"
- "Which invoices are past due?"
- "When is the payment deadline for invoice FV/2025/12/001?"

## Expenses

- "Show all expenses from December"
- "What expenses did I have in category 'Software'?"
- "What's the total expenses this year?"
- "Add new expense: description 'Hosting', amount 100 PLN, date 2025-12-15"

## Company Information

- "What are my company details?"
- "What's my NIP?"
- "Show my company address"
- "What are my wFirma settings?"

## Tips:
- Use natural language - AI will understand your question
- You can combine questions: "Show December invoices and calculate VAT"
- You can ask for details: "Explain what this means", "Show more information"
- AI automatically detects your language (Polish, English, Russian)
- If you're not sure how to ask, just try - AI is very flexible!`,

    contentRu: `Вы можете задавать AI вопросы о ваших данных wFirma на естественном языке. Вот примеры:

## Счета-фактуры (Invoices)

**Отображение счетов:**
- "Покажи все счета за декабрь 2025"
- "Покажи счета выставленные в этом месяце"
- "Какие счета неоплачены?"
- "Покажи счет номер FV/2025/12/001"
- "Сколько счетов я выставил в этом году?"

**Фильтрация счетов:**
- "Покажи счета для контрагента ABC Sp. z o.o."
- "Покажи счета больше 10 000 PLN"
- "Какие счета просрочены?"
- "Покажи счета со статусом 'оплачен'"

**Анализ счетов:**
- "Какая общая сумма всех счетов за декабрь?"
- "Рассчитай НДС со счетов этого месяца"
- "Какой счет имеет наибольшую стоимость?"
- "Какова средняя стоимость счета?"

## Контрагенты (Contractors)

**Поиск контрагентов:**
- "Покажи всех контрагентов"
- "Найди контрагента с названием XYZ"
- "Покажи контрагента с NIP 1234567890"
- "Сколько контрагентов у меня в базе?"

**Информация о контрагенте:**
- "Покажи детали контрагента ABC"
- "Какие счета я выставил для контрагента XYZ?"
- "Какие контактные данные у контрагента ABC?"

**Операции с контрагентами:**
- "Добавь нового контрагента: название 'Test Sp. z o.o.', NIP 1234567890"
- "Обнови email контрагента ABC на new@email.com"

## Платежи (Payments)

**Статусы платежей:**
- "Какие счета ждут оплаты?"
- "Покажи оплаченные счета за последний месяц"
- "Какие платежи я получил на этой неделе?"

**Суммы и сроки:**
- "Сколько денег я жду в поступлениях?"
- "Какие счета просрочены?"
- "Когда срок оплаты счета FV/2025/12/001?"

## Расходы (Expenses)

- "Покажи все расходы за декабрь"
- "Какие расходы были в категории 'Программное обеспечение'?"
- "Какова общая сумма расходов в этом году?"
- "Добавь новый расход: описание 'Хостинг', сумма 100 PLN, дата 2025-12-15"

## Информация о компании (Company Info)

- "Какие данные моей компании?"
- "Какой у меня NIP?"
- "Покажи адрес моей компании"
- "Какие у меня настройки wFirma?"

## Советы:
- Используйте естественный язык - AI поймет ваш вопрос
- Можно комбинировать вопросы: "Покажи счета за декабрь и рассчитай НДС"
- Можно просить детали: "Объясни что это значит", "Покажи больше информации"
- AI автоматически определяет ваш язык (польский, английский, русский)
- Если не уверены как спросить, просто попробуйте - AI очень гибкий!`,

    searchKeywordsPl: ['pytania', 'przykłady', 'zapytania', 'komendy', 'faktury', 'kontrahenci', 'dane', 'wfirma'],
    searchKeywordsEn: ['questions', 'examples', 'queries', 'commands', 'invoices', 'contractors', 'data', 'wfirma'],
    searchKeywordsRu: ['вопросы', 'примеры', 'запросы', 'команды', 'счета', 'контрагенты', 'данные', 'wfirma'],
    order: 1,
    isFeatured: true,
  },
];

async function seedHelpTopics() {
  console.log('🌱 Seeding help topics...');

  for (const topic of helpTopics) {
    await prisma.helpTopic.upsert({
      where: { slug: topic.slug },
      update: topic,
      create: topic,
    });
    console.log(`✓ ${topic.slug}`);
  }

  console.log(`✅ Seeded ${helpTopics.length} help topics successfully`);
}

seedHelpTopics()
  .catch((error) => {
    console.error('❌ Error seeding help topics:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
