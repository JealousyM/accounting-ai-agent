/**
 * Help Topics Auto-Seed Service
 * Seeds help_topics table on API startup if empty.
 * Uses upsert so re-runs are safe (no duplicates).
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const helpTopics = [
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
    searchKeywordsPl: ['czat', 'pytania', 'jak używać', 'przykłady', 'rozmowa'],
    searchKeywordsEn: ['chat', 'questions', 'how to use', 'examples', 'conversation'],
    searchKeywordsRu: ['чат', 'вопросы', 'как использовать', 'примеры', 'разговор'],
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

Kliknij ikonę mózgu w pasku bocznym czatu, aby otworzyć panel pamięci:

- **Przeglądaj** wspomnienia pogrupowane według kategorii
- **Przypnij** ważne wpisy, aby nigdy nie wygasły
- **Ukryj** wpisy, które nie są istotne
- **Usuń** pojedyncze wpisy lub wyczyść całą kategorię
- Każdy wpis pokazuje poziom pewności (%) i źródło

## Prywatność

- Wspomnienia są przypisane wyłącznie do Twojego konta
- Możesz w każdej chwili usunąć wszystkie wspomnienia
- Dane są przechowywane w bezpiecznej bazie danych`,
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

Click the brain icon in the chat sidebar to open the memory panel:

- **Browse** memories grouped by category
- **Pin** important entries so they never expire
- **Hide** entries that are not relevant
- **Delete** individual entries or clear an entire category
- Each entry shows confidence level (%) and source

## Privacy

- Memories are assigned exclusively to your account
- You can delete all memories at any time
- Data is stored in a secure database`,
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

Нажмите на иконку мозга в боковой панели чата, чтобы открыть панель памяти:

- **Просматривайте** воспоминания, сгруппированные по категориям
- **Закрепите** важные записи, чтобы они никогда не истекали
- **Скройте** записи, которые не актуальны
- **Удалите** отдельные записи или очистите целую категорию
- Каждая запись показывает уровень уверенности (%) и источник

## Конфиденциальность

- Воспоминания привязаны исключительно к вашему аккаунту
- Вы можете удалить все воспоминания в любой момент
- Данные хранятся в защищённой базе данных`,
    searchKeywordsPl: ['pamięć', 'zapamiętywanie', 'preferencje', 'kontekst', 'historia', 'uczenie', 'personalizacja', 'memory'],
    searchKeywordsEn: ['memory', 'remember', 'preferences', 'context', 'history', 'learning', 'personalization'],
    searchKeywordsRu: ['память', 'запоминание', 'предпочтения', 'контекст', 'история', 'обучение', 'персонализация'],
    order: 2,
    isFeatured: true,
  },
  {
    slug: 'faq-wfirma-connection',
    category: 'faq',
    titlePl: 'Jak połączyć konto wFirma?',
    titleEn: 'How to connect wFirma account?',
    titleRu: 'Как подключить аккаунт wFirma?',
    contentPl: `Aby połączyć konto wFirma:

1. Kliknij **ikonę użytkownika** w prawym górnym rogu
2. W oknie profilu kliknij przycisk **API Keys**
3. W sekcji wFirma wpisz:
   - **Access Key** - klucz dostępu z wFirma
   - **Secret Key** - klucz tajny z wFirma
   - **Company ID** - ID Twojej firmy
4. Kliknij **Zapisz**

**Gdzie znaleźć klucze w wFirma:**
- Zaloguj się na wFirma.pl
- Przejdź do Ustawienia → API
- Wygeneruj nowe klucze dostępu

Po połączeniu AI będzie miał dostęp do:
- Faktur sprzedaży i zakupu
- Kontrahentów
- Płatności i należności
- Dokumentów księgowych`,
    contentEn: `To connect your wFirma account:

1. Click the **user icon** in the top right corner
2. In the profile window, click **API Keys** button
3. In the wFirma section enter:
   - **Access Key** - access key from wFirma
   - **Secret Key** - secret key from wFirma
   - **Company ID** - your company ID
4. Click **Save**

**Where to find keys in wFirma:**
- Log in to wFirma.pl
- Go to Settings → API
- Generate new access keys

After connecting, AI will have access to:
- Sales and purchase invoices
- Contractors
- Payments and receivables
- Accounting documents`,
    contentRu: `Чтобы подключить аккаунт wFirma:

1. Нажмите на **иконку пользователя** в правом верхнем углу
2. В окне профиля нажмите кнопку **API Keys**
3. В секции wFirma введите:
   - **Access Key** - ключ доступа из wFirma
   - **Secret Key** - секретный ключ из wFirma
   - **Company ID** - ID вашей компании
4. Нажмите **Сохранить**

**Где найти ключи в wFirma:**
- Войдите на wFirma.pl
- Перейдите в Настройки → API
- Сгенерируйте новые ключи доступа

После подключения AI получит доступ к:
- Счетам продаж и покупок
- Контрагентам
- Платежам и задолженностям
- Бухгалтерским документам`,
    searchKeywordsPl: ['wfirma', 'połączenie', 'integracja', 'konfiguracja', 'api'],
    searchKeywordsEn: ['wfirma', 'connection', 'integration', 'setup', 'api'],
    searchKeywordsRu: ['wfirma', 'подключение', 'интеграция', 'настройка', 'api'],
    order: 1,
    isFeatured: true,
  },
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
  {
    slug: 'invoices-overview',
    category: 'invoices',
    titlePl: 'Zarządzanie fakturami',
    titleEn: 'Invoice Management',
    titleRu: 'Управление счетами',
    contentPl: `System pozwala na pełne zarządzanie fakturami poprzez integrację z wFirma.

## Typy faktur

- **Faktury sprzedaży** - wystawiane dla klientów
- **Faktury zakupu** - otrzymane od dostawców
- **Faktury korygujące** - korekty do wcześniejszych faktur
- **Faktury proforma** - dokumenty przedpłatowe

## Statusy faktur

- **Wystawiona** - faktura utworzona
- **Wysłana** - faktura wysłana do klienta
- **Opłacona** - płatność otrzymana
- **Przeterminowana** - po terminie płatności
- **Anulowana** - faktura unieważniona

## Co możesz zrobić z AI:

- "Pokaż wszystkie faktury z tego miesiąca"
- "Ile mam nieopłaconych faktur?"
- "Pokaż faktury dla kontrahenta ABC"
- "Jaka jest suma faktur z grudnia?"
- "Które faktury są przeterminowane?"`,
    contentEn: `The system allows full invoice management through wFirma integration.

## Invoice Types

- **Sales invoices** - issued to customers
- **Purchase invoices** - received from suppliers
- **Corrective invoices** - corrections to previous invoices
- **Proforma invoices** - prepayment documents

## Invoice Statuses

- **Issued** - invoice created
- **Sent** - invoice sent to customer
- **Paid** - payment received
- **Overdue** - past payment deadline
- **Cancelled** - invoice voided

## What you can do with AI:

- "Show all invoices from this month"
- "How many unpaid invoices do I have?"
- "Show invoices for contractor ABC"
- "What's the total of invoices from December?"
- "Which invoices are overdue?"`,
    contentRu: `Система позволяет полностью управлять счетами через интеграцию с wFirma.

## Типы счетов

- **Счета продаж** - выставляемые клиентам
- **Счета покупок** - полученные от поставщиков
- **Корректировочные счета** - исправления к предыдущим счетам
- **Проформа-счета** - документы предоплаты

## Статусы счетов

- **Выставлен** - счет создан
- **Отправлен** - счет отправлен клиенту
- **Оплачен** - платеж получен
- **Просрочен** - после срока оплаты
- **Аннулирован** - счет отменен

## Что можно сделать с AI:

- "Покажи все счета за этот месяц"
- "Сколько у меня неоплаченных счетов?"
- "Покажи счета для контрагента ABC"
- "Какая сумма счетов за декабрь?"
- "Какие счета просрочены?"`,
    searchKeywordsPl: ['faktury', 'sprzedaż', 'zakup', 'płatności', 'vat', 'fv'],
    searchKeywordsEn: ['invoices', 'sales', 'purchase', 'payments', 'vat', 'billing'],
    searchKeywordsRu: ['счета', 'продажи', 'покупки', 'платежи', 'ндс', 'фактуры'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'contractors-overview',
    category: 'contractors',
    titlePl: 'Zarządzanie kontrahentami',
    titleEn: 'Contractor Management',
    titleRu: 'Управление контрагентами',
    contentPl: `Kontrahenci to firmy i osoby, z którymi prowadzisz współpracę biznesową.

## Dane kontrahenta

- **Nazwa firmy** - pełna nazwa lub imię i nazwisko
- **NIP** - numer identyfikacji podatkowej
- **Adres** - adres siedziby lub zamieszkania
- **Email/Telefon** - dane kontaktowe
- **Numer konta** - do przelewów

## Typy kontrahentów

- **Klienci** - odbiorcy Twoich usług/produktów
- **Dostawcy** - firmy od których kupujesz
- **Partnerzy** - współpracownicy biznesowi

## Co możesz zrobić z AI:

- "Pokaż wszystkich kontrahentów"
- "Znajdź kontrahenta z NIP 1234567890"
- "Jakie faktury wystawiłem dla firmy XYZ?"
- "Dodaj nowego kontrahenta: nazwa ABC, NIP 9876543210"
- "Pokaż dane kontaktowe kontrahenta ABC"
- "Ile mam kontrahentów w bazie?"`,
    contentEn: `Contractors are companies and individuals you do business with.

## Contractor Data

- **Company name** - full name or personal name
- **NIP** - tax identification number
- **Address** - registered or residential address
- **Email/Phone** - contact details
- **Bank account** - for transfers

## Contractor Types

- **Customers** - recipients of your services/products
- **Suppliers** - companies you buy from
- **Partners** - business collaborators

## What you can do with AI:

- "Show all contractors"
- "Find contractor with NIP 1234567890"
- "What invoices did I issue for company XYZ?"
- "Add new contractor: name ABC, NIP 9876543210"
- "Show contact details for contractor ABC"
- "How many contractors do I have?"`,
    contentRu: `Контрагенты - это компании и лица, с которыми вы ведете бизнес.

## Данные контрагента

- **Название компании** - полное название или ФИО
- **NIP** - налоговый идентификационный номер
- **Адрес** - юридический или фактический адрес
- **Email/Телефон** - контактные данные
- **Номер счета** - для переводов

## Типы контрагентов

- **Клиенты** - получатели ваших услуг/товаров
- **Поставщики** - компании, у которых покупаете
- **Партнеры** - деловые партнеры

## Что можно сделать с AI:

- "Покажи всех контрагентов"
- "Найди контрагента с NIP 1234567890"
- "Какие счета я выставил для компании XYZ?"
- "Добавь нового контрагента: название ABC, NIP 9876543210"
- "Покажи контактные данные контрагента ABC"
- "Сколько у меня контрагентов?"`,
    searchKeywordsPl: ['kontrahenci', 'klienci', 'dostawcy', 'nip', 'firma', 'dane'],
    searchKeywordsEn: ['contractors', 'customers', 'suppliers', 'nip', 'company', 'data'],
    searchKeywordsRu: ['контрагенты', 'клиенты', 'поставщики', 'нип', 'компания', 'данные'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'taxes-overview',
    category: 'taxes',
    titlePl: 'Podatki w Polsce',
    titleEn: 'Taxes in Poland',
    titleRu: 'Налоги в Польше',
    contentPl: `Przegląd głównych podatków dla firm IT w Polsce.

## VAT (Podatek od towarów i usług)

- **Stawka podstawowa**: 23%
- **Stawka obniżona**: 8%, 5%, 0%
- **Terminy**: Rozliczenie miesięczne do 25. dnia następnego miesiąca
- **JPK_VAT**: Obowiązkowy plik kontrolny

## PIT (Podatek dochodowy od osób fizycznych)

- **Skala podatkowa**: 12% do 120 000 PLN, 32% powyżej
- **Podatek liniowy**: 19% (dla działalności gospodarczej)
- **Ryczałt**: 12% dla usług IT
- **Zaliczki**: Miesięczne lub kwartalne

## CIT (Podatek dochodowy od osób prawnych)

- **Stawka podstawowa**: 19%
- **Stawka preferencyjna**: 9% (dla małych podatników)

## ZUS (Składki społeczne)

- **Preferencyjny ZUS**: Pierwsze 24 miesiące działalności
- **Mały ZUS Plus**: Dla przychodów do 120 000 PLN/rok
- **Pełny ZUS**: Około 1600 PLN/miesiąc (2025)

## Co możesz zapytać AI:

- "Ile wynosi VAT od kwoty 1000 PLN?"
- "Jakie są terminy płatności ZUS?"
- "Oblicz podatek liniowy od 50 000 PLN"
- "Kiedy muszę złożyć JPK_VAT?"`,
    contentEn: `Overview of main taxes for IT companies in Poland.

## VAT (Value Added Tax)

- **Standard rate**: 23%
- **Reduced rates**: 8%, 5%, 0%
- **Deadlines**: Monthly settlement by 25th of next month
- **JPK_VAT**: Mandatory control file

## PIT (Personal Income Tax)

- **Tax scale**: 12% up to 120,000 PLN, 32% above
- **Flat tax**: 19% (for business activity)
- **Lump sum**: 12% for IT services
- **Advances**: Monthly or quarterly

## CIT (Corporate Income Tax)

- **Standard rate**: 19%
- **Preferential rate**: 9% (for small taxpayers)

## ZUS (Social Security)

- **Preferential ZUS**: First 24 months of business
- **Small ZUS Plus**: For income up to 120,000 PLN/year
- **Full ZUS**: About 1,600 PLN/month (2025)

## What you can ask AI:

- "How much is VAT on 1000 PLN?"
- "What are ZUS payment deadlines?"
- "Calculate flat tax on 50,000 PLN"
- "When do I need to submit JPK_VAT?"`,
    contentRu: `Обзор основных налогов для IT-компаний в Польше.

## VAT (НДС)

- **Базовая ставка**: 23%
- **Пониженные ставки**: 8%, 5%, 0%
- **Сроки**: Ежемесячный расчет до 25-го числа следующего месяца
- **JPK_VAT**: Обязательный контрольный файл

## PIT (Подоходный налог)

- **Налоговая шкала**: 12% до 120 000 PLN, 32% выше
- **Линейный налог**: 19% (для бизнеса)
- **Рычалт**: 12% для IT-услуг
- **Авансы**: Ежемесячно или ежеквартально

## CIT (Налог на прибыль)

- **Базовая ставка**: 19%
- **Льготная ставка**: 9% (для малых налогоплательщиков)

## ZUS (Социальное страхование)

- **Льготный ZUS**: Первые 24 месяца бизнеса
- **Малый ZUS Plus**: Для дохода до 120 000 PLN/год
- **Полный ZUS**: Около 1600 PLN/месяц (2025)

## Что можно спросить у AI:

- "Сколько НДС от 1000 PLN?"
- "Какие сроки оплаты ZUS?"
- "Рассчитай линейный налог от 50 000 PLN"
- "Когда нужно подать JPK_VAT?"`,
    searchKeywordsPl: ['podatki', 'vat', 'pit', 'cit', 'zus', 'jpk', 'stawki', 'terminy'],
    searchKeywordsEn: ['taxes', 'vat', 'pit', 'cit', 'zus', 'jpk', 'rates', 'deadlines'],
    searchKeywordsRu: ['налоги', 'ндс', 'пит', 'цит', 'зус', 'жпк', 'ставки', 'сроки'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'settings-overview',
    category: 'settings',
    titlePl: 'Ustawienia konta',
    titleEn: 'Account Settings',
    titleRu: 'Настройки аккаунта',
    contentPl: `Zarządzaj swoim kontem i integracjami.

## Profil użytkownika

Kliknij **ikonę użytkownika** w prawym górnym rogu, aby:

- Edytować imię i nazwisko
- Zmienić język interfejsu (polski, angielski, rosyjski)
- Wylogować się

## Konfiguracja wFirma

Aby połączyć konto wFirma:

1. Kliknij **ikonę użytkownika** w prawym górnym rogu
2. W oknie profilu kliknij przycisk **API Keys** / **Klucze API**
3. W sekcji wFirma wprowadź:
   - **Access Key** - klucz dostępu
   - **Secret Key** - klucz tajny
   - **Company ID** - ID firmy
4. Kliknij **Zapisz**

**Gdzie znaleźć klucze wFirma:**
- Zaloguj się na wFirma.pl
- Przejdź do Ustawienia → API
- Wygeneruj nowe klucze dostępu

## Konfiguracja AI (opcjonalne)

Możesz użyć własnego klucza API dla AI:

1. W oknie **API Keys** wybierz sekcję LLM
2. Wybierz dostawcę: **OpenAI**
3. Wprowadź swój klucz API
4. Kliknij **Zapisz**`,
    contentEn: `Manage your account and integrations.

## User Profile

Click the **user icon** in the top right corner to:

- Edit your name
- Change interface language (Polish, English, Russian)
- Log out

## wFirma Configuration

To connect your wFirma account:

1. Click the **user icon** in the top right corner
2. In the profile window, click **API Keys** button
3. In the wFirma section enter:
   - **Access Key** - access key
   - **Secret Key** - secret key
   - **Company ID** - company ID
4. Click **Save**

**Where to find wFirma keys:**
- Log in to wFirma.pl
- Go to Settings → API
- Generate new access keys

## AI Configuration (optional)

You can use your own AI API key:

1. In the **API Keys** window, select LLM section
2. Choose provider: **OpenAI**
3. Enter your API key
4. Click **Save**`,
    contentRu: `Управляйте аккаунтом и интеграциями.

## Профиль пользователя

Нажмите на **иконку пользователя** в правом верхнем углу, чтобы:

- Редактировать имя
- Сменить язык интерфейса (польский, английский, русский)
- Выйти из системы

## Настройка wFirma

Чтобы подключить аккаунт wFirma:

1. Нажмите на **иконку пользователя** в правом верхнем углу
2. В окне профиля нажмите кнопку **API Keys** / **API ключи**
3. В секции wFirma введите:
   - **Access Key** - ключ доступа
   - **Secret Key** - секретный ключ
   - **Company ID** - ID компании
4. Нажмите **Сохранить**

**Где найти ключи wFirma:**
- Войдите на wFirma.pl
- Перейдите в Настройки → API
- Сгенерируйте новые ключи доступа

## Настройка AI (опционально)

Вы можете использовать собственный API ключ для AI:

1. В окне **API Keys** выберите секцию LLM
2. Выберите провайдера: **OpenAI**
3. Введите ваш API ключ
4. Нажмите **Сохранить**`,
    searchKeywordsPl: ['ustawienia', 'profil', 'konto', 'integracja', 'wfirma', 'hasło', 'bezpieczeństwo'],
    searchKeywordsEn: ['settings', 'profile', 'account', 'integration', 'wfirma', 'password', 'security'],
    searchKeywordsRu: ['настройки', 'профиль', 'аккаунт', 'интеграция', 'wfirma', 'пароль', 'безопасность'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'ai-chat-text-to-speech',
    category: 'aiChat',
    titlePl: 'Odczyt głosowy (Text-to-Speech)',
    titleEn: 'Voice Readout (Text-to-Speech)',
    titleRu: 'Голосовое воспроизведение (Text-to-Speech)',
    contentPl: `Funkcja odczytu głosowego pozwala słuchać odpowiedzi AI zamiast je czytać.

## Jak włączyć

1. Kliknij **ikonę głośnika** w pasku narzędzi czatu
2. W ustawieniach włącz **"Odczyt głosowy"**

## Opcje

- **Automatyczne czytanie** - nowe odpowiedzi AI są automatycznie czytane na głos
- **Szybkość** - regulacja prędkości odczytu (wolno/normalnie/szybko)

## Głos AI (OpenAI TTS)

Jeśli masz skonfigurowany klucz OpenAI, możesz włączyć **"Użyj głosu AI"** dla wyższej jakości:

- **Nova** - kobiecy, naturalny głos
- **Alloy** - neutralny głos
- **Echo** - męski głos
- **Fable** - brytyjski akcent
- **Onyx** - niski głos
- **Shimmer** - delikatny głos

Głos AI wymaga klucza OpenAI w ustawieniach lub planu Pro.

## Wskazówki

- Kliknij **ikonę głośnika** przy wiadomości, aby ją przeczytać
- Kliknij ponownie, aby zatrzymać odczyt
- Ikona pulsuje podczas odczytu`,
    contentEn: `Voice readout feature allows you to listen to AI responses instead of reading them.

## How to enable

1. Click the **speaker icon** in the chat toolbar
2. In settings, enable **"Voice readout"**

## Options

- **Auto-read new messages** - new AI responses are automatically read aloud
- **Speed** - adjust reading speed (slow/normal/fast)

## AI Voice (OpenAI TTS)

If you have an OpenAI key configured, you can enable **"Use AI voice"** for higher quality:

- **Nova** - female, natural voice
- **Alloy** - neutral voice
- **Echo** - male voice
- **Fable** - British accent
- **Onyx** - deep voice
- **Shimmer** - soft voice

AI voice requires OpenAI key in settings or Pro plan.

## Tips

- Click the **speaker icon** next to a message to read it
- Click again to stop reading
- Icon pulses during playback`,
    contentRu: `Функция голосового воспроизведения позволяет слушать ответы AI вместо чтения.

## Как включить

1. Нажмите **иконку динамика** в панели инструментов чата
2. В настройках включите **"Голосовое воспроизведение"**

## Опции

- **Автоматическое чтение** - новые ответы AI автоматически читаются вслух
- **Скорость** - регулировка скорости чтения (медленно/нормально/быстро)

## Голос AI (OpenAI TTS)

Если у вас настроен ключ OpenAI, можете включить **"Использовать голос AI"** для более высокого качества:

- **Nova** - женский, естественный голос
- **Alloy** - нейтральный голос
- **Echo** - мужской голос
- **Fable** - британский акцент
- **Onyx** - низкий голос
- **Shimmer** - мягкий голос

Голос AI требует ключ OpenAI в настройках или план Pro.

## Советы

- Нажмите **иконку динамика** рядом с сообщением, чтобы его прочитать
- Нажмите снова, чтобы остановить чтение
- Иконка пульсирует во время воспроизведения`,
    searchKeywordsPl: ['głos', 'czytanie', 'tts', 'mowa', 'audio', 'dźwięk', 'słuchaj', 'nova', 'openai'],
    searchKeywordsEn: ['voice', 'speech', 'tts', 'audio', 'sound', 'listen', 'readout', 'nova', 'openai'],
    searchKeywordsRu: ['голос', 'речь', 'ттс', 'аудио', 'звук', 'слушать', 'озвучка', 'nova', 'openai'],
    order: 2,
    isFeatured: false,
  },
  {
    slug: 'dashboard-overview',
    category: 'dashboard',
    titlePl: 'Panel KPI - przegląd wskaźników',
    titleEn: 'KPI Dashboard Overview',
    titleRu: 'Обзор KPI-панели',
    contentPl: `Panel KPI wyświetla najważniejsze wskaźniki finansowe i operacyjne Twojej firmy w jednym miejscu.

## Co pokazuje panel?

### Podsumowanie finansowe
- **Przychody, koszty i zysk** za bieżący rok
- **Zapłacony VAT, PIT i ZUS**
- **Wykres miesięczny** przychodów i kosztów

### Faktury
- Liczba i wartość faktur **nieopłaconych**
- Liczba i wartość faktur **przeterminowanych**

### Terminy podatkowe i ZUS
- Najbliższe terminy płatności z kodowaniem kolorami:
  - Czerwony — po terminie
  - Pomarańczowy — do 3 dni
  - Żółty — do 7 dni
  - Zielony — powyżej 7 dni

### Pracownicy (HR)
- Liczba aktywnych pracowników
- Aktywne umowy według typu
- Łączny koszt pracodawcy za ostatni okres

### KSeF
- Faktury wysłane, zaakceptowane, odrzucone i oczekujące
- Wskaźnik akceptacji (%)

## Źródła danych

Panel agreguje dane z wFirma, modułu HR i KSeF. Sekcje bez skonfigurowanej integracji wyświetlają "Brak danych".

## Odświeżanie

Dane są automatycznie odświeżane co 10 minut. Możesz też odświeżyć ręcznie klikając ikonę odświeżania.`,
    contentEn: `The KPI Dashboard displays the most important financial and operational metrics for your company in one place.

## What does the dashboard show?

### Financial Summary
- **Revenue, expenses, and profit** for the current year
- **VAT, PIT, and ZUS paid**
- **Monthly chart** of revenue and expenses

### Invoices
- Count and total of **unpaid** invoices
- Count and total of **overdue** invoices

### Tax and ZUS Deadlines
- Upcoming payment deadlines with color coding:
  - Red — past due
  - Orange — within 3 days
  - Yellow — within 7 days
  - Green — more than 7 days away

### Employees (HR)
- Number of active employees
- Active contracts by type
- Total employer cost for the last payroll period

### KSeF
- Invoices sent, accepted, rejected, and pending
- Acceptance rate (%)

## Data Sources

The dashboard aggregates data from wFirma, the HR module, and KSeF. Sections without a configured integration show "No data".

## Refresh

Data is automatically refreshed every 10 minutes. You can also refresh manually by clicking the refresh icon.`,
    contentRu: `KPI-панель отображает наиболее важные финансовые и операционные показатели вашей компании в одном месте.

## Что показывает панель?

### Финансовая сводка
- **Доходы, расходы и прибыль** за текущий год
- **Уплаченные VAT, PIT и ZUS**
- **Помесячный график** доходов и расходов

### Счета
- Количество и сумма **неоплаченных** счетов
- Количество и сумма **просроченных** счетов

### Налоговые сроки и ZUS
- Ближайшие сроки платежей с цветовой кодировкой:
  - Красный — просрочено
  - Оранжевый — в течение 3 дней
  - Жёлтый — в течение 7 дней
  - Зелёный — более 7 дней

### Сотрудники (HR)
- Количество активных сотрудников
- Активные договоры по типу
- Общие затраты работодателя за последний период

### KSeF
- Счета отправленные, принятые, отклонённые и ожидающие
- Процент принятия (%)

## Источники данных

Панель агрегирует данные из wFirma, модуля HR и KSeF. Секции без настроенной интеграции отображают "Нет данных".

## Обновление

Данные автоматически обновляются каждые 10 минут. Можно также обновить вручную, нажав значок обновления.`,
    searchKeywordsPl: ['dashboard', 'panel', 'kpi', 'wskaźniki', 'podsumowanie', 'przychody', 'koszty'],
    searchKeywordsEn: ['dashboard', 'panel', 'kpi', 'metrics', 'summary', 'revenue', 'expenses'],
    searchKeywordsRu: ['дашборд', 'панель', 'кпи', 'показатели', 'сводка', 'доходы', 'расходы'],
    order: 1,
    isFeatured: true,
  },
  {
    slug: 'settings-organization',
    category: 'organization',
    titlePl: 'Organizacja',
    titleEn: 'Organization',
    titleRu: 'Организация',
    contentPl: `Organizacja pozwala grupować użytkowników jednej firmy, aby współdzielić konwersacje AI.

## Czym jest organizacja?

Organizacja to grupa użytkowników powiązanych z jedną firmą. Członkowie organizacji mogą udostępniać sobie konwersacje AI i wspólnie z nich korzystać.

## Tworzenie organizacji

1. Kliknij **Organizacja** w panelu bocznym
2. Wpisz nazwę firmy
3. Kliknij **Utwórz**

Jako twórca organizacji automatycznie stajesz się jej **administratorem**.

## Dołączanie do istniejącej organizacji

1. Kliknij **Organizacja** w panelu bocznym
2. Wpisz dokładnie taką samą nazwę firmy jak istniejąca organizacja
3. Twoja prośba o dołączenie zostanie wysłana do administratora
4. Po zatwierdzeniu przez administratora staniesz się członkiem organizacji

## Role w organizacji

- **Administrator** - może zatwierdzać/odrzucać prośby o dołączenie, awansować i degradować członków, usuwać członków, zmieniać nazwę organizacji
- **Członek** - może przeglądać i uczestniczyć w udostępnionych konwersacjach

## Zarządzanie członkami (administrator)

- **Zatwierdzanie** - akceptuj oczekujące prośby o dołączenie
- **Odrzucanie** - odrzucaj prośby o dołączenie
- **Awansowanie** - nadaj członkowi rolę administratora
- **Degradowanie** - zmień administratora na zwykłego członka
- **Usuwanie** - usuń członka z organizacji

## Opuszczenie organizacji

Możesz opuścić organizację w dowolnym momencie klikając przycisk **Opuść organizację** w ustawieniach organizacji.`,
    contentEn: `Organization allows grouping users of one company to share AI conversations.

## What is an organization?

An organization is a group of users associated with one company. Organization members can share AI conversations and collaborate on them.

## Creating an organization

1. Click **Organization** in the sidebar
2. Enter your company name
3. Click **Create**

As the organization creator, you automatically become its **admin**.

## Joining an existing organization

1. Click **Organization** in the sidebar
2. Enter the exact same company name as the existing organization
3. Your join request will be sent to the admin
4. Once approved by the admin, you will become a member of the organization

## Organization roles

- **Admin** - can approve/reject join requests, promote and demote members, remove members, rename the organization
- **Member** - can view and participate in shared conversations

## Managing members (admin)

- **Approve** - accept pending join requests
- **Reject** - decline join requests
- **Promote** - grant a member the admin role
- **Demote** - change an admin to a regular member
- **Remove** - remove a member from the organization

## Leaving an organization

You can leave an organization at any time by clicking the **Leave organization** button in organization settings.`,
    contentRu: `Организация позволяет группировать пользователей одной компании для совместного использования AI-разговоров.

## Что такое организация?

Организация - это группа пользователей, связанных с одной компанией. Участники организации могут делиться AI-разговорами и совместно в них участвовать.

## Создание организации

1. Нажмите **Организация** в боковой панели
2. Введите название компании
3. Нажмите **Создать**

Как создатель организации, вы автоматически становитесь её **администратором**.

## Присоединение к существующей организации

1. Нажмите **Организация** в боковой панели
2. Введите точно такое же название компании, как у существующей организации
3. Ваш запрос на вступление будет отправлен администратору
4. После одобрения администратором вы станете участником организации

## Роли в организации

- **Администратор** - может одобрять/отклонять запросы на вступление, повышать и понижать участников, удалять участников, переименовывать организацию
- **Участник** - может просматривать и участвовать в общих разговорах

## Управление участниками (администратор)

- **Одобрить** - принять ожидающие запросы на вступление
- **Отклонить** - отказать в запросе на вступление
- **Повысить** - назначить участнику роль администратора
- **Понизить** - изменить роль администратора на обычного участника
- **Удалить** - удалить участника из организации

## Выход из организации

Вы можете покинуть организацию в любое время, нажав кнопку **Покинуть организацию** в настройках организации.`,
    searchKeywordsPl: ['organizacja', 'firma', 'grupa', 'zespół', 'członkowie', 'administrator', 'dołącz'],
    searchKeywordsEn: ['organization', 'company', 'group', 'team', 'members', 'admin', 'join'],
    searchKeywordsRu: ['организация', 'компания', 'группа', 'команда', 'участники', 'администратор', 'вступить'],
    order: 2,
    isFeatured: false,
  },
  {
    slug: 'ai-chat-shared-conversations',
    category: 'aiChat',
    titlePl: 'Udostępnione konwersacje',
    titleEn: 'Shared Conversations',
    titleRu: 'Общие разговоры',
    contentPl: `Udostępnione konwersacje pozwalają członkom organizacji wspólnie korzystać z czatów AI.

## Czym są udostępnione konwersacje?

Udostępnione konwersacje to czaty AI widoczne dla wszystkich aktywnych członków Twojej organizacji. Każdy członek może je przeglądać i wysyłać w nich wiadomości.

## Jak udostępnić konwersację

1. Otwórz konwersację, którą chcesz udostępnić
2. Kliknij **ikonę udostępniania** w nagłówku czatu
3. Konwersacja zostanie oznaczona jako udostępniona

Tylko **właściciel konwersacji** może ją udostępnić lub cofnąć udostępnienie.

## Gdzie znajdę udostępnione konwersacje?

Udostępnione konwersacje pojawiają się w sekcji **"Udostępnione"** w panelu bocznym. Są oddzielone od Twoich prywatnych rozmów.

## Wspólna praca

- Wszyscy członkowie organizacji mogą **przeglądać** udostępnione konwersacje
- Każdy członek może **wysyłać wiadomości** w udostępnionych czatach
- Wiadomości wyświetlają **imię autora**, aby odróżnić kto co napisał
- Udostępnione czaty **automatycznie odświeżają się** co 5 sekund, aby pokazać nowe wiadomości

## Kto widzi udostępnione konwersacje?

Tylko **aktywni członkowie** organizacji widzą udostępnione konwersacje. Użytkownicy spoza organizacji nie mają do nich dostępu.`,
    contentEn: `Shared conversations allow organization members to collaborate on AI chats.

## What are shared conversations?

Shared conversations are AI chats visible to all active members of your organization. Every member can view them and send messages in them.

## How to share a conversation

1. Open the conversation you want to share
2. Click the **share icon** in the chat header
3. The conversation will be marked as shared

Only the **conversation owner** can share or unshare it.

## Where do I find shared conversations?

Shared conversations appear in the **"Shared"** section in the sidebar. They are separated from your private conversations.

## Collaboration

- All organization members can **view** shared conversations
- Every member can **send messages** in shared chats
- Messages display the **author's name** to distinguish who wrote what
- Shared chats **auto-refresh** every 5 seconds to show new messages

## Who can see shared conversations?

Only **active members** of the organization can see shared conversations. Users outside the organization have no access to them.`,
    contentRu: `Общие разговоры позволяют участникам организации совместно использовать AI-чаты.

## Что такое общие разговоры?

Общие разговоры - это AI-чаты, видимые всем активным участникам вашей организации. Каждый участник может их просматривать и отправлять в них сообщения.

## Как поделиться разговором

1. Откройте разговор, которым хотите поделиться
2. Нажмите **иконку общего доступа** в заголовке чата
3. Разговор будет отмечен как общий

Только **владелец разговора** может сделать его общим или отменить общий доступ.

## Где найти общие разговоры?

Общие разговоры отображаются в секции **"Общие"** в боковой панели. Они отделены от ваших личных разговоров.

## Совместная работа

- Все участники организации могут **просматривать** общие разговоры
- Каждый участник может **отправлять сообщения** в общих чатах
- Сообщения отображают **имя автора**, чтобы различать кто что написал
- Общие чаты **автоматически обновляются** каждые 5 секунд для отображения новых сообщений

## Кто видит общие разговоры?

Только **активные участники** организации видят общие разговоры. Пользователи вне организации не имеют к ним доступа.`,
    searchKeywordsPl: ['udostępnione', 'wspólne', 'organizacja', 'zespół', 'współpraca', 'czat'],
    searchKeywordsEn: ['shared', 'conversations', 'organization', 'team', 'collaboration', 'chat'],
    searchKeywordsRu: ['общие', 'разговоры', 'организация', 'команда', 'совместная', 'чат'],
    order: 3,
    isFeatured: false,
  },
  {
    slug: 'settings-telegram',
    category: 'telegram',
    titlePl: 'Bot Telegram',
    titleEn: 'Telegram Bot',
    titleRu: 'Telegram-бот',
    contentPl: `Bot Telegram pozwala rozmawiać z asystentem AI bezpośrednio w komunikatorze Telegram.

## Co robi bot?

Bot Telegram umożliwia korzystanie z asystenta AI z poziomu Telegrama. Wiadomości są synchronizowane z aplikacją webową - możesz kontynuować rozmowę w dowolnym miejscu.

## Łączenie konta

1. Znajdź bota **@eKsiegowyAIBot** w Telegramie i wyślij mu komendę **/link**
2. Bot wyśle Ci **6-cyfrowy kod**
3. Otwórz ustawienia w aplikacji webowej (ikona użytkownika w prawym górnym rogu)
4. W sekcji **Telegram** wpisz otrzymany kod
5. Kliknij **Połącz**

