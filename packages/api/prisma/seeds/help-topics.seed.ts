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

  {
    slug: 'ai-chat-context-memory',
    category: 'aiChat',
    titlePl: 'Pamięć kontekstowa AI',
    titleEn: 'AI Context Memory',
    titleRu: 'Контекстная память AI',
    contentPl: `AI zapamiętuje Twoje preferencje i najczęściej używane dane pomiędzy sesjami czatu. Dzięki temu z czasem staje się coraz bardziej pomocny.

## Co AI zapamiętuje

**Fakty o firmie:**
- Informacje o Twojej firmie, formie opodatkowania, branży
- Automatycznie wyciągane z Twoich wiadomości (np. "Moja firma stosuje ryczałt")

**Częste kontakty:**
- Kontrahenci, których często wyszukujesz
- AI rozpoznaje wzorce: jeśli pytasz o tego samego kontrahenta 3+ razy, zapamięta go

**Twoje preferencje:**
- Preferowany format wyświetlania danych
- Stałe ustawienia (np. "zawsze pokazuj faktury w tabeli")
- Wyciągane z fraz typu "wolę", "zawsze", "domyślnie"

**Wzorce pracy:**
- Często używane funkcje i narzędzia
- Typowe sekwencje działań

## Jak to działa

- AI automatycznie uczy się z każdej rozmowy — bez dodatkowych kosztów
- Zapamiętane informacje są wstrzykiwane do kontekstu następnych rozmów
- Nieużywane wspomnienia tracą na ważności po 30 dniach i są automatycznie ukrywane
- Przypięte wspomnienia nigdy nie wygasają

## Jak pisać, żeby AI zapamiętał

AI rozpoznaje specjalne frazy w Twoich wiadomościach i automatycznie tworzy wpisy w pamięci. Oto przykłady:

**Preferencje (użyj tych fraz):**
- "Zawsze pokazuj mi faktury w formie tabeli"
- "Preferuję podsumowania w formacie listy"
- "Domyślnie szukaj faktur za ostatni miesiąc"
- "Zwykle pracuję z fakturami sprzedażowymi"
- "Wolę widzieć kwoty netto"

**Fakty o firmie (użyj tych fraz):**
- "Moja firma stosuje ryczałt"
- "Nasza firma zajmuje się IT konsultingiem"
- "Używamy stawki VAT 23%"
- "Nasz NIP to 1234567890"

**Częste kontakty (automatycznie):**
- Wystarczy pytać o tego samego kontrahenta 3 lub więcej razy — AI sam go zapamięta

**Wzorce pracy (automatycznie):**
- AI śledzi, z jakich narzędzi korzystasz najczęściej i zapamiętuje Twoje typowe sekwencje działań

## Zarządzanie pamięcią

Kliknij ikonę mózgu 🧠 w pasku bocznym czatu, aby otworzyć panel pamięci:

- **Przeglądaj** wspomnienia pogrupowane według kategorii
- **Przypnij** ważne wpisy, aby nigdy nie wygasły
- **Ukryj** wpisy, które nie są istotne
- **Usuń** pojedyncze wpisy lub wyczyść całą kategorię
- Każdy wpis pokazuje poziom pewności (%) i źródło

## Prywatność

- Wspomnienia są przypisane wyłącznie do Twojego konta
- Możesz w każdej chwili usunąć wszystkie wspomnienia
- Dane są przechowywane w bezpiecznej bazie danych
- AI nie udostępnia Twoich danych innym użytkownikom`,

    contentEn: `AI remembers your preferences and frequently used data between chat sessions. This makes it progressively more helpful over time.

## What AI remembers

**Business facts:**
- Information about your company, tax form, industry
- Automatically extracted from your messages (e.g. "My company uses flat tax")

**Frequent contacts:**
- Contractors you search for frequently
- AI recognizes patterns: if you query the same contractor 3+ times, it remembers them

**Your preferences:**
- Preferred data display format
- Persistent settings (e.g. "always show invoices in table format")
- Extracted from phrases like "I prefer", "always", "by default"

**Workflow patterns:**
- Frequently used features and tools
- Typical action sequences

## How it works

- AI automatically learns from every conversation — at no extra cost
- Remembered information is injected into the context of future conversations
- Unused memories lose importance after 30 days and are automatically hidden
- Pinned memories never expire

## How to write so AI remembers

AI recognizes special phrases in your messages and automatically creates memory entries. Here are examples:

**Preferences (use these phrases):**
- "I always prefer invoices displayed as a table"
- "I prefer summaries in list format"
- "By default search invoices for the last month"
- "I typically work with sales invoices"
- "I normally want to see net amounts"

**Business facts (use these phrases):**
- "My company uses flat-rate taxation"
- "Our company specializes in IT consulting"
- "We use 23% VAT rate"
- "My NIP is 1234567890"
- "Our business is software development"

**Frequent contacts (automatic):**
- Simply query the same contractor 3 or more times — AI will remember them automatically

**Workflow patterns (automatic):**
- AI tracks which tools you use most often and remembers your typical action sequences

## Managing memory

Click the brain icon 🧠 in the chat sidebar to open the memory panel:

- **Browse** memories grouped by category
- **Pin** important entries so they never expire
- **Hide** entries that are not relevant
- **Delete** individual entries or clear an entire category
- Each entry shows confidence level (%) and source

## Privacy

- Memories are assigned exclusively to your account
- You can delete all memories at any time
- Data is stored in a secure database
- AI does not share your data with other users`,

    contentRu: `AI запоминает ваши предпочтения и часто используемые данные между сеансами чата. Благодаря этому он становится всё более полезным со временем.

## Что AI запоминает

**Факты о бизнесе:**
- Информацию о вашей компании, форме налогообложения, отрасли
- Автоматически извлекается из ваших сообщений (напр. "Моя компания использует рычалт")

**Частые контакты:**
- Контрагенты, которых вы часто ищете
- AI распознаёт паттерны: если вы запрашиваете одного контрагента 3+ раз, он его запомнит

**Ваши предпочтения:**
- Предпочтительный формат отображения данных
- Постоянные настройки (напр. "всегда показывай счета в таблице")
- Извлекаются из фраз типа "я предпочитаю", "всегда", "по умолчанию"

**Шаблоны работы:**
- Часто используемые функции и инструменты
- Типичные последовательности действий

## Как это работает

- AI автоматически учится из каждого разговора — без дополнительных затрат
- Запомненная информация встраивается в контекст следующих разговоров
- Неиспользуемые воспоминания теряют важность через 30 дней и автоматически скрываются
- Закреплённые воспоминания никогда не истекают

## Как писать, чтобы AI запомнил

AI распознаёт специальные фразы в ваших сообщениях и автоматически создаёт записи в памяти. Вот примеры:

**Предпочтения (используйте эти фразы):**
- "Я всегда предпочитаю таблицы для отображения счетов"
- "Я предпочитаю видеть данные в виде списка"
- "По умолчанию ищи счета за последний месяц"
- "Обычно я работаю с исходящими счетами"
- "Как правило мне нужны суммы нетто"

**Факты о бизнесе (используйте эти фразы):**
- "Моя компания использует рычалт"
- "Наша компания занимается IT консалтингом"
- "Мы используем ставку НДС 23%"
- "Наш НИП 1234567890"
- "Мой бизнес — разработка ПО"

**Частые контакты (автоматически):**
- Просто запрашивайте одного и того же контрагента 3 и более раз — AI запомнит его автоматически

**Шаблоны работы (автоматически):**
- AI отслеживает, какие инструменты вы используете чаще всего, и запоминает ваши типичные последовательности действий

## Управление памятью

Нажмите на иконку мозга 🧠 в боковой панели чата, чтобы открыть панель памяти:

- **Просматривайте** воспоминания, сгруппированные по категориям
- **Закрепите** важные записи, чтобы они никогда не истекали
- **Скройте** записи, которые не актуальны
- **Удалите** отдельные записи или очистите целую категорию
- Каждая запись показывает уровень уверенности (%) и источник

## Конфиденциальность

- Воспоминания привязаны исключительно к вашему аккаунту
- Вы можете удалить все воспоминания в любой момент
- Данные хранятся в защищённой базе данных
- AI не передаёт ваши данные другим пользователям`,

    searchKeywordsPl: ['pamięć', 'zapamiętywanie', 'preferencje', 'kontekst', 'historia', 'uczenie', 'personalizacja', 'memory'],
    searchKeywordsEn: ['memory', 'remember', 'preferences', 'context', 'history', 'learning', 'personalization'],
    searchKeywordsRu: ['память', 'запоминание', 'предпочтения', 'контекст', 'история', 'обучение', 'персонализация'],
    order: 2,
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

  // ========================================
  // Settings Category - Text-to-Speech
  // ========================================
  {
    slug: 'settings-text-to-speech',
    category: 'settings',
    titlePl: 'Odczytywanie głosowe odpowiedzi AI',
    titleEn: 'Text-to-Speech for AI Responses',
    titleRu: 'Голосовое воспроизведение ответов AI',
    contentPl: `Czat AI obsługuje funkcję odczytywania odpowiedzi głosem za pomocą technologii Web Speech API.

## Funkcje

**Ręczne odtwarzanie:**
- Kliknij ikonę głośnika 🔊 przy dowolnej odpowiedzi AI, aby ją odsłuchać
- Kliknij ponownie, aby zatrzymać odtwarzanie
- Odtwarzanie automatycznie zatrzymuje się po zakończeniu tekstu

**Automatyczne odczytywanie:**
- Włącz opcję "Automatyczne odczytywanie" w ustawieniach głosu
- Nowe odpowiedzi AI będą automatycznie odczytywane głosem
- Możesz zatrzymać odtwarzanie w dowolnym momencie

**Kontrola prędkości:**
- Dostosuj szybkość mówienia od 0.5x (powoli) do 2.0x (szybko)
- Domyślna prędkość to 1.0x (normalna)

## Jak włączyć

1. Kliknij ikonę głośnika w nagłówku czatu (obok ikony pomocy)
2. Włącz opcję "Odczytywanie głosowe"
3. Opcjonalnie włącz "Automatyczne odczytywanie nowych wiadomości"
4. Dostosuj prędkość mówienia według preferencji

## Obsługiwane języki

- 🇬🇧 Angielski (en-US)
- 🇵🇱 Polski (pl-PL)
- 🇷🇺 Rosyjski (ru-RU)

Język jest automatycznie dopasowywany do wybranego języka interfejsu.

## Wskazówki

- Ustawienia są zapisywane lokalnie w przeglądarce
- Funkcja wymaga przeglądarki obsługującej Web Speech API (Chrome, Edge, Safari, Firefox)
- Jeśli nie słyszysz dźwięku, sprawdź ustawienia głośności systemu
- Możesz kliknąć na inną wiadomość podczas odtwarzania - poprzednia zostanie zatrzymana automatycznie`,

    contentEn: `AI Chat supports voice readout of responses using Web Speech API technology.

## Features

**Manual playback:**
- Click the speaker icon 🔊 on any AI response to hear it read aloud
- Click again to stop playback
- Playback automatically stops when the text ends

**Auto-speak:**
- Enable "Auto-read new messages" in voice settings
- New AI responses will be automatically read aloud
- You can stop playback at any time

**Speed control:**
- Adjust speech rate from 0.5x (slow) to 2.0x (fast)
- Default speed is 1.0x (normal)

## How to enable

1. Click the speaker icon in the chat header (next to the help icon)
2. Toggle "Voice readout" on
3. Optionally enable "Auto-read new messages"
4. Adjust speech rate to your preference

## Supported languages

- 🇬🇧 English (en-US)
- 🇵🇱 Polish (pl-PL)
- 🇷🇺 Russian (ru-RU)

Language is automatically matched to your selected interface language.

## Tips

- Settings are saved locally in your browser
- Feature requires a browser that supports Web Speech API (Chrome, Edge, Safari, Firefox)
- If you don't hear audio, check your system volume settings
- You can click on another message during playback - the previous one will stop automatically`,

    contentRu: `AI чат поддерживает голосовое воспроизведение ответов с помощью технологии Web Speech API.

## Функции

**Ручное воспроизведение:**
- Нажмите на иконку динамика 🔊 у любого ответа AI, чтобы прослушать его
- Нажмите снова, чтобы остановить воспроизведение
- Воспроизведение автоматически останавливается по окончании текста

**Автоматическое воспроизведение:**
- Включите опцию "Автоматически читать новые сообщения" в настройках голоса
- Новые ответы AI будут автоматически озвучиваться
- Вы можете остановить воспроизведение в любой момент

**Контроль скорости:**
- Настройте скорость речи от 0.5x (медленно) до 2.0x (быстро)
- Скорость по умолчанию 1.0x (нормальная)

## Как включить

1. Нажмите на иконку динамика в заголовке чата (рядом с иконкой помощи)
2. Включите "Голосовое воспроизведение"
3. При желании включите "Автоматически читать новые сообщения"
4. Настройте скорость речи по вашему предпочтению

## Поддерживаемые языки

- 🇬🇧 Английский (en-US)
- 🇵🇱 Польский (pl-PL)
- 🇷🇺 Русский (ru-RU)

Язык автоматически соответствует выбранному языку интерфейса.

## Советы

- Настройки сохраняются локально в браузере
- Функция требует браузер с поддержкой Web Speech API (Chrome, Edge, Safari, Firefox)
- Если не слышите звук, проверьте настройки громкости системы
- Можете кликнуть на другое сообщение во время воспроизведения - предыдущее остановится автоматически`,

    searchKeywordsPl: ['głos', 'dźwięk', 'odczytywanie', 'mówienie', 'tts', 'text-to-speech', 'audio', 'synteza mowy'],
    searchKeywordsEn: ['voice', 'audio', 'speech', 'read aloud', 'tts', 'text-to-speech', 'speak', 'sound'],
    searchKeywordsRu: ['голос', 'звук', 'речь', 'озвучивание', 'tts', 'text-to-speech', 'аудио', 'синтез речи'],
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