Twoje konto Telegram zostanie połączone z kontem w aplikacji.

## Dostępne komendy

- **/start** - rozpocznij interakcję z botem
- **/link** - wygeneruj kod do połączenia konta
- **/unlink** - odłącz konto Telegram
- **/new** - rozpocznij nową konwersację
- **/help** - wyświetl listę dostępnych komend

## Synchronizacja wiadomości

Wiadomości wysłane przez Telegram są zapisywane w Twoich konwersacjach w aplikacji webowej. Możesz kontynuować rozmowę w dowolnym miejscu - w przeglądarce lub w Telegramie.

## Odłączanie konta

Możesz odłączyć konto na dwa sposoby:

- Wyślij komendę **/unlink** w Telegramie
- Kliknij przycisk **Odłącz** w sekcji Telegram w ustawieniach aplikacji webowej`,
    contentEn: `Telegram Bot allows you to chat with the AI assistant directly in the Telegram messenger.

## What does the bot do?

The Telegram bot lets you use the AI assistant from Telegram. Messages are synced with the web app - you can continue your conversation from anywhere.

## Linking your account

1. Find the bot **@eKsiegowyAIBot** in Telegram and send the **/link** command
2. The bot will send you a **6-digit code**
3. Open settings in the web app (user icon in the top right corner)
4. In the **Telegram** section, enter the received code
5. Click **Link**

Your Telegram account will be linked to your app account.

## Available commands

- **/start** - start interacting with the bot
- **/link** - generate a code to link your account
- **/unlink** - unlink your Telegram account
- **/new** - start a new conversation
- **/help** - show the list of available commands

## Message synchronization

Messages sent via Telegram are saved in your conversations in the web app. You can continue the conversation from anywhere - in the browser or in Telegram.

## Unlinking your account

You can unlink your account in two ways:

- Send the **/unlink** command in Telegram
- Click the **Unlink** button in the Telegram section in web app settings`,
    contentRu: `Telegram-бот позволяет общаться с AI-ассистентом напрямую в мессенджере Telegram.

## Что делает бот?

Telegram-бот позволяет использовать AI-ассистента из Telegram. Сообщения синхронизируются с веб-приложением - вы можете продолжить разговор откуда угодно.

## Привязка аккаунта

1. Найдите бота **@eKsiegowyAIBot** в Telegram и отправьте команду **/link**
2. Бот пришлёт вам **6-значный код**
3. Откройте настройки в веб-приложении (иконка пользователя в правом верхнем углу)
4. В секции **Telegram** введите полученный код
5. Нажмите **Привязать**

Ваш аккаунт Telegram будет привязан к аккаунту в приложении.

## Доступные команды

- **/start** - начать взаимодействие с ботом
- **/link** - сгенерировать код для привязки аккаунта
- **/unlink** - отвязать аккаунт Telegram
- **/new** - начать новый разговор
- **/help** - показать список доступных команд

## Синхронизация сообщений

Сообщения, отправленные через Telegram, сохраняются в ваших разговорах в веб-приложении. Вы можете продолжить разговор откуда угодно - в браузере или в Telegram.

## Отвязка аккаунта

Отвязать аккаунт можно двумя способами:

- Отправьте команду **/unlink** в Telegram
- Нажмите кнопку **Отвязать** в секции Telegram в настройках веб-приложения`,
    searchKeywordsPl: ['telegram', 'bot', 'czat', 'komunikator', 'link', 'kod', 'połącz'],
    searchKeywordsEn: ['telegram', 'bot', 'chat', 'messenger', 'link', 'code', 'connect'],
    searchKeywordsRu: ['телеграм', 'бот', 'чат', 'мессенджер', 'привязка', 'код', 'подключить'],
    order: 3,
    isFeatured: false,
  },
  {
    slug: 'ai-chat-receipt-ocr-telegram',
    category: 'telegram',
    titlePl: 'Skanowanie paragonów w bocie Telegram',
    titleEn: 'Receipt scanning in the Telegram bot',
    titleRu: 'Сканирование чеков в Telegram-боте',
    contentPl: `Wyślij zdjęcie paragonu lub faktury do bota Telegram, a otrzymasz w odpowiedzi rozpoznane dane gotowe do wprowadzenia do księgowości.

## Jak używać

1. Połącz konto Telegram z aplikacją (zobacz "Bot Telegram")
2. Zrób zdjęcie paragonu / faktury telefonem
3. Wyślij zdjęcie do bota — bez tekstu
4. Po kilku sekundach bot odpowie tabelką z rozpoznanymi danymi

## Co bot rozpozna

- **Sprzedawca:** nazwa firmy
- **NIP sprzedawcy:** 10 cyfr (bez kresek)
- **Adres** sprzedawcy (jeśli widoczny)
- **Numer dokumentu**
- **Data wystawienia** (format YYYY-MM-DD)
- **Kwoty:** netto, VAT, brutto + waluta (domyślnie PLN)
- **Pozycje:** nazwa, ilość, stawka VAT, kwota — jeśli czytelne na zdjęciu
- **Typ dokumentu:** paragon / faktura VAT / rachunek
- **Pewność rozpoznania** w procentach

## Wskazówki dla najlepszej jakości zdjęcia

- Dobre oświetlenie, bez cieni i odblasków
- Cały dokument w kadrze, nie ucinaj brzegów
- Bez rozmycia — telefon nieruchomo, papier płasko
- Polskie znaki (ą, ć, ę, ł, ń, ó, ś, ź, ż) są obsługiwane

## Co dalej

Pod kartą znajdziesz przycisk **«✅ Dodaj jako wydatek»** — kliknięcie utworzy wydatek w wFirma na podstawie odczytanych danych. Kontrahent jest dopasowywany po NIP-ie (z auto-uzupełnieniem z rejestru GUS, jeśli to nowy sprzedawca). Zawsze możesz potem otworzyć wydatek w wFirma i poprawić kategorię, datę płatności lub podzielić na pozycje.

## Język odpowiedzi

Bot dopasowuje język karty do ustawień Twojego klienta Telegram (PL / EN / RU). Sama logika rozpoznania jest niezależna od języka.

## Technologia

Rozpoznanie wykorzystuje **GPT-4o Vision** (OpenAI) i działa na **Twoim kluczu OpenAI** z Ustawień → Poświadczenia API (ten sam klucz, którego używa czat AI). Jeśli korzystasz z innego dostawcy LLM, dodaj klucz OpenAI, aby włączyć rozpoznawanie. Koszt jednego zdjęcia jest minimalny.`,
    contentEn: `Send a photo of a receipt (paragon) or VAT invoice (faktura) to the Telegram bot and you'll get back the extracted data ready to enter into your accounting.

## How to use

1. Link your Telegram account to the app (see "Telegram Bot")
2. Take a photo of the receipt / invoice with your phone
3. Send the photo to the bot — no text needed
4. Within a few seconds the bot replies with a card containing the recognized data

## What the bot extracts

- **Seller:** company name
- **Seller NIP:** 10 digits, no dashes
- **Seller address** (when visible)
- **Document number**
- **Issue date** (YYYY-MM-DD format)
- **Amounts:** net, VAT, gross + currency (defaults to PLN)
- **Line items:** name, quantity, VAT rate, amount — when readable on the photo
- **Document type:** paragon / faktura VAT / rachunek
- **Recognition confidence** as a percentage

## Tips for the best photo quality

- Good lighting, no shadows or glare
- Whole document in frame, don't cut the edges
- No blur — hold phone steady, keep paper flat
- Polish letters (ą, ć, ę, ł, ń, ó, ś, ź, ż) are supported

## What's next

Below the card you'll see an **"✅ Add as expense"** button — tapping it creates an expense in wFirma from the recognized data. The seller is matched by NIP (with auto-fill from the Polish public registry when it's a new vendor). You can always open the expense in wFirma afterwards to adjust the category, payment date, or split it into line items.

## Reply language

The bot picks the card language from your Telegram client's settings (PL / EN / RU). The recognition logic itself is language-independent.

## Technology

Recognition uses **GPT-4o Vision** (OpenAI) and runs on **your OpenAI key** from Settings → API Credentials (the same key the AI chat uses). If you're on a different LLM provider, add an OpenAI key to enable recognition. The cost per photo is minimal.`,
    contentRu: `Отправь фотографию чека (paragon) или счёта-фактуры (faktura) в Telegram-бот — получишь распознанные данные, готовые к занесению в бухгалтерию.

## Как пользоваться

1. Привяжи аккаунт Telegram к приложению (см. "Telegram-бот")
2. Сфотографируй чек / счёт телефоном
3. Отправь фото боту — без текста
4. Через несколько секунд бот ответит карточкой с распознанными данными

## Что бот распознаёт

- **Продавец:** название компании
- **NIP продавца:** 10 цифр (без дефисов)
- **Адрес** продавца (если виден)
- **Номер документа**
- **Дата выставления** (формат YYYY-MM-DD)
- **Суммы:** нетто, НДС, брутто + валюта (по умолчанию PLN)
- **Позиции:** название, количество, ставка НДС, сумма — если читаемы
- **Тип документа:** paragon / faktura VAT / rachunek
- **Уверенность распознавания** в процентах

## Советы для лучшего качества фото

- Хорошее освещение, без теней и бликов
- Весь документ в кадре, не обрезай края
- Без размытия — держи телефон неподвижно, бумагу ровно
- Польские буквы (ą, ć, ę, ł, ń, ó, ś, ź, ż) поддерживаются

## Что дальше

Под карточкой появится кнопка **«✅ Добавить в расходы»** — по нажатию расход сразу заносится в wFirma на основе распознанных данных. Контрагент подбирается по NIP (для нового продавца поля автоматически подтягиваются из реестра GUS). Открой расход в wFirma позже, если захочется поправить категорию, дату оплаты или разбить на позиции.

## Язык ответа

Бот подбирает язык карточки по настройкам твоего Telegram-клиента (PL / EN / RU). Сама логика распознавания от языка не зависит.

## Технология

Распознавание использует **GPT-4o Vision** (OpenAI) и работает на **твоём ключе OpenAI** из Настроек → API-ключи (тот же, что и AI-чат). Если у тебя другой LLM-провайдер, добавь ключ OpenAI, чтобы включить распознавание. Стоимость одного фото минимальна.`,
    searchKeywordsPl: ['ocr', 'paragon', 'skan', 'zdjęcie', 'faktura', 'telegram', 'rozpoznawanie', 'wydatek', 'foto'],
    searchKeywordsEn: ['ocr', 'paragon', 'receipt', 'photo', 'scan', 'invoice', 'telegram', 'recognition', 'expense'],
    searchKeywordsRu: ['ocr', 'чек', 'скан', 'фото', 'снимок', 'счёт', 'телеграм', 'распознавание', 'расход'],
    order: 4,
    isFeatured: true,
  },
  {
    slug: 'wfirma-biala-lista-vat',
    category: 'wfirma',
    titlePl: 'Biała Lista MF — weryfikacja rachunków VAT',
    titleEn: 'White List MF — VAT bank account verification',
    titleRu: 'Biała Lista МФ — проверка банковских счетов VAT',
    contentPl: `Asystent AI sprawdza rachunki bankowe kontrahentów na oficjalnej **Białej Liście podatników VAT** Ministerstwa Finansów. Jest to obowiązek prawny przy płatnościach od 15 000 PLN.

## Dlaczego to ważne

Polskie prawo (art. 117ba Ordynacji podatkowej + art. 19 Prawa przedsiębiorców) wymaga weryfikacji każdej pojedynczej płatności **≥ 15 000 PLN** na Białej Liście. Zapłata na nieujęty rachunek powoduje:

- ❌ Wyłączenie kosztu z **KUP** (kosztów uzyskania przychodu)
- ❌ Solidarną odpowiedzialność w **VAT** za podatek niezapłacony przez sprzedawcę

## Jak korzystać

### Sprawdzenie ręczne

> "Sprawdź rachunek PL12 1140 ... dla NIP 5260205428"

Asystent zwróci kartę z wynikiem:
- ✅ **ZGODNE** — rachunek jest na Białej Liście dla tego NIP
- ⚠️ **NIEZGODNE** — rachunek **NIE** jest na Białej Liście — nie wykonuj przelewu

W każdym przypadku karta zawiera **identyfikator zapytania MF** — to oficjalny dowód weryfikacji, który należy zachować.

### Automatyczna kontrola przy płatnościach

Gdy poprosisz asystenta o zarejestrowanie płatności **≥ 15 000 PLN**, AI **automatycznie** sprawdzi rachunek odbiorcy przed zapisaniem operacji. Nie musisz prosić — to zachowanie wbudowane w prompt systemowy.

## Format danych

- **NIP** — 10 cyfr, możesz wpisać z kreskami lub bez
- **Numer rachunku** — 26 cyfr w formacie NRB, z prefiksem PL i spacjami lub bez (asystent normalizuje sam)
- **Data sprawdzenia** — domyślnie dziś; możesz podać planowaną datę płatności

## Cache i wydajność

Wyniki są cache'owane na 24 godziny dla pary (NIP, rachunek, data). Powtórne sprawdzenie tego samego rachunku tego samego dnia jest darmowe.

## Awaria API MF

Jeśli API MF jest niedostępne, asystent zwróci zapisaną wcześniej odpowiedź (jeśli istnieje) lub jasno poinformuje o niemożności weryfikacji. Nie pomijaj tego ostrzeżenia przy dużych płatnościach.

## Ograniczenia

- Sprawdzenie dotyczy tylko **polskich** podmiotów VAT (NIP)
- Dla zagranicznych kontrahentów Biała Lista nie obowiązuje, ale uważaj na inne wymogi prawne (np. VIES dla UE)`,
    contentEn: `The AI assistant verifies contractor bank accounts against the official **White List of VAT taxpayers** (Biała Lista) maintained by the Polish Ministry of Finance. This is a legal requirement for payments of 15,000 PLN or more.

## Why it matters

Polish law (Art. 117ba of the Tax Ordinance + Art. 19 of the Entrepreneurs Law) requires verification of every single payment **≥ 15,000 PLN** on the White List. Paying to an unverified account causes:

- ❌ Disqualification of the cost as **KUP** (deductible expense)
- ❌ Joint **VAT** liability for tax unpaid by the seller

## How to use

### Manual check

> "Verify account PL12 1140 ... for NIP 5260205428"

The assistant returns a card with the result:
- ✅ **MATCH** — the account is on the White List for this NIP
- ⚠️ **NO MATCH** — the account is **NOT** on the White List — do not transfer

In either case, the card includes the **MF Request ID** — official proof of verification, keep it for your records.

### Automatic check on payments

When you ask the assistant to record a payment **≥ 15,000 PLN**, the AI **automatically** verifies the recipient's account before saving the operation. You don't have to ask — this behavior is baked into the system prompt.

## Input format

- **NIP** — 10 digits, with or without dashes
- **Account number** — 26 digits in NRB format, with or without PL prefix and spaces (the assistant normalizes them)
- **Check date** — defaults to today; you can pass the planned payment date

## Cache and performance

Results are cached for 24 hours per (NIP, account, date) triple. Repeating the same check on the same day is free.

## MF API outage

If the MF API is unavailable, the assistant returns a previously cached answer (if any) or clearly says verification couldn't be completed. Don't ignore that warning for large payments.

## Limitations

- The check applies only to **Polish** VAT entities (NIP)
- For foreign contractors the White List does not apply — watch out for other legal requirements (e.g. VIES for EU)`,
    contentRu: `AI-ассистент проверяет банковские счета контрагентов в официальном **Белом Списке плательщиков VAT** (Biała Lista) Министерства финансов Польши. Это юридическое требование для платежей от 15 000 PLN.

## Почему это важно

Польское законодательство (ст. 117ba Налогового кодекса + ст. 19 Закона о предпринимателях) требует проверки каждого разового платежа **≥ 15 000 PLN** в Белом Списке. Оплата на неподтверждённый счёт влечёт:

- ❌ Исключение расхода из **KUP** (вычитаемых расходов)
- ❌ Солидарную ответственность по **НДС** за налог, не уплаченный продавцом

## Как пользоваться

### Ручная проверка

> "Проверь счёт PL12 1140 ... для NIP 5260205428"

Ассистент вернёт карточку с результатом:
- ✅ **СОВПАДЕНИЕ** — счёт есть в Белом Списке для этого NIP
- ⚠️ **НЕТ СОВПАДЕНИЯ** — счёт **НЕТ** в Белом Списке — не переводи

В любом случае карточка содержит **ID запроса МФ** — официальное доказательство проверки, его нужно сохранить.

### Автоматическая проверка при платежах

Когда ты просишь ассистента зарегистрировать платёж **≥ 15 000 PLN**, AI **автоматически** проверит счёт получателя перед сохранением операции. Просить не нужно — это поведение встроено в системный промпт.

## Формат данных

- **NIP** — 10 цифр, с дефисами или без
- **Номер счёта** — 26 цифр в формате NRB, с префиксом PL и пробелами или без (ассистент нормализует сам)
- **Дата проверки** — по умолчанию сегодня; можно указать планируемую дату оплаты

## Кэш и производительность

Результаты кэшируются на 24 часа для тройки (NIP, счёт, дата). Повторная проверка того же счёта в тот же день — бесплатно.

## Отказ API МФ

Если API МФ недоступен, ассистент вернёт ранее закэшированный ответ (если он есть) или чётко сообщит о невозможности проверки. Не игнорируй это предупреждение при крупных платежах.

## Ограничения

- Проверка касается только **польских** субъектов VAT (NIP)
- Для иностранных контрагентов Biała Lista не применяется — смотри другие требования (например, VIES для ЕС)`,
    searchKeywordsPl: ['biała lista', 'wykaz', 'vat', 'rachunek', 'weryfikacja', 'kup', '15000', 'art 117ba', 'compliance', 'kontrahent'],
    searchKeywordsEn: ['white list', 'biala lista', 'vat', 'account', 'verify', 'kup', '15000', 'compliance', 'contractor', 'mf'],
    searchKeywordsRu: ['белый список', 'biala lista', 'ндс', 'счёт', 'проверка', 'kup', '15000', 'compliance', 'контрагент', 'мф'],
    order: 5,
    isFeatured: true,
  },
  {
    slug: 'contractors-nip-autofill',
    category: 'contractors',
    titlePl: 'Automatyczne uzupełnianie kontrahenta po NIP',
    titleEn: 'Automatic contractor autofill from NIP',
    titleRu: 'Автозаполнение контрагента по NIP',
    contentPl: `Wystarczy podać NIP — asystent sam pobierze nazwę, REGON i adres kontrahenta z polskich rejestrów publicznych. Nie musisz wpisywać wszystkiego ręcznie.

## Jak to działa

Powiedz asystentowi:

> "Utwórz kontrahenta o NIP 5260205428"

I gotowe. Asystent:

1. Sprawdzi NIP (suma kontrolna modulo 11)
2. Pobierze dane z **Białej Listy MF** + **API KRS** (dla spółek)
3. Uzupełni puste pola: **nazwa**, **REGON**, **ulica**, **miasto**, **kod pocztowy**
4. Utworzy kontrahenta w wFirmie
5. Pokaże kartę potwierdzenia z listą **automatycznie wypełnionych pól**

## Pola, które możesz nadpisać

Jeśli podasz nazwę razem z NIP, Twoja nazwa wygrywa — rejestrowa zostanie pominięta. To samo dla adresu i pozostałych pól.

> "Utwórz kontrahenta 'Acme dla mnie' o NIP 5260205428"

→ kontrahent z nazwą "Acme dla mnie", ale adres i REGON pobrane z rejestru.

## Źródła danych

| Źródło | Co zwraca |
|---|---|
| Biała Lista MF | nazwa, REGON, status VAT, weryfikowane rachunki, adres |
| KRS API | forma prawna, kapitał zakładowy, zarząd (tylko spółki) |

Dla **jednoosobowych działalności** (JDG, samozatrudnieni) KRS nie zwraca danych — używamy Białej Listy.

## Limity

- Działa tylko dla **polskich** NIP-ów (10 cyfr)
- NIP z błędną sumą kontrolną zostanie odrzucony
- Jeśli NIP nie istnieje w rejestrach — kontrahent nie zostanie utworzony, asystent poprosi o nazwę

## Cache

Dane z rejestrów są cache'owane na 24 godziny. Tworzenie wielu kontrahentów ze znanym Ci wcześniej NIP nie wymaga ponownego pobierania danych.`,
    contentEn: `Just provide a NIP — the assistant will pull the contractor's name, REGON, and address from Polish public registries. No need to type everything by hand.

## How it works

Tell the assistant:

> "Create a contractor with NIP 5260205428"

That's it. The assistant:

1. Validates the NIP (modulo 11 checksum)
2. Pulls data from the **MF White List** + **KRS API** (for companies)
3. Fills in the missing fields: **name**, **REGON**, **street**, **city**, **zip**
4. Creates the contractor in wFirma
5. Shows a confirmation card listing the **auto-filled fields**

## Fields you can override

If you pass a name alongside the NIP, your name wins — the registry name is ignored. Same for address and other fields.

> "Create contractor 'Acme for me' with NIP 5260205428"

→ contractor named "Acme for me", but address and REGON pulled from the registry.

## Data sources

| Source | What it returns |
|---|---|
| MF White List | name, REGON, VAT status, verified accounts, address |
| KRS API | legal form, share capital, board members (companies only) |

For **sole proprietors** (JDG, self-employed) KRS doesn't return data — we use the White List.

## Limits

- Works only for **Polish** NIPs (10 digits)
- NIPs with a wrong checksum are rejected
- If the NIP doesn't exist in the registries — the contractor is not created and the assistant asks for a name

## Cache

Registry data is cached for 24 hours. Creating multiple contractors with NIPs you've used before doesn't re-fetch the data.`,
    contentRu: `Достаточно указать NIP — ассистент сам подтянет название, REGON и адрес контрагента из польских публичных реестров. Вручную всё вбивать не нужно.

## Как это работает

Скажи ассистенту:

> "Создай контрагента с NIP 5260205428"

И готово. Ассистент:

1. Проверит NIP (контрольная сумма по модулю 11)
2. Подтянет данные из **Białej Listy МФ** + **API KRS** (для компаний)
3. Заполнит пустые поля: **название**, **REGON**, **улица**, **город**, **индекс**
4. Создаст контрагента в wFirma
5. Покажет карточку подтверждения со списком **автоматически заполненных полей**

## Поля, которые можно переопределить

Если ты передашь название вместе с NIP, твоё название победит — реестровое будет проигнорировано. То же для адреса и остальных полей.

> "Создай контрагента 'Acme для меня' с NIP 5260205428"

→ контрагент с названием "Acme для меня", но адрес и REGON подтянуты из реестра.

## Источники данных

| Источник | Что возвращает |
|---|---|
| Biała Lista МФ | название, REGON, статус VAT, проверенные счета, адрес |
| KRS API | правовая форма, уставной капитал, правление (только компании) |

Для **индивидуальных предпринимателей** (JDG, самозанятых) KRS не отдаёт данные — используем Białą Listę.

## Ограничения

- Работает только для **польских** NIP (10 цифр)
- NIP с неверной контрольной суммой отклоняется
- Если NIP отсутствует в реестрах — контрагент не создаётся, ассистент попросит название

## Кэш

Данные реестров кэшируются на 24 часа. Создание нескольких контрагентов с уже использованными NIP не требует повторных запросов.`,
    searchKeywordsPl: ['nip', 'kontrahent', 'autouzupełnianie', 'biała lista', 'rejestr', 'krs', 'regon', 'utwórz kontrahenta'],
    searchKeywordsEn: ['nip', 'contractor', 'autofill', 'white list', 'registry', 'krs', 'regon', 'create contractor'],
    searchKeywordsRu: ['nip', 'контрагент', 'автозаполнение', 'белый список', 'реестр', 'krs', 'regon', 'создать контрагента'],
    order: 4,
    isFeatured: true,
  },
];

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
